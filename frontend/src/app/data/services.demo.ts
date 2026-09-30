import { CampusService, CampusStatusItem } from '../models/campus.models';

/** `topic.context` values are knowledge-entry ids (see knowledge.demo.ts). */
export const CAMPUS_SERVICES: CampusService[] = [
  { id: 'academics', title: 'Academics', description: 'Course registration, timetable, examinations', icon: 'graduation-cap', context: 'academics',
    topics: [{ label: 'Course registration', context: 'registration' }, { label: 'Timetable', context: 'timetable' }] },
  { id: 'hostel', title: 'Hostel', description: 'Maintenance, room issues, hostel information', icon: 'bed', context: 'hostel',
    topics: [{ label: 'Report an issue', context: 'hostel-maintenance' }, { label: 'Hostel information', context: 'hostel-info' }] },
  { id: 'transport', title: 'Transport', description: 'Shuttle information and transport help', icon: 'bus', context: 'transport',
    topics: [{ label: 'Shuttle timings', context: 'shuttle' }, { label: 'Transport enquiry', context: 'transport-help' }] },
  { id: 'student-services', title: 'Student Services', description: 'Certificates, ID card, documents', icon: 'file-text', context: 'student-services',
    topics: [{ label: 'Bonafide Certificate', context: 'bonafide' }, { label: 'ID Card', context: 'id-card' }] },
  { id: 'fees', title: 'Fees & Scholarships', description: 'Fee-related help and scholarship information', icon: 'wallet', context: 'fees',
    topics: [{ label: 'Fee help', context: 'fees-help' }, { label: 'Scholarships', context: 'scholarships' }] },
  { id: 'library', title: 'Library', description: 'Library services and information', icon: 'book-open', context: 'library',
    topics: [{ label: 'Library services', context: 'library-info' }] },
  { id: 'medical', title: 'Medical', description: 'Medical centre information', icon: 'cross', context: 'medical',
    topics: [{ label: 'Medical centre', context: 'medical-info' }] },
  { id: 'facilities', title: 'Campus Facilities', description: 'Wi-Fi, maintenance, lost & found, security', icon: 'wrench', context: 'facilities',
    topics: [{ label: 'Wi-Fi', context: 'wifi' }, { label: 'Lost & found', context: 'lost-found' }] },
];

export const SUGGESTED_PROMPTS: string[] = [
  'Where can I get a bonafide certificate?',
  'What are the shuttle timings?',
  'How do I report a hostel issue?',
  'Where is the medical centre?',
];

/** DEMO status feed. Replace with a live campus-status endpoint. */
export const CAMPUS_TODAY: CampusStatusItem[] = [
  { id: 'library', label: 'Library', value: 'Open until 9:00 PM', tone: 'ok', icon: 'book-open' },
  { id: 'shuttle', label: 'Shuttle · KTR → Potheri', value: 'Next departure: 12 min', tone: 'info', icon: 'bus' },
  { id: 'medical', label: 'Medical Centre', value: 'Open', tone: 'ok', icon: 'cross' },
  { id: 'wifi', label: 'Campus Wi-Fi', value: 'Operational', tone: 'ok', icon: 'wifi' },
  { id: 'ai', label: 'AI Helpdesk', value: 'Online', tone: 'ok', icon: 'sparkles' },
];
