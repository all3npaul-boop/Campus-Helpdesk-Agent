import { Component, input } from '@angular/core';
import { StudentRequest } from '../../../models/campus.models';
import { shortDate, statusTone } from '../../../utils/text';

@Component({
  selector: 'request-status-card',
  template: `
    <section class="card" [attr.aria-label]="request().title + ' request status'">
      <header>
        <div>
          <span class="eyebrow">{{ request().title }}</span>
          <p class="id">{{ request().id }}</p>
        </div>
        <span [class]="'badge ' + tone(request().status)">{{ request().status }}</span>
      </header>
      <dl>
        @for (d of request().details; track d.label) {
          <div><dt>{{ d.label }}</dt><dd>{{ d.value }}</dd></div>
        }
      </dl>
      <ol class="timeline" aria-label="Request history">
        @for (e of request().history; track e.at; let last = $last) {
          <li [class.current]="last">
            <span class="node" aria-hidden="true"></span>
            <span class="what"><strong>{{ e.status }}</strong> <time>{{ date(e.at) }}</time></span>
            <span class="note">{{ e.note }}</span>
          </li>
        }
      </ol>
      <p class="demo">Demo request · sample data</p>
    </section>`,
  styles: [`
    .card { margin-top: 12px; background: var(--surface); border: 1px solid var(--line); border-radius: var(--radius-md); padding: 18px; box-shadow: var(--shadow-sm); }
    header { display: flex; justify-content: space-between; gap: 12px; align-items: flex-start; }
    .eyebrow { font-size: 11px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; color: var(--burgundy-600); }
    .id { font-weight: 700; font-size: 16px; margin-top: 2px; overflow-wrap: anywhere; }
    dl { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 12px; margin: 14px 0; }
    dl div { min-width: 0; }
    dt { font-size: 11px; font-weight: 600; letter-spacing: .06em; text-transform: uppercase; color: var(--muted); }
    dd { margin: 2px 0 0; font-weight: 600; overflow-wrap: anywhere; }
    .timeline { list-style: none; margin: 0; padding: 0 0 0 4px; border-top: 1px solid var(--line); padding-top: 14px; display: grid; gap: 12px; }
    li { position: relative; display: grid; padding-left: 22px; }
    li::before { content: ''; position: absolute; left: 4px; top: 14px; bottom: -14px; width: 2px; background: var(--line); }
    li:last-child::before { display: none; }
    .node { position: absolute; left: 0; top: 5px; width: 10px; height: 10px; border-radius: 50%; background: var(--navy-200); }
    li.current .node { background: var(--burgundy-600); box-shadow: 0 0 0 4px var(--burgundy-50); }
    .what { font-size: 14px; }
    time { color: var(--muted); font-size: 12px; margin-left: 6px; }
    .note { font-size: 13px; color: var(--muted); }
    .demo { margin-top: 14px; font-size: 12px; color: var(--faint); }
  `],
})
export class RequestStatusCardComponent {
  readonly request = input.required<StudentRequest>();
  protected readonly tone = statusTone;
  protected readonly date = (iso: string) => shortDate(iso);
}
