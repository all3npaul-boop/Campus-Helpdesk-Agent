import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService, Role } from '../../services/auth.service';
import { IconComponent } from '../../shared/icon.component';

/** One login screen used by both roles; the role comes from route data. */
@Component({
  selector: 'campus-login',
  imports: [RouterLink, IconComponent],
  styleUrl: './auth.css',
  template: `
    <main class="stage">
      <div class="panel narrow">
        <div class="brand">
          <span class="mark" aria-hidden="true">SRM</span>
          <span style="text-align:left"><strong style="display:block;color:var(--navy-900)">SRM Campus Assist</strong><span style="font-size:12px;color:var(--muted)">Intelligent Campus Helpdesk</span></span>
        </div>
        <section class="card">
          <h2>{{ isAdmin ? 'Admin / Helpdesk Administrator' : 'Student Login' }}</h2>
          <p class="lead">{{ isAdmin ? 'Sign in to manage campus helpdesk tickets.' : 'Sign in to get help and track your requests.' }}</p>
          <form (submit)="$event.preventDefault(); submit()" autocomplete="on">
            @if (error()) { <p class="err" role="alert">{{ error() }}</p> }
            <label class="f"><span>{{ isAdmin ? 'Email or Admin ID' : 'Email or Student ID' }}</span>
              <input type="text" name="id" [value]="id" (input)="id = $any($event.target).value" autocomplete="username" required />
            </label>
            <label class="f"><span>Password</span>
              <span class="field">
                <input [type]="show() ? 'text' : 'password'" name="pw" [value]="pw" (input)="pw = $any($event.target).value" autocomplete="current-password" required />
                <button type="button" class="eye" (click)="show.set(!show())" [attr.aria-label]="show() ? 'Hide password' : 'Show password'" [attr.aria-pressed]="show()">
                  <ui-icon [name]="show() ? 'eye-off' : 'eye'" [size]="20" />
                </button>
              </span>
            </label>
            <div class="row"><label><input type="checkbox" name="remember" [checked]="remember" (change)="remember = $any($event.target).checked" /> Remember me</label></div>
            <button type="submit" class="primary" [class.admin]="isAdmin">Log in</button>
          </form>
          <p class="demo"><strong>Demo account</strong> · <code>{{ demoId }}</code> / <code>{{ demoPw }}</code></p>
        </section>
        <a class="back" routerLink="/"><ui-icon name="arrow-left" [size]="18" /> Back to role selection</a>
      </div>
    </main>`,
})
export class LoginComponent {
  private auth = inject(AuthService);
  private router = inject(Router);
  protected role: Role = inject(ActivatedRoute).snapshot.data['role'];
  protected isAdmin = this.role === 'ADMIN';
  protected demoId = this.isAdmin ? 'admin@srmist.edu.in' : 'student@srmist.edu.in';
  protected demoPw = this.isAdmin ? 'admin123' : 'student123';
  protected id = '';
  protected pw = '';
  protected remember = false;
  protected readonly show = signal(false);
  protected readonly error = signal('');

  protected submit(): void {
    if (!this.id.trim() || !this.pw) { this.error.set('Enter your ID and password.'); return; }
    if (this.auth.login(this.id, this.pw, this.role, this.remember)) {
      this.router.navigateByUrl(this.isAdmin ? '/admin/dashboard' : '/home');
    } else {
      this.error.set('Incorrect ID or password.');
    }
  }
}
