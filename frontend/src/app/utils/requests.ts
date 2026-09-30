import { RequestStatus, StudentRequest, TimelineStep } from '../models/campus.models';

/** The four groups shown on My Requests. Submitted/In Review count as "in progress". */
export type RequestBucket = 'in-progress' | 'completed' | 'awaiting';
export type RequestFilter = 'all' | RequestBucket;

export const REQUEST_FILTERS: { id: RequestFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'in-progress', label: 'In Progress' },
  { id: 'completed', label: 'Completed' },
  { id: 'awaiting', label: 'Awaiting Action' },
];

export function bucketOf(status: RequestStatus): RequestBucket {
  if (status === 'Completed' || status === 'Resolved') return 'completed';
  if (status === 'Awaiting Action') return 'awaiting';
  return 'in-progress';
}

export function submittedAt(r: StudentRequest): string {
  return r.submittedAt ?? r.history[0]?.at ?? r.updatedAt;
}

/** Uses the request's own timeline, or derives a simple one from its history. */
export function timelineOf(r: StudentRequest): TimelineStep[] {
  if (r.timeline?.length) return r.timeline;
  const last = r.history.length - 1;
  const closed = bucketOf(r.status) === 'completed';
  return r.history.map((e, i) => ({
    label: e.status === 'Submitted' ? 'Request submitted' : e.status,
    state: i < last || closed ? 'done' : 'current',
    at: e.at,
  }));
}
