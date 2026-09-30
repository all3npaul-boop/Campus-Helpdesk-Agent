import { Routes } from '@angular/router';
import { AssistantComponent } from './features/assistant/assistant.component';
import { HomeComponent } from './features/home/home.component';
import { RequestsComponent } from './features/requests/requests.component';
import { EntryComponent } from './features/auth/entry.component';
import { LoginComponent } from './features/auth/login.component';
import { guestGuard, roleGuard } from './guards/auth.guard';

/**
 * Entry & auth:
 *   /                  Role selection (Student / Admin)          (/login is an alias)
 *   /student/login     Student login  -> /home
 *   /admin/login       Admin login    -> /admin/dashboard
 * Student screens (STUDENT only):
 *   /home                         Student Home
 *   /assistant                    AI Campus Assistant
 *   /assistant?q=<text>           start from a typed or suggested question
 *   /assistant?context=<id>       start from a service or topic
 *   /assistant?request=<id>       start from an existing request
 *   /requests                     My Requests (track, filter, open details, hand back to the assistant)
 * Admin Console (ADMIN only):
 *   /admin/...                    lazy-loaded; see admin/admin.routes.ts
 */
const student = { canActivate: [roleGuard('STUDENT')] };

export const routes: Routes = [
  { path: '', pathMatch: 'full', component: EntryComponent, title: 'SRM Campus Assist' },
  { path: 'login', pathMatch: 'full', redirectTo: '' },
  { path: 'student/login', component: LoginComponent, data: { role: 'STUDENT' }, canActivate: [guestGuard('STUDENT')], title: 'Student Login · SRM Campus Assist' },
  { path: 'admin/login', component: LoginComponent, data: { role: 'ADMIN' }, canActivate: [guestGuard('ADMIN')], title: 'Admin Login · SRM Campus Assist' },
  { path: 'home', component: HomeComponent, ...student, title: 'Home · SRM Campus Assist' },
  { path: 'assistant', component: AssistantComponent, ...student, title: 'Assistant · SRM Campus Assist' },
  { path: 'requests', component: RequestsComponent, ...student, title: 'My Requests · SRM Campus Assist' },
  { path: 'admin', canActivate: [roleGuard('ADMIN')], loadChildren: () => import('./admin/admin.routes').then(m => m.ADMIN_ROUTES) },
  { path: '**', redirectTo: '' },
];
