import { KnowledgeEntry, WorkflowConfig } from '../models/campus.models';

/**
 * DEMO knowledge base. Answers are intentionally generic and never state real SRMIST policies,
 * fees, deadlines, phone numbers or URLs. A real backend replaces this via CampusAgentApi.
 */

export const WORKFLOWS: Record<string, WorkflowConfig> = {
  'hostel-maintenance': {
    title: 'Hostel Maintenance', requestTitle: 'Hostel Maintenance', idPrefix: 'HT', serviceId: 'hostel',
    steps: ['Request submitted', 'Assigned to hostel maintenance', 'Maintenance team working', 'Issue resolved'],
  },
  bonafide: {
    title: 'Bonafide Certificate', requestTitle: 'Bonafide Certificate', idPrefix: 'BC', serviceId: 'student-services',
    steps: ['Request submitted', 'Reviewed by Student Services', 'Certificate prepared', 'Completed'],
  },
};

/** First request ids issued per workflow in this demo session. */
export const REQUEST_ID_START: Record<string, number> = { HT: 1042, BC: 2087 };

export const SERVICE_MENUS: Record<string, { title: string; options: string[] }> = {
  academics: { title: 'Academics', options: ['Course registration', 'Timetable', 'Examinations'] },
  hostel: { title: 'Hostel', options: ['Report maintenance issue', 'Hostel information', 'Room-related help'] },
  transport: { title: 'Transport', options: ['Shuttle timings', 'Transport enquiry'] },
  'student-services': { title: 'Student Services', options: ['Bonafide certificate', 'ID card help', 'Other documents'] },
  fees: { title: 'Fees & Scholarships', options: ['Fee-related help', 'Scholarship information'] },
  library: { title: 'Library', options: ['Library services'] },
  medical: { title: 'Medical', options: ['Medical centre information'] },
  facilities: { title: 'Campus Facilities', options: ['Wi-Fi help', 'Lost & found', 'Campus security', 'Campus maintenance'] },
};

const EMERGENCY = 'If this is an emergency, please contact emergency services or campus security directly — I cannot do that for you.';

export const KNOWLEDGE: KnowledgeEntry[] = [
  {
    id: 'hostel-maintenance', service: 'hostel', title: 'Hostel maintenance', workflow: 'hostel-maintenance',
    keywords: ['leak', 'leaks', 'leaking', 'leaky', 'tap', 'taps', 'faucet', 'pipe', 'fan', 'bulb', 'light', 'lights', 'tubelight', 'plumbing',
      'plumber', 'switch', 'socket', 'geyser', 'cupboard', 'hostel issue', 'hostel maintenance', 'maintenance issue', 'report maintenance', 'flush', 'toilet', 'drain'],
    answer: '', retrieved: 'Hostel maintenance workflow · your room from profile (demo)',
    followUps: ['What happens after I confirm?', 'Track my requests'],
  },
  {
    id: 'hostel-info', service: 'hostel', title: 'Hostel information',
    keywords: ['hostel', 'hostels', 'hostel information', 'hostel info', 'warden'],
    answer: 'Detailed hostel information will appear here once the official hostel handbook is connected. In the meantime I can report a maintenance issue for your room.',
    retrieved: 'Hostel service overview (demo)', followUps: ['Report maintenance issue', 'Room-related help'],
  },
  {
    id: 'room-help', service: 'hostel', title: 'Room-related help',
    keywords: ['room related', 'room help', 'room', 'roommate', 'room change'],
    answer: 'I can prepare a room-related request for the hostel office to review. Tell me what you need — for example a repair, or a question about your room.',
    retrieved: 'Hostel service overview (demo)', followUps: ['Report maintenance issue', 'Hostel information'],
  },
  {
    id: 'bonafide', service: 'student-services', title: 'Bonafide certificate', workflow: 'bonafide',
    keywords: ['bonafide', 'bona fide', 'bonafide certificate', 'certificate'],
    answer: 'You can request a bonafide certificate through Student Services. I can guide you through the process.',
    retrieved: 'Student Services · certificates (demo guidance)',
    followUps: ['How long does it take?', 'Is there a fee for it?', 'Track my requests'],
  },
  {
    id: 'id-card', service: 'student-services', title: 'ID card',
    keywords: ['id card', 'id cards', 'identity card', 'student id'],
    answer: 'ID card help is handled by Student Services. I can help you prepare a request for a replacement or correction, but I do not have your card records in this demo.',
    retrieved: 'Student Services · ID card (demo guidance)', followUps: ['Bonafide certificate', 'Track my requests'],
  },
  {
    id: 'documents', service: 'student-services', title: 'Documents',
    keywords: ['documents', 'document', 'certificates', 'transcript'],
    answer: 'Student Services handles certificates and other student documents. Tell me which document you need and I will point you to the right process.',
    retrieved: 'Student Services · documents (demo guidance)', followUps: ['Bonafide certificate', 'ID card help'],
  },
  {
    id: 'shuttle', service: 'transport', title: 'Shuttle timings',
    keywords: ['shuttle', 'shuttles', 'bus', 'buses', 'bus timings', 'next bus'],
    answer: 'The demo feed shows the KTR → Potheri shuttle with the next departure in about 12 minutes. The full timetable will appear here once the transport feed is connected.',
    retrieved: 'Campus status feed · shuttle (demo data)', followUps: ['Transport enquiry', 'Track my requests'],
  },
  {
    id: 'transport-help', service: 'transport', title: 'Transport enquiry',
    keywords: ['transport', 'transport enquiry', 'transportation', 'commute', 'bus pass'],
    answer: 'I can help with transport questions. I do not have verified routes or pass details in this demo, so I will not guess them. Tell me what you need to know.',
    retrieved: 'Transport service overview (demo)', followUps: ['Shuttle timings'],
  },
  {
    id: 'fees-help', service: 'fees', title: 'Fee-related help',
    keywords: ['fee', 'fees', 'fee related', 'payment', 'tuition', 'dues'],
    answer: 'I cannot see your fee records in this demo, and I never guess fee amounts or deadlines. Please check the official fee channels for exact details.',
    retrieved: 'Fees & Scholarships overview (demo)', followUps: ['Scholarship information', 'Track my requests'],
  },
  {
    id: 'scholarships', service: 'fees', title: 'Scholarship information',
    keywords: ['scholarship', 'scholarships', 'financial aid'],
    answer: 'Scholarship details will appear here once official sources are connected. I will not guess eligibility rules or deadlines.',
    retrieved: 'Fees & Scholarships overview (demo)', followUps: ['Fee-related help', 'Bonafide certificate'],
  },
  {
    id: 'library-info', service: 'library', title: 'Library services',
    keywords: ['library', 'libraries', 'books', 'borrow'],
    answer: 'The demo status feed shows the Library as open until 9:00 PM today. Detailed library services will appear here once the library system is connected.',
    retrieved: 'Campus status feed · library (demo data)', followUps: ['Where is the medical centre?', 'Wi-Fi help'],
  },
  {
    id: 'medical-info', service: 'medical', title: 'Medical centre information',
    keywords: ['medical', 'medical centre', 'medical center', 'doctor', 'clinic', 'health', 'hospital', 'infirmary'],
    answer: `The demo status feed shows the Medical Centre as open. I do not have a verified location or contact details in this demo, so I will not guess them. ${EMERGENCY}`,
    retrieved: 'Campus status feed · medical centre (demo data)', followUps: ['Campus security', 'Library services'],
  },
  {
    id: 'wifi', service: 'facilities', title: 'Wi-Fi help',
    keywords: ['wifi', 'wi fi', 'internet', 'network', 'wireless'],
    answer: 'The demo status feed shows campus Wi-Fi as operational. If you are having trouble, tell me where you are and what is happening.',
    retrieved: 'Campus status feed · Wi-Fi (demo data)', followUps: ['Campus maintenance', 'Lost & found'],
  },
  {
    id: 'lost-found', service: 'facilities', title: 'Lost & found',
    keywords: ['lost found', 'lost', 'found', 'lost property'],
    answer: 'I can help you with a lost-and-found enquiry. I do not have the lost-and-found location or listings in this demo, so I will not guess them.',
    retrieved: 'Campus Facilities overview (demo)', followUps: ['Campus security', 'Wi-Fi help'],
  },
  {
    id: 'security', service: 'facilities', title: 'Campus security',
    keywords: ['security', 'safety', 'guard', 'emergency'],
    answer: `Campus security information will appear here once official contacts are connected. ${EMERGENCY}`,
    retrieved: 'Campus Facilities overview (demo)', followUps: ['Lost & found', 'Medical centre information'],
  },
  {
    id: 'facilities-maintenance', service: 'facilities', title: 'Campus maintenance',
    keywords: ['campus maintenance', 'facilities', 'classroom', 'lift', 'elevator'],
    answer: 'For problems outside hostel rooms — classrooms, lifts and common areas — Campus Facilities is the right team. This demo can only prepare hostel maintenance requests.',
    retrieved: 'Campus Facilities overview (demo)', followUps: ['Report maintenance issue', 'Wi-Fi help'],
  },
  {
    id: 'registration', service: 'academics', title: 'Course registration',
    keywords: ['course registration', 'registration', 'register', 'enrol', 'enroll', 'enrolment'],
    answer: 'Course registration steps and dates will appear here once the academic calendar is connected. I will not guess deadlines.',
    retrieved: 'Academics overview (demo)', followUps: ['Timetable', 'Examinations'],
  },
  {
    id: 'timetable', service: 'academics', title: 'Timetable',
    keywords: ['timetable', 'time table', 'schedule', 'classes'],
    answer: 'Your personal timetable will appear here once your academic profile is connected. I do not have it in this demo.',
    retrieved: 'Academics overview (demo)', followUps: ['Course registration', 'Examinations'],
  },
  {
    id: 'exams', service: 'academics', title: 'Examinations',
    keywords: ['exam', 'exams', 'examination', 'examinations', 'hall ticket', 'results'],
    answer: 'Examination schedules and results will appear here once official sources are connected. I will not guess dates.',
    retrieved: 'Academics overview (demo)', followUps: ['Timetable', 'Course registration'],
  },
  {
    id: 'processing-time', service: 'student-services', title: 'Processing time',
    keywords: ['how long', 'turnaround', 'processing time', 'how many days'],
    answer: 'I do not have a verified turnaround time in this demo, so I will not guess one. Once you submit a request I will track its status here.',
    retrieved: 'Student Services · certificates (demo guidance)', followUps: ['Track my requests'],
  },
  {
    id: 'what-next', service: 'hostel', title: 'What happens next',
    keywords: ['what happens after', 'after i confirm', 'what happens next'],
    answer: 'After you confirm, I create the request, give you a request ID, and track its status here. Nothing is submitted until you confirm.',
    retrieved: 'How Campus Assist requests work', followUps: ['Track my requests'],
  },
  {
    id: 'my-requests', service: 'all', title: 'My requests',
    keywords: ['my requests', 'track my requests', 'request status', 'track request', 'track', 'status of my request'],
    answer: 'Here are your recent requests. Pick one to see its status.',
    retrieved: 'Your request list (demo data)', followUps: [],
  },
  {
    id: 'greeting', service: 'all', title: 'Greeting',
    keywords: ['hi', 'hello', 'hey', 'good morning', 'good afternoon', 'good evening'],
    answer: '', retrieved: '', followUps: [],
  },
  {
    id: 'thanks', service: 'all', title: 'Thanks',
    keywords: ['thanks', 'thank you', 'thankyou'],
    answer: 'You are welcome! Is there anything else I can help with?', retrieved: '', followUps: ['Track my requests'],
  },
];

export const ISSUE_PATTERNS: { test: RegExp; issue: string }[] = [
  { test: /\bleak\w*\b.*\b(tap|taps|faucet)\b|\b(tap|taps|faucet)\b.*\bleak\w*\b/, issue: 'Leaking tap' },
  { test: /\bleak\w*\b.*\bpipe\b|\bpipe\b.*\bleak\w*\b/, issue: 'Leaking pipe' },
  { test: /\bleak\w*\b/, issue: 'Water leak' },
  { test: /\bfan\b/, issue: 'Fan not working' },
  { test: /\b(light|lights|bulb|tubelight)\b/, issue: 'Light not working' },
  { test: /\b(switch|socket)\b/, issue: 'Switch or socket fault' },
  { test: /\bgeyser\b/, issue: 'Geyser not working' },
  { test: /\b(flush|toilet|drain|drainage)\b/, issue: 'Bathroom or drainage problem' },
  { test: /\bcupboard\b/, issue: 'Cupboard damaged' },
];
