import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService, Role } from '../services/auth.service';

/** Allows the route only for the given role; otherwise sends the visitor to that role's login. */
export const roleGuard = (role: Role): CanActivateFn => () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (auth.hasRole(role)) return true;
  // Signed in as the other role → back to the entry screen; signed out → that role's login.
  return router.parseUrl(auth.isLoggedIn() ? '/' : role === 'ADMIN' ? '/admin/login' : '/student/login');
};

/** Login screens: skip straight to the app if already signed in with that role. */
export const guestGuard = (role: Role): CanActivateFn => () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  return auth.hasRole(role) ? router.parseUrl(role === 'ADMIN' ? '/admin/dashboard' : '/home') : true;
};
