import { Component, computed, input, output, signal } from '@angular/core';
import { ActionDraft, DraftField } from '../../../models/campus.models';
import { IconComponent } from '../../../shared/icon.component';

/**
 * Inline action card. The agent prepares the request; nothing is submitted until the student
 * presses "Confirm Request". After confirmation the same card becomes the "Request Submitted" state.
 */
@Component({
  selector: 'action-draft-card',
  imports: [IconComponent],
  templateUrl: './action-draft-card.component.html',
  styleUrl: './action-draft-card.component.css',
})
export class ActionDraftCardComponent {
  readonly draft = input.required<ActionDraft>();
  readonly confirm = output<void>();
  readonly save = output<DraftField[]>();
  readonly viewRequest = output<string>();
  readonly askElse = output<void>();

  protected readonly editing = signal(false);
  protected readonly values = signal<Record<string, string>>({});
  protected readonly validation = signal<string | null>(null);
  protected readonly busy = computed(() => this.draft().status === 'submitting');

  protected startEdit(): void {
    this.values.set(Object.fromEntries(this.draft().fields.map(f => [f.key, f.value])));
    this.validation.set(null);
    this.editing.set(true);
  }

  protected setValue(key: string, value: string): void {
    this.values.update(v => ({ ...v, [key]: value }));
  }

  protected cancelEdit(): void {
    this.editing.set(false);
    this.validation.set(null);
  }

  protected saveEdit(): void {
    const v = this.values();
    const fields = this.draft().fields.map(f => (f.editable ? { ...f, value: (v[f.key] ?? f.value).trim() } : f));
    const missing = fields.find(f => !f.value);
    if (missing) {
      this.validation.set(`Please fill in “${missing.label}”.`);
      return;
    }
    this.save.emit(fields);
    this.editing.set(false);
    this.validation.set(null);
  }

  protected statusLabel(): string {
    switch (this.draft().status) {
      case 'submitting': return 'Submitting…';
      case 'error': return 'Needs attention';
      default: return 'Ready for confirmation';
    }
  }
}
