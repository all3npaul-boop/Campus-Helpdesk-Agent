import { Component, ViewEncapsulation, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { IconComponent } from '../../shared/icon.component';
import { IconName } from '../../models/campus.models';
import { TicketService } from '../services/ticket.service';

interface NavItem { label: string; path: string; icon: IconName; live: boolean; }

/**
 * Admin Console frame: top bar + sidebar + routed page.
 * Uses ViewEncapsulation.None so the `a-*` classes in admin.css are shared by every admin page.
 */
@Component({
  selector: 'campus-admin-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, IconComponent],
  templateUrl: './admin-shell.component.html',
  styleUrl: './admin.css',
  encapsulation: ViewEncapsulation.None,
})
export class AdminShellComponent {
  private router = inject(Router);
  protected tickets = inject(TicketService);

  protected readonly navOpen = signal(false);
  protected readonly admin = { name: 'Helpdesk Admin', role: 'Operations', initials: 'HA' };
  protected readonly nav: NavItem[] = [
    { label: 'Dashboard', path: '/admin/dashboard', icon: 'layout-dashboard', live: true },
    { label: 'Tickets', path: '/admin/tickets', icon: 'ticket', live: true },
    { label: 'Departments', path: '/admin/departments', icon: 'building', live: false },
    { label: 'AI Insights', path: '/admin/ai-insights', icon: 'sparkles', live: false },
    { label: 'Knowledge Base', path: '/admin/knowledge-base', icon: 'book-open', live: false },
    { label: 'Settings', path: '/admin/settings', icon: 'sliders', live: false },
  ];

  /** Tickets still waiting on someone (everything not resolved). */
  protected unresolved(): number {
    const k = this.tickets.kpis();
    return k.total - k.resolved;
  }

  /** Placeholder until authentication exists: leaves the console for the Student app. */
  protected signOut(): void {
    this.navOpen.set(false);
    this.router.navigateByUrl('/home');
  }
}
