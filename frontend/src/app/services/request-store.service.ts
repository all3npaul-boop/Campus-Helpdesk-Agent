import { Injectable, computed, signal } from '@angular/core';
import { StudentRequest } from '../models/campus.models';
import { DEMO_REQUESTS } from '../data/requests.demo';
import { REQUEST_ID_START } from '../data/knowledge.demo';

/** Client-side store of the student's requests, shared by Home and the Assistant. */
@Injectable({ providedIn: 'root' })
export class RequestStoreService {
  readonly requests = signal<StudentRequest[]>(DEMO_REQUESTS);
  readonly recent = computed(() => [...this.requests()].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)));
  private counters: Record<string, number> = { ...REQUEST_ID_START };

  byId(id: string): StudentRequest | undefined {
    return this.requests().find(r => r.id === id);
  }

  /**
   * Adds a request, or replaces the one with the same id. Ids are unique, so re-creating a demo id
   * (for example the seeded DEMO-HT-1042) never produces two entries.
   */
  add(request: StudentRequest): void {
    this.requests.update(list => [request, ...list.filter(r => r.id !== request.id)]);
  }

  nextId(prefix: string): string {
    const n = this.counters[prefix] ?? 4000;
    this.counters[prefix] = n + 1;
    return `DEMO-${prefix}-${n}`;
  }
}
