import { StudentRequest } from '../models/campus.models';

const MIN = 60_000;
const now = Date.now();
const minutesAgo = (m: number) => new Date(now - m * MIN).toISOString();

/** A wall-clock time on a day `daysAgo` before today, e.g. at(1, 16, 15) = yesterday 4:15 PM. */
function at(daysAgo: number, hour: number, minute: number): Date {
  const d = new Date(now);
  d.setDate(d.getDate() - daysAgo);
  d.setHours(hour, minute, 0, 0);
  return d;
}
const iso = (d: Date) => d.toISOString();
const plus = (d: Date, min: number) => new Date(d.getTime() + min * MIN);

// "Today · 10:42 AM", but never later than half an hour ago, so the demo is coherent at any time of day.
const todaySubmitted = new Date(Math.min(at(0, 10, 42).getTime(), now - 30 * MIN));
const bonafide = at(1, 16, 15);
const transport = at(2, 14, 30);
const wifi = at(3, 20, 20);

const origin = (d: Date) => ({ via: 'assistant' as const, confirmedByStudent: true, confirmedAt: iso(d) });

/** DEMO requests. Replace with the student's real request list from the backend. */
export const DEMO_REQUESTS: StudentRequest[] = [
  {
    id: 'DEMO-HT-1042', title: 'Hostel Maintenance', serviceId: 'hostel', status: 'In Progress',
    issue: 'Leaking tap', description: 'B Block · Room 214',
    submittedAt: iso(todaySubmitted), updatedAt: minutesAgo(12),
    summary: 'Leaking tap · B Block · Room 214',
    details: [{ label: 'Issue', value: 'Leaking tap' }, { label: 'Location', value: 'B Block · Room 214' }, { label: 'Priority', value: 'Normal' }],
    history: [
      { status: 'Submitted', at: iso(todaySubmitted), note: 'Request created after your confirmation.' },
      { status: 'In Review', at: iso(plus(todaySubmitted, 6)), note: 'Assigned to hostel maintenance (demo).' },
      { status: 'In Progress', at: minutesAgo(12), note: 'Maintenance team working (demo).' },
    ],
    timeline: [
      { label: 'Request submitted', state: 'done', at: iso(todaySubmitted) },
      { label: 'Assigned to hostel maintenance', state: 'done', at: iso(plus(todaySubmitted, 6)) },
      { label: 'Maintenance team working', state: 'current', at: minutesAgo(12) },
      { label: 'Issue resolved', state: 'todo' },
    ],
    origin: origin(todaySubmitted), isDemo: true,
  },
  {
    id: 'DEMO-BC-2071', title: 'Bonafide Certificate', serviceId: 'student-services', status: 'Completed',
    description: 'Purpose: scholarship application',
    submittedAt: iso(bonafide), updatedAt: iso(plus(bonafide, 20)),
    summary: 'Bonafide certificate · scholarship application',
    details: [{ label: 'Certificate', value: 'Bonafide certificate' }, { label: 'Purpose', value: 'Scholarship application (demo)' }],
    history: [
      { status: 'Submitted', at: iso(bonafide), note: 'Request created after your confirmation.' },
      { status: 'In Review', at: iso(plus(bonafide, 8)), note: 'Under review by Student Services (demo).' },
      { status: 'Completed', at: iso(plus(bonafide, 20)), note: 'Marked as completed (demo).' },
    ],
    timeline: [
      { label: 'Request submitted', state: 'done', at: iso(bonafide) },
      { label: 'Reviewed by Student Services', state: 'done', at: iso(plus(bonafide, 8)) },
      { label: 'Certificate prepared', state: 'done', at: iso(plus(bonafide, 15)) },
      { label: 'Completed', state: 'done', at: iso(plus(bonafide, 20)) },
    ],
    origin: origin(bonafide), isDemo: true,
  },
  {
    id: 'DEMO-TR-3015', title: 'Transport Enquiry', serviceId: 'transport', status: 'Resolved',
    description: 'KTR → Potheri shuttle',
    submittedAt: iso(transport), updatedAt: iso(plus(transport, 25)),
    summary: 'Shuttle frequency · KTR → Potheri',
    details: [{ label: 'Route', value: 'KTR → Potheri' }, { label: 'Question', value: 'Shuttle frequency (demo)' }],
    history: [
      { status: 'Submitted', at: iso(transport), note: 'Enquiry created after your confirmation.' },
      { status: 'Resolved', at: iso(plus(transport, 25)), note: 'Answered by the transport desk (demo).' },
    ],
    timeline: [
      { label: 'Enquiry submitted', state: 'done', at: iso(transport) },
      { label: 'Reviewed by transport desk', state: 'done', at: iso(plus(transport, 10)) },
      { label: 'Resolved', state: 'done', at: iso(plus(transport, 25)) },
    ],
    origin: origin(transport), isDemo: true,
  },
  {
    id: 'DEMO-WF-4108', title: 'Wi-Fi Issue', serviceId: 'facilities', status: 'Awaiting Action',
    description: 'Hostel Wi-Fi connectivity',
    submittedAt: iso(wifi), updatedAt: iso(plus(wifi, 45)),
    summary: 'Hostel Wi-Fi connectivity',
    details: [{ label: 'Issue', value: 'Hostel Wi-Fi connectivity' }, { label: 'Waiting for', value: 'Your reply in Campus Assist' }],
    history: [
      { status: 'Submitted', at: iso(wifi), note: 'Request created after your confirmation.' },
      { status: 'Awaiting Action', at: iso(plus(wifi, 45)), note: 'More information is needed from you (demo).' },
    ],
    timeline: [
      { label: 'Request submitted', state: 'done', at: iso(wifi) },
      { label: 'Reviewed by Campus Facilities', state: 'done', at: iso(plus(wifi, 20)) },
      { label: 'Waiting for your response', state: 'current', at: iso(plus(wifi, 45)) },
      { label: 'Issue resolved', state: 'todo' },
    ],
    origin: origin(wifi), isDemo: true,
  },
];
