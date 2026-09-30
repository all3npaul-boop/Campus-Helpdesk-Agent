import { Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { IconComponent } from '../../../shared/icon.component';
import { IconName } from '../../../models/campus.models';

/** "Coming soon" state for sections that are visible in the sidebar but not built yet. */
@Component({
  selector: 'campus-admin-placeholder',
  imports: [IconComponent],
  template: `
    <section class="a-page a-card a-soon-page" aria-labelledby="ph-title">
      <span class="ico"><ui-icon [name]="icon" [size]="26" /></span>
      <span class="a-pill">Coming soon</span>
      <h1 id="ph-title">{{ title }}</h1>
      <p>{{ blurb }}</p>
    </section>`,
})
export class AdminPlaceholderComponent {
  private data = inject(ActivatedRoute).snapshot.data as { title: string; icon: IconName; blurb: string };
  protected title = this.data.title;
  protected icon = this.data.icon;
  protected blurb = this.data.blurb;
}
