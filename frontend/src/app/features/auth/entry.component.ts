import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IconComponent } from '../../shared/icon.component';

/** Application entry: choose Student or Admin. */
@Component({
  selector: 'campus-entry',
  imports: [RouterLink, IconComponent],
  styleUrl: './auth.css',
  template: `
    <main class="stage">
      <div class="panel">
        <div class="brand"><span class="mark" aria-hidden="true">SRM</span></div>
        <h1>SRM Campus Assist</h1>
        <p class="tag">Intelligent Campus Helpdesk</p>
        <p class="continue" id="cont">Continue as</p>
        <nav class="roles" aria-labelledby="cont">
          <a class="role" routerLink="/student/login">
            <span class="ico"><ui-icon name="graduation-cap" [size]="28" /></span>
            <strong>🎓 Student</strong><span class="sub">Get help &amp; track requests</span>
          </a>
          <a class="role admin" routerLink="/admin/login">
            <span class="ico"><ui-icon name="shield" [size]="28" /></span>
            <strong>🛡 Admin</strong><span class="sub">Manage helpdesk tickets</span>
          </a>
        </nav>
        <p class="foot">SRMIST Kattankulathur · Demo</p>
      </div>
    </main>`,
})
export class EntryComponent {}
