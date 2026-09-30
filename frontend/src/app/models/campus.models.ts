/** Domain models for SRM Campus Assist. Shapes mirror what a real backend would return. */

export type IconName =
  | 'bell' | 'arrow-left' | 'arrow-right' | 'arrow-up' | 'search' | 'sparkles' | 'check' | 'check-circle'
  | 'clock' | 'map-pin' | 'wifi' | 'pencil' | 'shield-check' | 'chevron-right' | 'refresh' | 'alert-circle'
  | 'x' | 'inbox' | 'graduation-cap' | 'bed' | 'bus' | 'file-text' | 'wallet' | 'book-open' | 'cross' | 'wrench'
  | 'list-checks' | 'play';

export interface StudentProfile {
  id: string;
  firstName: string;
  fullName: string;
  initials: string;
  program: string;
  hostelBlock: string;
  room: string;
  isDemo: boolean;
}

export interface ServiceTopic { label: string; context: string; }

export interface CampusService {
  id: string;
  title: string;
  description: string;
  icon: IconName;
  /** Assistant context opened when the whole card is clicked. */
  context: string;
  topics: ServiceTopic[];
}

export type StatusTone = 'ok' | 'info' | 'warn';

export interface CampusStatusItem {
  id: string;
  label: string;
  value: string;
  tone: StatusTone;
  icon: IconName;
}

export type RequestStatus = 'Submitted' | 'In Review' | 'In Progress' | 'Awaiting Action' | 'Completed' | 'Resolved';

export interface RequestEvent { status: RequestStatus; at: string; note: string; }

export type TimelineState = 'done' | 'current' | 'todo';
export interface TimelineStep { label: string; state: TimelineState; at?: string; }

/** How a request came to exist. Requests are only ever created after the student confirms a prepared draft. */
export interface RequestOrigin { via: 'assistant'; confirmedByStudent: boolean; confirmedAt: string; }

export interface StudentRequest {
  id: string;
  title: string;
  serviceId: string;
  status: RequestStatus;
  updatedAt: string;
  summary: string;
  details: { label: string; value: string }[];
  history: RequestEvent[];
  isDemo: boolean;
  /** Short line under the title, e.g. the issue ("Leaking tap"). */
  issue?: string;
  /** Muted context line, e.g. a location or route. */
  description?: string;
  /** When the student submitted it. Falls back to the first history event. */
  submittedAt?: string;
  /** Progress shown on My Requests. */
  timeline?: TimelineStep[];
  origin?: RequestOrigin;
}

export interface CampusNotification {
  id: string;
  text: string;
  at: string;
  unread: boolean;
  requestId?: string;
}

/* ---------- Assistant ---------- */

export interface AgentStep {
  id: string;
  label: string;
  detail: string;
  state: 'done' | 'active';
}

export interface ActionChip { id: string; label: string; primary?: boolean; icon?: IconName; }

export interface InfoPanel {
  title: string;
  kind: 'steps' | 'checklist';
  items: string[];
  note: string;
}

export interface DraftField {
  key: string;
  label: string;
  value: string;
  editable: boolean;
  options?: string[];
}

export type DraftStatus = 'ready' | 'submitting' | 'submitted' | 'error';

export interface ActionDraft {
  workflowId: string;
  title: string;
  fields: DraftField[];
  status: DraftStatus;
  requestId?: string;
  error?: string;
}

export interface ChatMessage {
  id: number;
  role: 'student' | 'agent';
  text: string;
  at: Date;
  steps?: AgentStep[];
  info?: InfoPanel;
  draft?: ActionDraft;
  request?: StudentRequest;
  actions?: ActionChip[];
  /** Tappable suggestions that are sent as the student's next message. */
  options?: string[];
  followUps?: string[];
  isError?: boolean;
  retryText?: string;
}

/** What the agent API returns; the session adds id/role/time. */
export interface AgentReply {
  text: string;
  steps?: AgentStep[];
  info?: InfoPanel;
  draft?: ActionDraft;
  request?: StudentRequest;
  actions?: ActionChip[];
  options?: string[];
  followUps?: string[];
  /** Slot the agent is waiting on, e.g. the description of a maintenance issue. */
  awaiting?: 'maintenance-issue';
  topic?: string;
}

export interface KnowledgeEntry {
  id: string;
  service: string;
  title: string;
  keywords: string[];
  answer: string;
  retrieved: string;
  followUps: string[];
  workflow?: 'hostel-maintenance' | 'bonafide';
}

export interface WorkflowConfig {
  title: string;
  requestTitle: string;
  idPrefix: string;
  serviceId: string;
  /** Stages shown on the request timeline, in order. */
  steps: string[];
}
