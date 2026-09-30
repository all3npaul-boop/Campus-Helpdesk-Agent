import { Injectable, signal } from '@angular/core';
import { CampusNotification, CampusService, CampusStatusItem } from '../models/campus.models';
import { DEMO_NOTIFICATIONS, DEMO_STUDENT } from '../data/student.demo';
import { CAMPUS_SERVICES, CAMPUS_TODAY, SUGGESTED_PROMPTS } from '../data/services.demo';

/**
 * Single source of campus data for the UI. Today it serves demo data; swap the bodies for
 * HttpClient calls (profile, services, status feed, notifications) when the backend is ready.
 */
@Injectable({ providedIn: 'root' })
export class CampusDataService {
  readonly student = DEMO_STUDENT;
  readonly services: CampusService[] = CAMPUS_SERVICES;
  readonly suggestedPrompts: string[] = SUGGESTED_PROMPTS;
  readonly campusToday: CampusStatusItem[] = CAMPUS_TODAY;
  readonly notifications = signal<CampusNotification[]>(DEMO_NOTIFICATIONS);

  serviceById(id: string): CampusService | undefined {
    return this.services.find(s => s.id === id);
  }

  markNotificationRead(id: string): void {
    this.notifications.update(list => list.map(n => (n.id === id ? { ...n, unread: false } : n)));
  }
}
