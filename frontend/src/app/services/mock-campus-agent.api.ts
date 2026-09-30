import { Injectable, inject } from '@angular/core';
import { Observable, map, timer } from 'rxjs';
import {
  ActionChip, ActionDraft, AgentReply, AgentStep, DraftField, InfoPanel, KnowledgeEntry, StudentRequest,
} from '../models/campus.models';
import { ISSUE_PATTERNS, KNOWLEDGE, SERVICE_MENUS, WORKFLOWS } from '../data/knowledge.demo';
import { SUGGESTED_PROMPTS } from '../data/services.demo';
import { normalize, sentenceCase } from '../utils/text';
import { CampusDataService } from './student.service';
import type { CampusAgentApi } from './campus-agent.api';
import { RequestStoreService } from './request-store.service';

const REPLY_DELAY_MS = 750;
const SUBMIT_DELAY_MS = 900;

/**
 * Deterministic demo agent: keyword intent matching over demo knowledge, with structured
 * "prepare an action" replies. It never submits anything without a separate confirm call.
 */
@Injectable()
export class MockCampusAgentApi implements CampusAgentApi {
  private data = inject(CampusDataService);
  private store = inject(RequestStoreService);

  respond(text: string, awaiting?: AgentReply['awaiting']): Observable<AgentReply> {
    return this.later(() => this.interpret(text, awaiting));
  }

  perform(actionId: string): Observable<AgentReply> {
    return this.later(() => this.action(actionId));
  }

  openContext(context: string | null): Observable<AgentReply> {
    return this.later(() => this.context(context));
  }

  openRequest(requestId: string): Observable<AgentReply> {
    return this.later(() => this.requestReply(requestId));
  }

  submitRequest(draft: ActionDraft): Observable<StudentRequest> {
    return timer(SUBMIT_DELAY_MS).pipe(map(() => {
      const workflow = WORKFLOWS[draft.workflowId];
      if (!workflow) throw new Error('Unknown workflow');
      if (draft.fields.some(f => !f.value.trim())) throw new Error('Some details are missing.');
      const now = new Date().toISOString();
      const id = this.store.nextId(workflow.idPrefix);
      const value = (key: string) => draft.fields.find(f => f.key === key)?.value;
      const request: StudentRequest = {
        id, title: workflow.requestTitle, serviceId: workflow.serviceId, status: 'Submitted', updatedAt: now,
        issue: value('issue'),
        description: value('location') ?? (value('purpose') ? `Purpose: ${value('purpose')}` : undefined),
        submittedAt: now,
        summary: draft.fields.filter(f => f.key !== 'priority').map(f => f.value).join(' · '),
        details: draft.fields.map(f => ({ label: f.label, value: f.value })),
        history: [{ status: 'Submitted', at: now, note: 'Request created after your confirmation.' }],
        // Only the first stage is done; nothing later is claimed until a real backend reports it.
        timeline: workflow.steps.map((label, i) => ({ label, state: i === 0 ? 'done' : i === 1 ? 'current' : 'todo', ...(i === 0 ? { at: now } : {}) })),
        // submitRequest is only ever called after the student presses "Confirm Request".
        origin: { via: 'assistant', confirmedByStudent: true, confirmedAt: now },
        isDemo: true,
      };
      this.store.add(request);
      return request;
    }));
  }

  /* ---------------- interpretation ---------------- */

  private later<T>(fn: () => T): Observable<T> {
    return timer(REPLY_DELAY_MS).pipe(map(fn));
  }

  private interpret(text: string, awaiting?: AgentReply['awaiting']): AgentReply {
    const norm = normalize(text);
    if (awaiting === 'maintenance-issue') {
      const issue = this.detectIssue(norm);
      const best = this.match(norm);
      const changedTopic = !issue && best && best.workflow !== 'hostel-maintenance' && best.id !== 'greeting';
      if (!changedTopic) {
        if (issue) return this.maintenanceDraft(issue, text);
        if (norm.length >= 4 && norm !== 'something else') return this.maintenanceDraft(sentenceCase(text).slice(0, 120), text);
        return this.askIssue('Describe the problem in a sentence and I will prepare the request for you.');
      }
    }
    const entry = this.match(norm);
    if (!entry) return this.fallback();
    return this.fromEntry(entry, text, norm);
  }

  private match(norm: string): KnowledgeEntry | undefined {
    const padded = ` ${norm} `;
    let best: { entry: KnowledgeEntry; score: number } | undefined;
    for (const entry of KNOWLEDGE) {
      let score = 0;
      for (const kw of entry.keywords) if (padded.includes(` ${kw} `)) score += kw.length;
      if (entry.workflow) score *= 2;
      if (score > 0 && (!best || score > best.score)) best = { entry, score };
    }
    return best?.entry;
  }

  private fromEntry(entry: KnowledgeEntry, text: string, norm: string): AgentReply {
    switch (entry.id) {
      case 'hostel-maintenance': {
        const issue = this.detectIssue(norm);
        return issue ? this.maintenanceDraft(issue, text) : this.askIssue();
      }
      case 'bonafide': return this.bonafideReply(entry);
      case 'greeting': return this.welcome();
      case 'my-requests': return this.requestList(entry);
      default: return this.infoReply(entry);
    }
  }

  private detectIssue(norm: string): string | undefined {
    return ISSUE_PATTERNS.find(p => p.test.test(norm))?.issue;
  }

  /* ---------------- replies ---------------- */

  private steps(understood: string, retrieved: string, recommended: string, waiting?: string): AgentStep[] {
    const list: AgentStep[] = [
      { id: 'understand', label: 'Understood', detail: understood, state: 'done' },
      { id: 'retrieve', label: 'Retrieved', detail: retrieved, state: 'done' },
      { id: 'recommend', label: 'Recommended', detail: recommended, state: 'done' },
    ];
    if (waiting) list.push({ id: 'confirm', label: 'Your confirmation', detail: waiting, state: 'active' });
    return list;
  }

  private welcome(): AgentReply {
    return {
      text: `Hi ${this.data.student.firstName}, I'm Campus Assist — an AI service agent for SRMIST Kattankulathur. I can answer questions, find campus services, and prepare requests for you to confirm.`,
      options: SUGGESTED_PROMPTS,
    };
  }

  private context(context: string | null): AgentReply {
    if (!context) return this.welcome();
    const menu = SERVICE_MENUS[context];
    if (menu) {
      return {
        text: `What do you need help with regarding ${menu.title}?`,
        steps: this.steps(`Service selected · ${menu.title}`, `${menu.title} workflows and information`, 'Choose an option to continue'),
        options: menu.options,
        topic: menu.title,
      };
    }
    const entry = KNOWLEDGE.find(e => e.id === context);
    if (!entry) return this.welcome();
    return { ...this.fromEntry(entry, entry.title, normalize(entry.title)), topic: entry.title };
  }

  private infoReply(entry: KnowledgeEntry): AgentReply {
    return {
      text: entry.answer,
      steps: entry.retrieved ? this.steps(entry.title, entry.retrieved, 'Share guidance') : undefined,
      followUps: entry.followUps,
      topic: entry.title,
    };
  }

  private fallback(): AgentReply {
    return {
      text: "I couldn't match that to a campus service yet — this demo assistant covers a limited set of topics. Try one of these, or pick a service from Home.",
      options: ['Report maintenance issue', 'Bonafide certificate', 'Shuttle timings', 'Track my requests'],
    };
  }

  private askIssue(text = "Happy to help you report a hostel maintenance issue. What's the problem?"): AgentReply {
    return {
      text,
      steps: [
        { id: 'understand', label: 'Understood', detail: 'Hostel maintenance request', state: 'done' },
        { id: 'retrieve', label: 'Retrieved', detail: 'Maintenance workflow · your room from profile (demo)', state: 'done' },
        { id: 'recommend', label: 'Next', detail: 'Need the issue to prepare a request', state: 'active' },
      ],
      options: ['Leaking tap', 'Fan not working', 'Light not working', 'Something else'],
      awaiting: 'maintenance-issue',
      topic: 'Hostel maintenance',
    };
  }

  private maintenanceDraft(issue: string, raw: string): AgentReply {
    const s = this.data.student;
    const room = /\broom\s*(?:no\.?\s*)?(\d{2,4})\b/i.exec(raw)?.[1];
    const block = /\b([a-z])\s*block\b|\bblock\s*([a-z])\b/i.exec(raw);
    const blockName = block ? `${(block[1] ?? block[2]).toUpperCase()} Block` : s.hostelBlock;
    const location = `${blockName} · Room ${room ?? s.room.replace(/^Room\s*/i, '')}`;
    const fields: DraftField[] = [
      { key: 'location', label: 'Location', value: location, editable: true },
      { key: 'issue', label: 'Issue', value: issue, editable: true },
      { key: 'priority', label: 'Priority', value: 'Normal', editable: true, options: ['Normal', 'Urgent'] },
    ];
    return {
      text: "I can help you report this to hostel maintenance. I've filled in what I know — please review it before anything is submitted.",
      steps: this.steps('Hostel maintenance issue', 'Maintenance workflow · your room from profile (demo)', 'Prepare a maintenance request', 'Awaiting your confirmation'),
      draft: { workflowId: 'hostel-maintenance', title: WORKFLOWS['hostel-maintenance'].title, fields, status: 'ready' },
      followUps: ['What happens after I confirm?', 'Track my requests'],
      topic: 'Hostel maintenance',
    };
  }

  private bonafideReply(entry: KnowledgeEntry): AgentReply {
    const actions: ActionChip[] = [
      { id: 'bonafide.process', label: 'View Process', icon: 'list-checks' },
      { id: 'bonafide.documents', label: 'Required Documents', icon: 'file-text' },
      { id: 'bonafide.start', label: 'Start Request', icon: 'play', primary: true },
    ];
    return {
      text: entry.answer,
      steps: this.steps('Bonafide certificate', entry.retrieved, 'Guide through the process'),
      actions,
      followUps: entry.followUps,
      topic: 'Bonafide certificate',
    };
  }

  private requestList(entry: KnowledgeEntry): AgentReply {
    return {
      text: entry.answer,
      steps: this.steps('Request status check', entry.retrieved, 'Show your requests'),
      actions: this.store.recent().slice(0, 4).map(r => ({ id: `request:${r.id}`, label: `${r.title} · ${r.status}` })),
      topic: 'My requests',
    };
  }

  private requestReply(requestId: string): AgentReply {
    const request = this.store.byId(requestId);
    if (!request) {
      return { text: "I couldn't find that request. Here are your recent ones.", actions: this.store.recent().slice(0, 4).map(r => ({ id: `request:${r.id}`, label: `${r.title} · ${r.status}` })) };
    }
    return {
      text: `Here's the latest on your ${request.title.toLowerCase()} request.`,
      steps: [
        { id: 'understand', label: 'Understood', detail: 'Request status check', state: 'done' },
        { id: 'retrieve', label: 'Retrieved', detail: `Request ${request.id}`, state: 'done' },
        { id: 'track', label: 'Tracking', detail: 'I will keep updates here', state: 'active' },
      ],
      request,
      actions: [{ id: 'ask-else', label: 'Ask something else' }],
      topic: request.title,
    };
  }

  private action(actionId: string): AgentReply {
    if (actionId.startsWith('request:')) return this.requestReply(actionId.slice('request:'.length));
    switch (actionId) {
      case 'bonafide.process': {
        const info: InfoPanel = {
          title: 'Bonafide certificate · how it works',
          kind: 'steps',
          items: ['I prepare the request with your details.', 'You review and confirm it.', 'Student Services reviews the request.', 'I track the status and update you here.'],
          note: 'Demo guidance — not the official SRMIST procedure. Student Services confirms the real steps.',
        };
        return { text: "Here's how a bonafide request works in Campus Assist.", info, actions: this.bonafideActions('bonafide.process'), followUps: ['How long does it take?'] };
      }
      case 'bonafide.documents': {
        const info: InfoPanel = {
          title: 'Bonafide certificate · what to have ready',
          kind: 'checklist',
          items: ['Your student ID card', 'The purpose of the certificate', 'Anything else Student Services asks for during review'],
          note: 'Demo checklist — the official list may differ. Student Services confirms what is required.',
        };
        return { text: 'This is what to have ready before you start.', info, actions: this.bonafideActions('bonafide.documents') };
      }
      case 'bonafide.start': return this.bonafideDraft();
      case 'ask-else':
        return { text: 'Of course — what else can I help with?', options: SUGGESTED_PROMPTS };
      default: return this.fallback();
    }
  }

  private bonafideActions(current: string): ActionChip[] {
    const all: ActionChip[] = [
      { id: 'bonafide.process', label: 'View Process', icon: 'list-checks' },
      { id: 'bonafide.documents', label: 'Required Documents', icon: 'file-text' },
      { id: 'bonafide.start', label: 'Start Request', icon: 'play', primary: true },
    ];
    return all.filter(a => a.id !== current);
  }

  private bonafideDraft(): AgentReply {
    const fields: DraftField[] = [
      { key: 'certificate', label: 'Certificate', value: 'Bonafide certificate', editable: false },
      { key: 'purpose', label: 'Purpose', value: 'General purpose', editable: true },
      { key: 'requestedBy', label: 'Requested by', value: this.data.student.fullName, editable: false },
    ];
    return {
      text: "I've prepared a bonafide certificate request. Add the purpose if you know it, then confirm when you're ready.",
      steps: this.steps('Start bonafide request', 'Student Services · certificates (demo guidance)', 'Prepare a certificate request', 'Awaiting your confirmation'),
      draft: { workflowId: 'bonafide', title: WORKFLOWS['bonafide'].title, fields, status: 'ready' },
      followUps: ['What happens after I confirm?'],
      topic: 'Bonafide certificate',
    };
  }
}
