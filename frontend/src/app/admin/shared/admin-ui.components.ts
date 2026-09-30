import { Component, computed, input } from '@angular/core';
import { LOW_CONFIDENCE, TicketPriority, TicketStatus } from '../models/ticket.model';

/** Status pill. Colour is never the only signal — the label is always shown. */
@Component({
  selector: 'adm-status',
  template: `<span class="s" [attr.data-s]="tone()"><i aria-hidden="true"></i>{{ status() }}</span>`,
  styles: [`
    :host { display: inline-flex; }
    .s { display: inline-flex; align-items: center; gap: 6px; font-size: 12px; font-weight: 600; line-height: 1; padding: 6px 10px; border-radius: 999px; white-space: nowrap; }
    i { width: 7px; height: 7px; border-radius: 50%; background: currentColor; }
    [data-s='resolved'] { color: #17704a; background: #e6f4ec; }
    [data-s='progress'] { color: #1a5bb8; background: #e4eefc; }
    [data-s='open'] { color: #8a5a00; background: #fdf1dc; }
    [data-s='escalated'] { color: #a3213a; background: #fbe6ea; }
    [data-s='review'] { color: #5b3aa8; background: #eee8fb; }
  `],
})
export class StatusBadgeComponent {
  readonly status = input.required<TicketStatus>();
  protected readonly tone = computed(() => ({
    'Resolved': 'resolved', 'In Progress': 'progress', 'Open': 'open', 'Escalated': 'escalated', 'Needs Review': 'review',
  } as Record<TicketStatus, string>)[this.status()]);
}

/** Priority indicator: a small signal-bar glyph plus the label. */
@Component({
  selector: 'adm-priority',
  template: `<span class="p" [attr.data-p]="priority()"><span class="bars" aria-hidden="true"><b></b><b></b><b></b></span>{{ priority() }}</span>`,
  styles: [`
    :host { display: inline-flex; }
    .p { display: inline-flex; align-items: center; gap: 7px; font-size: 13px; font-weight: 600; white-space: nowrap; color: var(--muted); }
    .bars { display: inline-flex; align-items: flex-end; gap: 2px; height: 12px; }
    .bars b { width: 3px; border-radius: 1px; background: var(--line-strong); }
    .bars b:nth-child(1) { height: 5px; } .bars b:nth-child(2) { height: 8px; } .bars b:nth-child(3) { height: 12px; }
    [data-p='Urgent'] { color: #a3213a; } [data-p='Urgent'] .bars b { background: #a3213a; }
    [data-p='High'] { color: #b4540a; } [data-p='High'] .bars b:nth-child(-n+2) { background: #d9741a; }
    [data-p='Medium'] { color: var(--navy-800); } [data-p='Medium'] .bars b:nth-child(1) { background: var(--navy-700); }
    [data-p='Low'] { color: var(--faint); }
  `],
})
export class PriorityBadgeComponent {
  readonly priority = input.required<TicketPriority>();
}

/** AI confidence: percentage with a thin meter; turns burgundy below the review threshold. */
@Component({
  selector: 'adm-confidence',
  template: `<span class="c" [class.low]="low()" [attr.title]="low() ? 'Below the ' + threshold + '% review threshold' : null">
    <span class="v">{{ value() }}%</span><span class="m" aria-hidden="true"><i [style.width.%]="value()"></i></span>
  </span>`,
  styles: [`
    :host { display: inline-flex; }
    .c { display: inline-flex; align-items: center; gap: 8px; font-size: 13px; font-weight: 600; font-variant-numeric: tabular-nums; }
    .m { width: 44px; height: 5px; border-radius: 3px; background: var(--navy-100); overflow: hidden; }
    .m i { display: block; height: 100%; background: var(--green); border-radius: 3px; }
    .low { color: var(--burgundy-700); } .low .m i { background: var(--burgundy-600); }
  `],
})
export class ConfidenceComponent {
  readonly value = input.required<number>();
  protected readonly threshold = LOW_CONFIDENCE;
  protected readonly low = computed(() => this.value() < LOW_CONFIDENCE);
}
