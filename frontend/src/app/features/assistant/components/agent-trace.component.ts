import { Component, input } from '@angular/core';
import { AgentStep } from '../../../models/campus.models';
import { IconComponent } from '../../../shared/icon.component';

/** Compact, visible record of what the agent did: understand → retrieve → recommend → confirm. */
@Component({
  selector: 'agent-trace',
  imports: [IconComponent],
  template: `
    <div class="trace" role="group" aria-label="Agent activity">
      <span class="trace-title">Agent activity</span>
      <ol>
        @for (s of steps(); track s.id) {
          <li [class.active]="s.state === 'active'">
            <span class="mark" aria-hidden="true">
              @if (s.state === 'done') { <ui-icon name="check" [size]="12" /> } @else { <i></i> }
            </span>
            <span class="txt"><strong>{{ s.label }}</strong><span>{{ s.detail }}</span></span>
          </li>
        }
      </ol>
    </div>`,
  styles: [`
    .trace { margin-top: 12px; padding: 12px 14px; border: 1px solid var(--line); border-radius: 14px; background: var(--navy-50); }
    .trace-title { display: block; font-size: 11px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; color: var(--navy-800); margin-bottom: 8px; }
    ol { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 10px 14px; }
    li { display: flex; gap: 8px; align-items: flex-start; min-width: 0; }
    .mark { display: grid; place-items: center; flex: none; width: 18px; height: 18px; margin-top: 1px; border-radius: 50%; background: var(--green); color: #fff; }
    li.active .mark { background: #fff; border: 2px solid var(--burgundy-600); }
    li.active .mark i { width: 6px; height: 6px; border-radius: 50%; background: var(--burgundy-600); animation: pulse 1.4s ease-in-out infinite; }
    .txt { display: flex; flex-direction: column; min-width: 0; line-height: 1.3; }
    .txt strong { font-size: 12.5px; color: var(--navy-900); }
    .txt span { font-size: 12px; color: var(--muted); overflow-wrap: anywhere; }
    @keyframes pulse { 50% { transform: scale(1.5); opacity: .5; } }
  `],
})
export class AgentTraceComponent {
  readonly steps = input.required<AgentStep[]>();
}
