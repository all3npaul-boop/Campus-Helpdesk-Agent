import { Component, DestroyRef, ElementRef, Injector, afterNextRender, computed, effect, inject, signal, viewChild } from '@angular/core';
import { Router } from '@angular/router';
import { StudentRequest } from '../../models/campus.models';
import { CampusDataService } from '../../services/student.service';
import { RequestStoreService } from '../../services/request-store.service';
import { AppHeaderComponent } from '../../shared/app-header.component';
import { IconComponent } from '../../shared/icon.component';
import { REQUEST_FILTERS, RequestFilter, bucketOf, submittedAt, timelineOf } from '../../utils/requests';
import { friendlyTime, statusTone, timeAgo } from '../../utils/text';

/**
 * Screen 3 — My Requests. A student-facing tracker: every request here was prepared by Campus Assist
 * and confirmed by the student. Details open in a side drawer (bottom sheet on mobile); there is no
 * separate details page, and follow-up happens back in /assistant.
 */
@Component({
  selector: 'campus-requests',
  imports: [AppHeaderComponent, IconComponent],
  templateUrl: './requests.component.html',
  styleUrl: './requests.component.css',
})
export class RequestsComponent {
  private router = inject(Router);
  private injector = inject(Injector);
  private destroyRef = inject(DestroyRef);
  protected data = inject(CampusDataService);
  protected store = inject(RequestStoreService);

  protected readonly filters = REQUEST_FILTERS;
  protected readonly filter = signal<RequestFilter>('all');
  protected readonly openId = signal<string | null>(null);

  protected readonly sorted = computed(() =>
    [...this.store.requests()].sort((a, b) => submittedAt(b).localeCompare(submittedAt(a))));
  protected readonly counts = computed(() => {
    const list = this.store.requests();
    const n = (b: string) => list.filter(r => bucketOf(r.status) === b).length;
    return { all: list.length, 'in-progress': n('in-progress'), completed: n('completed'), awaiting: n('awaiting') };
  });
  protected readonly visible = computed(() => {
    const f = this.filter();
    return f === 'all' ? this.sorted() : this.sorted().filter(r => bucketOf(r.status) === f);
  });
  protected readonly selected = computed(() => {
    const id = this.openId();
    return id ? this.store.byId(id) : undefined;
  });
  protected readonly filterLabel = computed(() => this.filters.find(f => f.id === this.filter())?.label ?? '');

  protected readonly tone = statusTone;
  protected readonly when = (iso: string) => friendlyTime(iso);
  protected readonly ago = (iso: string) => timeAgo(iso);
  protected readonly submitted = submittedAt;
  protected readonly timeline = timelineOf;

  private closeBtn = viewChild<ElementRef<HTMLButtonElement>>('closeBtn');
  private sheet = viewChild<ElementRef<HTMLElement>>('sheet');
  private trigger: HTMLElement | null = null;

  constructor() {
    // Lock page scroll while the details panel is open.
    effect(() => {
      document.body.style.overflow = this.openId() ? 'hidden' : '';
    });
    this.destroyRef.onDestroy(() => (document.body.style.overflow = ''));
  }

  protected category(r: StudentRequest): string {
    return this.data.serviceById(r.serviceId)?.title ?? 'Campus service';
  }

  protected icon(r: StudentRequest) {
    return this.data.serviceById(r.serviceId)?.icon ?? 'file-text';
  }

  protected open(r: StudentRequest, event: Event): void {
    this.trigger = event.currentTarget as HTMLElement;
    this.openId.set(r.id);
    afterNextRender(() => this.closeBtn()?.nativeElement.focus(), { injector: this.injector });
  }

  protected close(): void {
    if (!this.openId()) return;
    this.openId.set(null);
    const t = this.trigger;
    this.trigger = null;
    setTimeout(() => t?.focus());
  }

  protected openAssistant(r: StudentRequest): void {
    this.router.navigate(['/assistant'], { queryParams: { request: r.id } });
  }

  protected askAssistant(): void {
    this.router.navigate(['/assistant']);
  }

  /** Details in reading order: the issue first, then the remaining fields. */
  protected fields(r: StudentRequest): { label: string; value: string }[] {
    return [...r.details].sort((a, b) => Number(b.label === 'Issue') - Number(a.label === 'Issue'));
  }

  protected onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      event.preventDefault();
      this.close();
      return;
    }
    if (event.key !== 'Tab') return;
    // Keep keyboard focus inside the open dialog.
    const focusable = Array.from(this.sheet()?.nativeElement.querySelectorAll<HTMLElement>('button:not([disabled]), a[href]') ?? []);
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const active = document.activeElement;
    if (event.shiftKey && active === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && active === last) { event.preventDefault(); first.focus(); }
  }
}
