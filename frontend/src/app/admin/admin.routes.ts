import { Routes } from '@angular/router';
import { AdminShellComponent } from './layout/admin-shell.component';

const placeholder = () => import('./pages/placeholder/admin-placeholder.component').then(m => m.AdminPlaceholderComponent);
const suffix = ' · Admin · SRM Campus Assist';

/**
 * Admin Console routes (lazy-loaded from app.routes.ts under /admin).
 * Route guards for the upcoming admin login belong on the parent route below.
 */
export const ADMIN_ROUTES: Routes = [
  {
    path: '',
    component: AdminShellComponent,
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      { path: 'dashboard', title: 'Dashboard' + suffix, loadComponent: () => import('./pages/dashboard/admin-dashboard.component').then(m => m.AdminDashboardComponent) },
      { path: 'tickets', title: 'Tickets' + suffix, loadComponent: () => import('./pages/tickets/admin-tickets.component').then(m => m.AdminTicketsComponent) },
      { path: 'tickets/:id', title: 'Ticket' + suffix, loadComponent: () => import('./pages/ticket-detail/admin-ticket-detail.component').then(m => m.AdminTicketDetailComponent) },
      { path: 'departments', title: 'Departments' + suffix, loadComponent: placeholder, data: { title: 'Departments', icon: 'building', blurb: 'Department queues, workload and team assignments will appear here.' } },
      { path: 'ai-insights', title: 'AI Insights' + suffix, loadComponent: placeholder, data: { title: 'AI Insights', icon: 'sparkles', blurb: 'Classification accuracy, confidence trends and recurring issues will appear here.' } },
      { path: 'knowledge-base', title: 'Knowledge Base' + suffix, loadComponent: placeholder, data: { title: 'Knowledge Base', icon: 'book-open', blurb: 'Manage the campus policies and FAQs the assistant answers from.' } },
      { path: 'settings', title: 'Settings' + suffix, loadComponent: placeholder, data: { title: 'Settings', icon: 'sliders', blurb: 'SLA rules, review thresholds and notification preferences will appear here.' } },
      { path: '**', redirectTo: 'dashboard' },
    ],
  },
];
