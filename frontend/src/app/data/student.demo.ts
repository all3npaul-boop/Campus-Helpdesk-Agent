import { CampusNotification, StudentProfile } from '../models/campus.models';

/** DEMO profile. Replace with the authenticated student's profile from the backend. */
export const DEMO_STUDENT: StudentProfile = {
  id: 'demo-student',
  firstName: 'Rahul',
  fullName: 'Rahul (demo profile)',
  initials: 'R',
  program: 'Demo student',
  hostelBlock: 'B Block',
  room: 'Room 214',
  isDemo: true,
};

const ago = (hours: number) => new Date(Date.now() - hours * 3_600_000).toISOString();

export const DEMO_NOTIFICATIONS: CampusNotification[] = [
  { id: 'n1', text: 'Your hostel maintenance request is now In Progress.', at: ago(5), unread: true, requestId: 'DEMO-HT-1038' },
  { id: 'n2', text: 'Your bonafide certificate request is Completed.', at: ago(72), unread: false, requestId: 'DEMO-BC-2071' },
];
