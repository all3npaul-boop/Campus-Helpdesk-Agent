import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { IconComponent } from '../../../shared/icon.component';
import { shortDate, timeAgo } from '../../../utils/text';
import {
  CATEGORIES, DEPARTMENTS, PRIORITIES, STATUSES, TicketCategory, TicketFilters, Department, TicketPriority, TicketStatus,
} from '../../models/ticket.model';
import { TicketService } from '../../services/ticket.service';
import { ConfidenceComponent, PriorityBadgeComponent, StatusBadgeComponent } from '../../shared/admin-ui.components';

@Component({
  selector: 'campus-admin-tickets',
  imports: [RouterLink, IconComponent, StatusBadgeComponent, PriorityBadgeComponent, ConfidenceComponent],
  templateUrl: './admin-tickets.component.html',
})
export class AdminTicketsComponent {
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  protected svc = inject(TicketService);

  protected readonly statuses = STATUSES;
  protected readonly priorities = PRIORITIES;
  protected readonly departments = DEPARTMENTS;
  protected readonly categories = CATEGORIES;
  protected readonly skeleton = Array.from({ length: 8 }, (_, i) => i);

  protected readonly filters = signal<TicketFilters>(this.initialFilters());
  protected readonly visible = computed(() => this.svc.filter(this.svc.recent(), this.filters()));
  protected readonly hasFilters = computed(() => Object.values(this.filters()).some(v => !!v));

  protected readonly ago = (iso: string) => timeAgo(iso);
  protected readonly full = (iso: string) => shortDate(iso);

  protected set<K extends keyof TicketFilters>(key: K, value: string): void {
    this.filters.update(f => ({ ...f, [key]: value as TicketFilters[K] }));
  }

  protected clear(): void {
    this.filters.set({ status: '', priority: '', department: '', category: '', search: '' });
  }

  protected open(id: string): void {
    this.router.navigate(['/admin/tickets', id]);
  }

  /** Allows deep links such as /admin/tickets?status=Escalated. Unknown values are ignored. */
  private initialFilters(): TicketFilters {
    const q = this.route.snapshot.queryParamMap;
    const pick = <T extends string>(key: string, allowed: readonly T[]): T | '' => {
      const v = q.get(key) as T | null;
      return v && allowed.includes(v) ? v : '';
    };
    return {
      status: pick<TicketStatus>('status', STATUSES),
      priority: pick<TicketPriority>('priority', PRIORITIES),
      department: pick<Department>('department', DEPARTMENTS),
      category: pick<TicketCategory>('category', CATEGORIES),
      search: q.get('q') ?? '',
    };
  }
}
