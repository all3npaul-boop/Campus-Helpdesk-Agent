import { Routes } from '@angular/router';
import { AssistantComponent } from './features/assistant/assistant.component';
import { HomeComponent } from './features/home/home.component';
import { RequestsComponent } from './features/requests/requests.component';

/**
 * Primary screens: Home, Assistant, and My Requests (a tracker only — details open in a panel). Every service, request and workflow happens inside /assistant.
 *   /home                         Student Home
 *   /assistant                    AI Campus Assistant
 *   /assistant?q=<text>           start from a typed or suggested question
 *   /assistant?context=<id>       start from a service or topic
 *   /assistant?request=<id>       start from an existing request
 *   /requests                     My Requests (track, filter, open details, hand back to the assistant)
 */
export const routes: Routes = [
  { path: 'home', component: HomeComponent, title: 'Home · SRM Campus Assist' },
  { path: 'assistant', component: AssistantComponent, title: 'Assistant · SRM Campus Assist' },
  { path: 'requests', component: RequestsComponent, title: 'My Requests · SRM Campus Assist' },
  { path: '', pathMatch: 'full', redirectTo: 'home' },
  { path: '**', redirectTo: 'home' },
];
