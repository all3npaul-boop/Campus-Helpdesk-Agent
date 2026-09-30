import { Component, ElementRef, effect, inject, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { CampusDataService } from '../../services/student.service';
import { RequestStoreService } from '../../services/request-store.service';
import { IconComponent } from '../../shared/icon.component';
import { clockTime, statusTone, timeAgo } from '../../utils/text';
import { AssistantSession } from './assistant-session';
import { ActionDraftCardComponent } from './components/action-draft-card.component';
import { AgentTraceComponent } from './components/agent-trace.component';
import { RequestStatusCardComponent } from './components/request-status-card.component';

@Component({
  selector: 'campus-assistant',
  imports: [RouterLink, IconComponent, AgentTraceComponent, ActionDraftCardComponent, RequestStatusCardComponent],
  providers: [AssistantSession],
  templateUrl: './assistant.component.html',
  styleUrl: './assistant.component.css',
})
export class AssistantComponent {
  protected session = inject(AssistantSession);
  protected data = inject(CampusDataService);
  protected store = inject(RequestStoreService);
  private route = inject(ActivatedRoute);

  protected readonly draft = signal('');
  protected readonly clock = clockTime;
  protected readonly tone = statusTone;
  protected readonly ago = (iso: string) => timeAgo(iso);
  private scroller = viewChild<ElementRef<HTMLElement>>('scroller');
  private input = viewChild<ElementRef<HTMLInputElement>>('composerInput');

  constructor() {
    this.route.queryParamMap.pipe(takeUntilDestroyed()).subscribe(params => {
      this.session.start({ q: params.get('q'), context: params.get('context'), request: params.get('request') });
    });

    effect(() => {
      this.session.messages();
      this.session.typing();
      setTimeout(() => {
        const el = this.scroller()?.nativeElement;
        if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
      });
    });
  }

  protected send(): void {
    const text = this.draft().trim();
    if (!text || this.session.typing()) return;
    this.draft.set('');
    this.session.send(text);
  }

  protected askElse(): void {
    this.session.askElse();
    this.input()?.nativeElement.focus();
  }
}
