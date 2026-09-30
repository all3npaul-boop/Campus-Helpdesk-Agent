import { Component, ElementRef, HostListener, computed, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { CampusDataService } from '../services/student.service';
import { IconComponent } from './icon.component';
import { timeAgo } from '../utils/text';

/**
 * Top bar shared by the Home and My Requests screens: branding, primary navigation,
 * notifications and the student avatar. (The Assistant has its own focused header.)
 */
@Component({
  selector: 'campus-header',
  imports: [RouterLink, RouterLinkActive, IconComponent],
  templateUrl: './app-header.component.html',
  styleUrl: './app-header.component.css',
})
export class AppHeaderComponent {
  private router = inject(Router);
  private host = inject<ElementRef<HTMLElement>>(ElementRef);
  protected data = inject(CampusDataService);

  protected readonly notifOpen = signal(false);
  protected readonly unreadCount = computed(() => this.data.notifications().filter(n => n.unread).length);
  protected readonly ago = (iso: string) => timeAgo(iso);

  protected openNotification(id: string, requestId?: string): void {
    this.data.markNotificationRead(id);
    this.notifOpen.set(false);
    if (requestId) this.router.navigate(['/assistant'], { queryParams: { request: requestId } });
  }

  @HostListener('document:click', ['$event'])
  protected onDocumentClick(event: Event): void {
    if (this.notifOpen() && !this.host.nativeElement.querySelector('.notif')?.contains(event.target as Node)) {
      this.notifOpen.set(false);
    }
  }

  @HostListener('document:keydown.escape')
  protected onEscape(): void {
    this.notifOpen.set(false);
  }
}
