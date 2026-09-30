import { Component, ViewEncapsulation, computed, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { IconComponent } from '../../../shared/icon.component';
import { shortDate, timeAgo } from '../../../utils/text';
import { TicketService } from '../../services/ticket.service';
import { ConfidenceComponent, PriorityBadgeComponent, StatusBadgeComponent } from '../../shared/admin-ui.components';
import { AttentionKind, TicketStatus } from '../../models/ticket.model';

const KIND_LABEL: Record<AttentionKind, string> = {
  'escalated': 'Escalated', 'sla': 'SLA', 'low-confidence': 'Low confidence', 'repeated': 'Repeated', 'missing-info': 'Missing info',
};
const STATUS_CLASS: Record<TicketStatus, string> = {
  'Open': 'open', 'In Progress': 'progress', 'Resolved': 'resolved', 'Escalated': 'escalated', 'Needs Review': 'review',
};

@Component({
  selector: 'campus-admin-dashboard',
  imports: [RouterLink, IconComponent, StatusBadgeComponent, PriorityBadgeComponent, ConfidenceComponent],
  templateUrl: './admin-dashboard.component.html',
  styleUrl: './admin-dashboard.css',
  encapsulation: ViewEncapsulation.None,
})
export class AdminDashboardComponent {
  private router = inject(Router);
  protected svc = inject(TicketService);

  protected readonly kpiCards = computed(() => {
    const k = this.svc.kpis();
    const pct = (n: number) => (k.total ? Math.round((n / k.total) * 100) + '% of all tickets' : '—');
    return [
      { key: 'total', label: 'Total Tickets', value: k.total, sub: 'Last 7 days + backlog' },
      { key: 'open', label: 'Open', value: k.open, sub: pct(k.open) },
      { key: 'progress', label: 'In Progress', value: k.inProgress, sub: pct(k.inProgress) },
      { key: 'resolved', label: 'Resolved', value: k.resolved, sub: pct(k.resolved) },
      { key: 'escalated', label: 'Escalated', value: k.escalated, sub: 'Needs senior owner' },
      { key: 'review', label: 'Needs Review', value: k.needsReview, sub: 'Low AI confidence' },
      { key: 'sla', label: 'SLA At Risk', value: k.slaAtRisk, sub: 'Due in < 6 h or overdue' },
    ];
  });

  protected readonly chartMax = computed(() => Math.max(1, ...this.svc.activity7d().flatMap(d => [d.created, d.resolved])));
  protected readonly chartTotals = computed(() => ({
    created: this.svc.activity7d().reduce((n, d) => n + d.created, 0),
    resolved: this.svc.activity7d().reduce((n, d) => n + d.resolved, 0),
  }));
  protected readonly deptMax = computed(() => Math.max(1, ...this.svc.departmentBreakdown().map(d => d.total)));
  protected readonly topAttention = computed(() => this.svc.attention().slice(0, 6));
  protected readonly recent = computed(() => this.svc.recent().slice(0, 10));

  protected readonly kindLabel = (k: AttentionKind) => KIND_LABEL[k];
  protected readonly statusClass = (s: TicketStatus) => STATUS_CLASS[s];
  protected readonly ago = (iso: string) => timeAgo(iso);
  protected readonly full = (iso: string) => shortDate(iso);
  protected readonly skeleton = [1, 2, 3, 4, 5, 6, 7];

  protected open(id: string): void {
    this.router.navigate(['/admin/tickets', id]);
  }
}
