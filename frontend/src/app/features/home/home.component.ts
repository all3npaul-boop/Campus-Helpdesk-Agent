import { Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { CampusService, StudentRequest } from '../../models/campus.models';
import { CampusDataService } from '../../services/student.service';
import { RequestStoreService } from '../../services/request-store.service';
import { AppHeaderComponent } from '../../shared/app-header.component';
import { IconComponent } from '../../shared/icon.component';
import { greeting, statusTone, timeAgo } from '../../utils/text';

@Component({
  selector: 'campus-home',
  imports: [RouterLink, AppHeaderComponent, IconComponent],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css',
})
export class HomeComponent {
  private router = inject(Router);
  protected data = inject(CampusDataService);
  protected store = inject(RequestStoreService);

  protected readonly greeting = greeting();
  protected readonly query = signal('');
  protected readonly recent = computed(() => this.store.recent().slice(0, 4));
  protected readonly tone = statusTone;
  protected readonly ago = (iso: string) => timeAgo(iso);

  protected readonly notifications = this.data.notifications;
  protected readonly unreadNotificationsCount = computed(() => this.notifications().filter(n => n.unread).length);

  protected readonly requestsSummary = computed(() => {
    const reqs = this.store.requests();
    let inProgress = 0, inReview = 0, completed = 0;
    for (const r of reqs) {
      if (r.status === 'In Progress') inProgress++;
      if (r.status === 'In Review') inReview++;
      if (r.status === 'Completed' || r.status === 'Resolved') completed++;
    }
    return { total: reqs.length, inProgress, inReview, completed };
  });

  protected readonly actionableItems = computed(() => {
    const items = [];
    const inProgress = this.requestsSummary().inProgress;
    if (inProgress > 0) items.push(`${inProgress} request${inProgress > 1 ? 's are' : ' is'} currently in progress`);

    const unread = this.unreadNotificationsCount();
    if (unread > 0) items.push(`${unread} unread notification${unread > 1 ? 's' : ''}`);

    const hostelReq = this.store.requests().find(r => r.serviceId === 'hostel-maintenance' && (r.status === 'In Progress' || r.status === 'In Review'));
    if (hostelReq) {
      items.push(`Hostel maintenance update available`);
    }

    if (items.length === 0) {
      items.push(`All caught up!`);
    }

    return Array.from(new Set(items)); // deduplicate
  });

  protected readonly personalizedInsight = computed(() => {
     const recentReq = this.store.requests().find(r => r.status === 'In Progress' || r.status === 'In Review');
     if (recentReq) {
       return `Your ${recentReq.title.toLowerCase()} request has moved to ${recentReq.status}.`;
     }
     const latest = this.store.requests()[0];
     if (latest) {
       return `Your most recent request was updated ${this.ago(latest.updatedAt)}.`;
     }
     return "You're all caught up with your campus activities.";
  });

  protected ask(): void {
    const q = this.query().trim();
    if (q) this.router.navigate(['/assistant'], { queryParams: { q } });
  }

  protected prompt(text: string): void {
    this.router.navigate(['/assistant'], { queryParams: { q: text } });
  }

  protected openContext(context: string): void {
    this.router.navigate(['/assistant'], { queryParams: { context } });
  }

  protected openService(service: CampusService): void {
    this.openContext(service.context);
  }

  protected openRequest(request: StudentRequest): void {
    this.router.navigate(['/assistant'], { queryParams: { request: request.id } });
  }

  protected serviceIcon(request: StudentRequest) {
    return this.data.serviceById(request.serviceId)?.icon ?? 'file-text';
  }
}
