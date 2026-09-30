import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ActionDraft, AgentReply, StudentRequest } from '../models/campus.models';
import { MockCampusAgentApi } from './mock-campus-agent.api';

/**
 * Contract between the UI and the campus agent.
 *
 * The default implementation is a deterministic in-browser mock. To connect the real Python agent
 * (see agent/api_adapter.py), implement this class with HttpClient calls and change `useClass`.
 * The UI never submits anything itself: `submitRequest` is only called after explicit confirmation.
 */
@Injectable({ providedIn: 'root', useClass: MockCampusAgentApi })
export abstract class CampusAgentApi {
  /** Free-text message from the student. `awaiting` is the slot the agent asked about last. */
  abstract respond(text: string, awaiting?: AgentReply['awaiting']): Observable<AgentReply>;
  /** A tapped action chip (e.g. "bonafide.start"). */
  abstract perform(actionId: string): Observable<AgentReply>;
  /** Opens the assistant with a service menu or a topic (`?context=`). */
  abstract openContext(context: string | null): Observable<AgentReply>;
  /** Shows the status of an existing request. */
  abstract openRequest(requestId: string): Observable<AgentReply>;
  /** Creates the request. Only called after the student confirms the prepared draft. */
  abstract submitRequest(draft: ActionDraft): Observable<StudentRequest>;
}
