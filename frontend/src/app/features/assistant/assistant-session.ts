import { Injectable, inject, signal } from '@angular/core';
import { Subscription } from 'rxjs';
import { ActionChip, AgentReply, ChatMessage, DraftField } from '../../models/campus.models';
import { CampusAgentApi } from '../../services/campus-agent.api';

export interface AssistantSeed { q?: string | null; context?: string | null; request?: string | null; }

/**
 * Conversation state for one visit to /assistant. Owns the message list, the typing state and the
 * confirm-before-submit flow. All campus logic lives behind CampusAgentApi.
 */
@Injectable()
export class AssistantSession {
  private api = inject(CampusAgentApi);
  readonly messages = signal<ChatMessage[]>([]);
  readonly typing = signal(false);
  readonly topic = signal<string | null>(null);

  private awaiting: AgentReply['awaiting'];
  private sub?: Subscription;
  private nextId = 1;

  start(seed: AssistantSeed): void {
    this.sub?.unsubscribe();
    this.messages.set([]);
    this.typing.set(false);
    this.awaiting = undefined;
    this.topic.set(null);
    if (seed.q?.trim()) this.send(seed.q);
    else if (seed.request) this.viewRequest(seed.request);
    else this.run(this.api.openContext(seed.context ?? null));
  }

  send(text: string): void {
    const clean = text.trim();
    if (!clean || this.typing()) return;
    this.pushStudent(clean);
    this.run(this.api.respond(clean, this.awaiting), clean);
  }

  perform(chip: ActionChip): void {
    if (this.typing()) return;
    this.pushStudent(chip.label);
    this.run(this.api.perform(chip.id));
  }

  viewRequest(requestId: string): void {
    if (this.typing()) return;
    this.run(this.api.openRequest(requestId));
  }

  askElse(): void {
    if (this.typing()) return;
    this.run(this.api.perform('ask-else'));
  }

  saveDraft(messageId: number, fields: DraftField[]): void {
    this.patch(messageId, m => (m.draft ? { ...m, draft: { ...m.draft, fields, status: 'ready', error: undefined } } : m));
  }

  /** Only entry point that creates a request, and only from a draft the student has reviewed. */
  confirm(messageId: number): void {
    const message = this.messages().find(m => m.id === messageId);
    if (!message?.draft || (message.draft.status !== 'ready' && message.draft.status !== 'error')) return;
    const draft = message.draft;
    this.patch(messageId, m => ({ ...m, draft: { ...draft, status: 'submitting', error: undefined } }));
    this.api.submitRequest(draft).subscribe({
      next: request => this.patch(messageId, m => ({
        ...m,
        draft: { ...draft, status: 'submitted', requestId: request.id, error: undefined },
        steps: [
          ...(m.steps ?? []).filter(s => s.id !== 'confirm'),
          { id: 'confirm', label: 'You confirmed', detail: 'Reviewed and approved', state: 'done' },
          { id: 'create', label: 'Request created', detail: request.id, state: 'done' },
          { id: 'track', label: 'Tracking', detail: "I'll keep updates here", state: 'active' },
        ],
      })),
      error: (err: unknown) => this.patch(messageId, m => ({
        ...m,
        draft: { ...draft, status: 'error', error: err instanceof Error && err.message ? `${err.message} Please review the details and try again.` : 'Something went wrong. Please try again.' },
      })),
    });
  }

  retry(text: string): void {
    if (this.typing()) return;
    this.messages.update(list => list.filter(m => !m.isError));
    this.run(this.api.respond(text, this.awaiting), text);
  }

  /* ---------------- internals ---------------- */

  private run(reply$: ReturnType<CampusAgentApi['respond']>, retryText?: string): void {
    this.sub?.unsubscribe();
    this.typing.set(true);
    this.sub = reply$.subscribe({
      next: reply => {
        this.typing.set(false);
        this.awaiting = reply.awaiting;
        if (reply.topic) this.topic.set(reply.topic);
        const { awaiting: _awaiting, topic: _topic, ...content } = reply;
        this.messages.update(list => [...list, { ...content, id: this.nextId++, role: 'agent', at: new Date() }]);
      },
      error: () => {
        this.typing.set(false);
        this.messages.update(list => [...list, {
          id: this.nextId++, role: 'agent', at: new Date(), isError: true, retryText,
          text: "Sorry — I couldn't complete that just now. Nothing was submitted. Please try again.",
        }]);
      },
    });
  }

  private pushStudent(text: string): void {
    this.messages.update(list => [...list, { id: this.nextId++, role: 'student', text, at: new Date() }]);
  }

  private patch(id: number, fn: (m: ChatMessage) => ChatMessage): void {
    this.messages.update(list => list.map(m => (m.id === id ? fn(m) : m)));
  }
}
