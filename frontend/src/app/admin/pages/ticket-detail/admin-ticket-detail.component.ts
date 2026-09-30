import { Component, ViewEncapsulation, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { map } from 'rxjs';
import { IconComponent } from '../../../shared/icon.component';
import { clockTime, friendlyTime } from '../../../utils/text';
import { ASSIGNEES, LOW_CONFIDENCE } from '../../models/ticket.model';
import { TicketService } from '../../services/ticket.service';
import { ConfidenceComponent, PriorityBadgeComponent, StatusBadgeComponent } from '../../shared/admin-ui.components';

type Panel = 'assign' | 'info' | 'escalate' | 'resolve' | null;

@Component({
  selector: 'campus-admin-ticket-detail',
  imports: [RouterLink, IconComponent, StatusBadgeComponent, PriorityBadgeComponent, ConfidenceComponent],
  templateUrl: './admin-ticket-detail.component.html',
  styleUrl: './admin-ticket-detail.css',
  encapsulation: ViewEncapsulation.None,
})
export class AdminTicketDetailComponent {
  private route = inject(ActivatedRoute);
  protected svc = inject(TicketService);

  protected readonly assignees = ASSIGNEES;
  protected readonly threshold = LOW_CONFIDENCE;
  protected readonly id = toSignal(this.route.paramMap.pipe(map(p => p.get('id'))), { initialValue: this.route.snapshot.paramMap.get('id') });
  protected readonly ticket = computed(() => this.svc.byId(this.id()));

  protected readonly panel = signal<Panel>(null);
  protected readonly assignee = signal('');
  protected readonly infoMessage = signal('');
  protected readonly escalateReason = signal('');
  protected readonly resolution = signal('');
  protected readonly flash = signal<string | null>(null);
  private flashTimer?: ReturnType<typeof setTimeout>;

  protected readonly when = (iso: string) => friendlyTime(iso);
  protected readonly clock = (iso: string) => clockTime(iso);
  protected readonly day = (iso: string) => friendlyTime(iso).split(' · ')[0];

  constructor() {
    // Every visit adds an "Admin opened ticket" entry once per session (later: written to the shared history).
    this.route.paramMap.pipe(map(p => p.get('id')), takeUntilDestroyed()).subscribe(id => {
      this.panel.set(null);
      if (id && this.svc.byId(id)) this.svc.markOpened(id);
    });
  }

  protected toggle(panel: Exclude<Panel, null>): void {
    if (this.panel() === panel) { this.panel.set(null); return; }
    const t = this.ticket();
    if (panel === 'assign' && t) this.assignee.set(t.assignedTo ?? ASSIGNEES.find(g => g.department === t.aiClassification.suggestedDepartment)?.teams[0] ?? '');
    this.panel.set(panel);
  }

  protected value(e: Event): string { return (e.target as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement).value; }

  protected assign(): void {
    const t = this.ticket();
    if (!t || !this.assignee()) return;
    this.svc.assign(t.id, this.assignee());
    this.done(`Assigned to ${this.assignee()}`);
  }

  protected markInProgress(): void {
    const t = this.ticket();
    if (!t) return;
    this.svc.markInProgress(t.id);
    this.done('Ticket marked In Progress');
  }

  protected requestInfo(): void {
    const t = this.ticket();
    const msg = this.infoMessage().trim();
    if (!t || !msg) return;
    this.svc.requestInformation(t.id, msg);
    this.infoMessage.set('');
    this.done('Information requested from the student');
  }

  protected escalate(): void {
    const t = this.ticket();
    if (!t) return;
    this.svc.escalate(t.id, this.escalateReason().trim() || 'Escalated by administrator for senior review');
    this.escalateReason.set('');
    this.done('Ticket escalated');
  }

  protected resolve(): void {
    const t = this.ticket();
    const msg = this.resolution().trim();
    if (!t || !msg) return;
    this.svc.resolve(t.id, msg);
    this.resolution.set('');
    this.done('Ticket resolved');
  }

  protected reopen(): void {
    const t = this.ticket();
    if (!t) return;
    this.svc.reopen(t.id);
    this.done('Ticket reopened');
  }

  private done(message: string): void {
    this.panel.set(null);
    this.flash.set(message);
    clearTimeout(this.flashTimer);
    this.flashTimer = setTimeout(() => this.flash.set(null), 3200);
  }
}
