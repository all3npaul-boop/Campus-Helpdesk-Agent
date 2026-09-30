import { Injectable, computed, signal } from '@angular/core';

export type Role = 'STUDENT' | 'ADMIN';
export interface AuthUser { id: string; name: string; email: string; role: Role; }

/** DEMO accounts (local/mock only). Replace `login` with an HTTP call when real auth is ready. */
export const DEMO_ACCOUNTS: (AuthUser & { password: string })[] = [
  { id: 'demo-student', name: 'Rahul (demo profile)', email: 'student@srmist.edu.in', password: 'student123', role: 'STUDENT' },
  { id: 'demo-admin', name: 'Helpdesk Administrator', email: 'admin@srmist.edu.in', password: 'admin123', role: 'ADMIN' },
];

const KEY = 'srm-campus-assist.session';

/**
 * Session only: it never touches ticket/request data, so signing out keeps tickets intact.
 * Persisted in sessionStorage (survives refresh, cleared with the tab); "Remember me" uses localStorage.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly _user = signal<AuthUser | null>(this.restore());
  readonly user = this._user.asReadonly();
  readonly isLoggedIn = computed(() => this._user() !== null);
  readonly role = computed(() => this._user()?.role ?? null);

  /** Returns true on success. Only accounts of the requested role can sign in through that screen. */
  login(email: string, password: string, role: Role, remember = false): boolean {
    const id = email.trim().toLowerCase();
    const acct = DEMO_ACCOUNTS.find(a => a.role === role && a.password === password && (a.email === id || a.id === id));
    if (!acct) return false;
    const { password: _pw, ...user } = acct;
    this._user.set(user);
    this.persist(user, remember);
    return true;
  }

  logout(): void {
    this._user.set(null);
    try { sessionStorage.removeItem(KEY); localStorage.removeItem(KEY); } catch { /* storage unavailable */ }
  }

  hasRole(role: Role): boolean {
    return this._user()?.role === role;
  }

  private persist(user: AuthUser, remember: boolean): void {
    try {
      sessionStorage.removeItem(KEY); localStorage.removeItem(KEY);
      (remember ? localStorage : sessionStorage).setItem(KEY, JSON.stringify(user));
    } catch { /* storage unavailable */ }
  }

  private restore(): AuthUser | null {
    try {
      const raw = sessionStorage.getItem(KEY) ?? localStorage.getItem(KEY);
      const u = raw ? (JSON.parse(raw) as AuthUser) : null;
      return u && (u.role === 'STUDENT' || u.role === 'ADMIN') ? u : null;
    } catch { return null; }
  }
}
