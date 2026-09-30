/**
 * Centralised ticket model for the Admin Console.
 * The Student app and a real backend will plug into the same shape in the next phases
 * (see TicketService — it is the only place that owns ticket data).
 */
export type TicketStatus = 'Open' | 'In Progress' | 'Resolved' | 'Escalated' | 'Needs Review';
export type TicketPriority = 'Urgent' | 'High' | 'Medium' | 'Low';
export type Department = 'Hostel' | 'Academics' | 'Accounts & Fees' | 'Transport' | 'IT Services' | 'Administration';
export type TicketCategory =
  | 'Hostel Maintenance' | 'Fee / Payment' | 'ID Card' | 'Transport' | 'Academic Request'
  | 'IT Support' | 'Examination' | 'Library' | 'Administration';

export const STATUSES: TicketStatus[] = ['Open', 'In Progress', 'Resolved', 'Escalated', 'Needs Review'];
export const PRIORITIES: TicketPriority[] = ['Urgent', 'High', 'Medium', 'Low'];
export const DEPARTMENTS: Department[] = ['Hostel', 'Academics', 'Accounts & Fees', 'Transport', 'IT Services', 'Administration'];
export const CATEGORIES: TicketCategory[] = [
  'Hostel Maintenance', 'Fee / Payment', 'ID Card', 'Transport', 'Academic Request',
  'IT Support', 'Examination', 'Library', 'Administration',
];

/** Confidence below this value sends a ticket to the admin for review. */
export const LOW_CONFIDENCE = 75;
/** A ticket is "SLA at risk" when it is unresolved and due within this many hours (or overdue). */
export const SLA_WARNING_HOURS = 6;

export interface TicketStudent { name: string; regNo: string; program: string; }

export interface AiClassification {
  intent: string;
  category: TicketCategory;
  suggestedDepartment: Department;
  suggestedAction: string;
}

export type ActivityActor = 'Student' | 'AI' | 'System' | 'Admin';
export interface TicketActivity { at: string; actor: ActivityActor; text: string; }

export interface Ticket {
  id: string;
  student: TicketStudent;
  title: string;
  description: string;
  category: TicketCategory;
  department: Department;
  priority: TicketPriority;
  status: TicketStatus;
  /** 0–100 */
  aiConfidence: number;
  aiClassification: AiClassification;
  /** Why the AI chose this priority. */
  aiReasoning: string;
  /** Short note explaining uncertainty (shown when confidence is low). */
  aiNote?: string;
  assignedTo: string | null;
  createdAt: string;
  updatedAt: string;
  slaDueAt: string;
  /** How many times the student has raised this issue. */
  repeatCount: number;
  /** Set while the admin is waiting for information from the student. */
  missingInfo?: string;
  escalationReason?: string;
  resolution?: string;
  resolvedAt?: string;
  activity: TicketActivity[];
}

export type AttentionKind = 'escalated' | 'sla' | 'low-confidence' | 'repeated' | 'missing-info';
export interface AttentionItem { ticket: Ticket; kind: AttentionKind; reason: string; action: string; }

export interface TicketFilters { status: TicketStatus | ''; priority: TicketPriority | ''; department: Department | ''; category: TicketCategory | ''; search: string; }

/** Teams an admin can assign to, grouped by department. */
export const ASSIGNEES: { department: Department; teams: string[] }[] = [
  { department: 'Hostel', teams: ['Hostel Maintenance Team', 'Warden Office'] },
  { department: 'Academics', teams: ['Academic Section', 'Exam Cell'] },
  { department: 'Accounts & Fees', teams: ['Accounts Desk'] },
  { department: 'Transport', teams: ['Transport Office'] },
  { department: 'IT Services', teams: ['IT Service Desk'] },
  { department: 'Administration', teams: ['Registrar Office', 'Library Desk', 'ID Card Counter'] },
];
