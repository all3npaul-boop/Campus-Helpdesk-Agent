import { Injectable, computed, signal } from '@angular/core';
import { buildSeedTickets } from '../data/tickets.seed';
import {
  ASSIGNEES, AttentionItem, AttentionKind, DEPARTMENTS, LOW_CONFIDENCE, SLA_WARNING_HOURS, STATUSES,
  Ticket, TicketActivity, TicketFilters, TicketStatus,
} from '../models/ticket.model';

const HOUR = 3_600_000;
const DAY = 24 * HOUR;

/** Pre-computed attention priority: lower number = more urgent. */
const ATTENTION_ORDER: AttentionKind[] = ['escalated', 'sla', 'low-confidence', 'repeated', 'missing-info'];

/**
 * Single source of truth for tickets in the Admin Console.
 *
 * Every admin screen (dashboard, list, detail) reads from `tickets` and every admin action mutates it
 * through the methods below. Phase 2 will replace the seed with the shared ticket source (HTTP / store)
 * and keep this public API unchanged.
 */
@Injectable({ providedIn: 'root' })
export class TicketService {
  private readonly _tickets = signal<Ticket[]>(buildSeedTickets());
  private readonly _clock = signal(Date.now());
  private readonly openedThisSession = new Set<string>();

  readonly tickets = this._tickets.asReadonly();
  /** False while the (mock) source is "loading" — drives skeleton states. */
  readonly loaded = signal(false);

  constructor() {
    setTimeout(() => this.loaded.set(true), 450); // stands in for the future network request
  }

  // ---------- Queries ----------
  byId(id: string | null | undefined): Ticket | undefined {
    return id ? this._tickets().find(t => t.id === id) : undefined;
  }

  readonly kpis = computed(() => {
    const all = this._tickets();
    const count = (s: TicketStatus) => all.filter(t => t.status === s).length;
    return {
      total: all.length,
      open: count('Open'),
      inProgress: count('In Progress'),
      resolved: count('Resolved'),
      escalated: count('Escalated'),
      needsReview: count('Needs Review'),
      slaAtRisk: all.filter(t => this.isSlaAtRisk(t)).length,
    };
  });

  readonly statusDistribution = computed(() => {
    const all = this._tickets();
    return STATUSES.map(status => {
      const count = all.filter(t => t.status === status).length;
      return { status, count, percent: all.length ? Math.round((count / all.length) * 100) : 0 };
    });
  });

  readonly departmentBreakdown = computed(() =>
    DEPARTMENTS.map(department => {
      const items = this._tickets().filter(t => t.department === department);
      return { department, total: items.length, unresolved: items.filter(t => t.status !== 'Resolved').length };
    }),
  );

  /** Tickets created / resolved per local calendar day for the last 7 days (oldest first). */
  readonly activity7d = computed(() => {
    const today = new Date(this._clock());
    today.setHours(0, 0, 0, 0);
    return Array.from({ length: 7 }, (_, i) => {
      const start = today.getTime() - (6 - i) * DAY;
      const end = start + DAY;
      const within = (iso?: string) => !!iso && new Date(iso).getTime() >= start && new Date(iso).getTime() < end;
      return {
        label: new Intl.DateTimeFormat(undefined, { weekday: 'short' }).format(start),
        date: new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short' }).format(start),
        created: this._tickets().filter(t => within(t.createdAt)).length,
        resolved: this._tickets().filter(t => within(t.resolvedAt)).length,
      };
    });
  });

  /** Tickets that need an administrator, most urgent reason first. */
  readonly attention = computed<AttentionItem[]>(() => {
    const items: AttentionItem[] = [];
    for (const t of this._tickets()) {
      const kind = this.attentionKind(t);
      if (kind) items.push({ ticket: t, kind, ...this.describeAttention(t, kind) });
    }
    return items.sort((a, b) =>
      ATTENTION_ORDER.indexOf(a.kind) - ATTENTION_ORDER.indexOf(b.kind)
      || new Date(a.ticket.slaDueAt).getTime() - new Date(b.ticket.slaDueAt).getTime());
  });

  readonly recent = computed(() =>
    [...this._tickets()].sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt)));

  filter(list: Ticket[], f: TicketFilters): Ticket[] {
    const q = f.search.trim().toLowerCase();
    return list.filter(t =>
      (!f.status || t.status === f.status)
      && (!f.priority || t.priority === f.priority)
      && (!f.department || t.department === f.department)
      && (!f.category || t.category === f.category)
      && (!q || [t.id, t.student.name, t.student.regNo, t.title, t.description].some(v => v.toLowerCase().includes(q))));
  }

  isSlaAtRisk(t: Ticket): boolean {
    return t.status !== 'Resolved' && new Date(t.slaDueAt).getTime() - this._clock() <= SLA_WARNING_HOURS * HOUR;
  }

  isLowConfidence(t: Ticket): boolean {
    return t.status !== 'Resolved' && t.aiConfidence < LOW_CONFIDENCE;
  }

  /** Human-readable SLA state, e.g. "Overdue by 3 h" / "Due in 5 h". */
  slaLabel(t: Ticket): string {
    if (t.status === 'Resolved') return 'Met';
    const diffH = Math.round((new Date(t.slaDueAt).getTime() - this._clock()) / HOUR);
    if (diffH < 0) return `Overdue by ${Math.abs(diffH) >= 24 ? Math.round(Math.abs(diffH) / 24) + ' d' : Math.abs(diffH) + ' h'}`;
    return diffH >= 24 ? `Due in ${Math.round(diffH / 24)} d` : `Due in ${Math.max(diffH, 1)} h`;
  }

  // ---------- Admin actions (all local for now) ----------
  markOpened(id: string): void {
    if (this.openedThisSession.has(id)) return;
    this.openedThisSession.add(id);
    const t = this.byId(id);
    if (!t) return;
    this._tickets.update(list => list.map(x => x.id === id
      ? { ...x, activity: [...x.activity, this.entry('Admin opened ticket')] } : x));
  }

  assign(id: string, team: string): void {
    const department = ASSIGNEES.find(g => g.teams.includes(team))?.department;
    this.patch(id, t => ({
      assignedTo: team,
      department: department ?? t.department,
      // Assigning confirms the AI classification, so a review ticket becomes a normal open ticket.
      status: t.status === 'Needs Review' ? 'Open' : t.status,
    }), `Assigned to ${team}`);
  }

  markInProgress(id: string): void {
    this.patch(id, () => ({ status: 'In Progress', missingInfo: undefined }), 'Status changed to In Progress');
  }

  requestInformation(id: string, message: string): void {
    this.patch(id, t => ({
      missingInfo: message,
      status: t.status === 'Open' || t.status === 'Needs Review' ? 'In Progress' : t.status,
    }), `Information requested from student — ${message}`);
  }

  escalate(id: string, reason: string): void {
    this.patch(id, () => ({ status: 'Escalated', escalationReason: reason }), reason ? `Escalated — ${reason}` : 'Escalated to department head');
  }

  resolve(id: string, resolution: string): void {
    const at = new Date().toISOString();
    this.patch(id, () => ({ status: 'Resolved', resolution, resolvedAt: at, missingInfo: undefined }), `Resolved — ${resolution}`);
  }

  reopen(id: string): void {
    this.patch(id, () => ({ status: 'In Progress', resolution: undefined, resolvedAt: undefined }), 'Ticket reopened');
  }

  // ---------- Internals ----------
  private patch(id: string, change: (t: Ticket) => Partial<Ticket>, log: string): void {
    this._clock.set(Date.now());
    this._tickets.update(list => list.map(t => t.id !== id ? t : {
      ...t, ...change(t), updatedAt: new Date().toISOString(), activity: [...t.activity, this.entry(log)],
    }));
  }

  private entry(text: string): TicketActivity {
    return { at: new Date().toISOString(), actor: 'Admin', text };
  }

  private attentionKind(t: Ticket): AttentionKind | null {
    if (t.status === 'Resolved') return null;
    if (t.status === 'Escalated') return 'escalated';
    if (this.isSlaAtRisk(t)) return 'sla';
    if (this.isLowConfidence(t)) return 'low-confidence';
    if (t.repeatCount >= 2) return 'repeated';
    if (t.missingInfo) return 'missing-info';
    return null;
  }

  private describeAttention(t: Ticket, kind: AttentionKind): { reason: string; action: string } {
    switch (kind) {
      case 'escalated': return { reason: t.escalationReason ?? 'Escalated by an administrator', action: 'Assign a senior owner' };
      case 'sla': return { reason: `SLA ${this.slaLabel(t).toLowerCase()}`, action: 'Respond before the SLA is breached' };
      case 'low-confidence': return { reason: t.aiNote ?? 'Low classification confidence', action: 'Review required' };
      case 'repeated': return { reason: `Repeated unresolved issue (raised ${t.repeatCount}×)`, action: 'Check earlier responses and follow up' };
      case 'missing-info': return { reason: t.missingInfo ?? 'Information missing from the student', action: 'Follow up with the student' };
    }
  }
}
