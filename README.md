# Campus Helpdesk Agent

A Streamlit demo of a **campus helpdesk agent** for ID-card, hostel-bill and Wi-Fi tickets. It reads a ticket, calls mock tools (ID status, fee status, reset link), and either closes the ticket when the policy file allows it, closes it with the policy's own "no", or escalates to a human with a brief. It is an auditable, policy-governed workflow rather than a free-form chatbot.

> **Safety statement:** The demo uses synthetic/mock data and does not connect to real financial, medical, identity, traffic, gate, or campus-control systems.

## Problem and solution

Repeated helpdesk requests consume staff time, while fee, refund, welfare, and warden cases can be consequential. This MVP investigates routine requests with deterministic Python tools, obtains an authorization decision from policy data, and either resolves a narrowly authorized action or prepares a human handoff. It never treats model-style text as proof, policy, or a tool result.

## Architecture and agent loop

```text
Ticket → deterministic classification → required information → local Python tool
      → tool result → JSON policy engine → authorization decision
      → allowed: complete a safe mock action | human required: recommendation | unknown: escalate
```

1. The agent identifies a ticket category and required evidence.
2. It calls only the relevant deterministic synthetic tool(s).
3. `PolicyEngine` reads `data/policy.json`; it is the authorization boundary, not an LLM prompt.
4. Explicitly permitted active-ID resets may generate a mock reset link. Payment/refund matters produce a recommendation requiring human confirmation, **unless the policy file contains an explicit `DENY` rule with a `statement`**, in which case the agent closes the ticket with that statement quoted verbatim (`DENIED_BY_POLICY`). Warden, Wi-Fi, unknown, missing, and ambiguous policy cases escalate.
5. A structured result records observable trace events, tool calls/results, policy decision, escalation brief, and closure-safety fields.

## Deterministic demo tools

| Tool | Purpose | Safety boundary |
| --- | --- | --- |
| `check_id_status(student_id)` | Looks up a fake ID such as `STU001`. | Local synthetic dictionary only. |
| `check_fee_status(student_id, fee_type)` | Returns mock fee status and any mock amount. | Amounts come only from `tools/fee_status.py`. |
| `generate_reset_link(student_id)` | Produces a `demo.campus.local` URL. | Mock URL only; no identity system is contacted. |

## Human-in-the-loop and policy

`data/policy.json` is data, not a hidden prompt. Automatic work is permitted only for the explicit `generate_id_reset_link` action after an **active** tool result. A payment or refund request is never executed: it becomes `RECOMMENDATION_REQUIRES_HUMAN`. Warden-only cases are always escalated. Missing, invalid, or ambiguous policy also escalates.

### What this agent cannot do

The policy explicitly forbids the agent from:

- inventing payment/fee amounts, refund rules, deadlines, policy, or tool results;
- modifying real financial accounts, processing payments, or issuing unapproved refunds;
- accessing real bank, medical, or identity records;
- identifying people, storing faces/plates, or operating cameras;
- controlling traffic signals, gates, gate holds, or medical changes;
- bypassing required human approval, closing without evidence, or claiming a recommendation was executed;
- treating an LLM-generated value as authoritative where a tool or policy source is required.

The complete machine-readable list is visible in the Streamlit UI and in [`data/policy.json`](data/policy.json).

## Demo scenarios

- **Easy ID (`DEMO-001`):** `STU001` is checked, then a mock reset link is generated only after policy allows it.
- **Missing fee (`DEMO-002`):** fee status comes from the mock fee tool. No payment, correction, or refund is executed; a human recommendation is prepared.
- **Warden-only (`DEMO-003`):** no automated resolution is attempted; the agent makes a concise escalation brief.
- **Refund request (`DEMO-004`):** with the shipped policy this is a human recommendation. To show the correct **no**, paste the official no-refund clause into `data/policy.json`:
  `"refund": {"decision": "DENY", "statement": "<official policy text>"}`. The agent never writes a refund rule itself; a `DENY` rule with no statement escalates.

## Sustainability and resource efficiency

The dashboard tracks runtime—not fabricated—metrics for tickets processed, **closed-without-human** (auto-resolved or denied by an explicit policy rule), **closed-wrong** (closed without a human although the labelled `expected_outcome` in the ticket data differs), escalations, human approval recommendations, forbidden actions blocked, and unnecessary tool calls avoided. The intended benefit is avoiding repetitive, low-risk helpdesk work while keeping humans in control; this project makes **no unmeasured carbon-saving claim**.

## Setup and run

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
streamlit run app.py
```

Open the local URL printed by Streamlit, choose a demo ticket, and select **Run Agent**.

## Testing

```bash
pytest -q
```

The test suite covers all tools, policy authorization, forbidden actions, all demo flows, missing/ambiguous policy, tool failure, missing student IDs, refund/payment requests, attempted invented amounts, and attempted human-approval bypass.

## Known limitations and future work

- Classifying is intentionally small and deterministic; production use needs a reviewed taxonomy and authenticated, privacy-preserving integrations.
- Policy rules are starter safety rules, not institutional policy. Replace the JSON only through an approved governance process.
- There is no persistent ticket store or real human-approval workflow in this demo.
- Future work can add authenticated staff approvals, policy versioning/signatures, durable audit storage, monitored error handling, and accessibility testing.

## Angular frontend — SRM Campus Assist

The student-facing frontend lives in [`frontend/`](frontend/) (Angular 19, standalone components, signals). It has **two primary screens**; every service and request workflow happens inside the assistant:

- `/home` — Student Home: greeting, primary "Ask anything about SRMIST…" input, suggested prompts, quick services, *Campus today*, recent requests.
- `/assistant` — AI Campus Assistant. Entry points: `?q=<text>` (typed/suggested question), `?context=<service-or-topic>` (service card), `?request=<id>` (recent request).

The assistant shows the agent loop on every reply (understood → retrieved → recommended → your confirmation) and prepares actions as inline cards. **Nothing is submitted without an explicit "Confirm Request"**; the card then turns into a "Request Submitted" state without leaving `/assistant`.

**All campus content in the UI is demo data** (`src/app/data/*.demo.ts`): no real SRMIST policies, fees, deadlines, contacts or URLs. Request IDs are prefixed `DEMO-`.

### Screen 3 — My Requests (`/requests`)

A student-facing request tracker (not an admin dashboard) that closes the loop **Discover → Ask → Act → Track**:

- Compact summary (Total / In Progress / Completed / Awaiting Action), filters, and request cards with category, title, description, request ID, status, timestamp and an **"Created with Campus Assist · Confirmed by you"** provenance line.
- **View Details** opens a side drawer (bottom sheet on mobile), not another page: fields, a progress timeline, "Last updated…", and how the request was created. It is a focus-trapped dialog (Esc, scrim click and Close all dismiss it and return focus).
- **Open Assistant** goes to `/assistant?request=<id>`; the empty state's **Ask Campus Assist** goes to `/assistant`.
- Shares the `campus-header` component with Home (My Requests is the active nav item). The nav is also shown on mobile.
- "Completed" includes *Resolved*; "In Progress" includes newly *Submitted* requests.
- Requests are stored by id, so re-creating a demo id (e.g. confirming the hostel request in the assistant, which issues `DEMO-HT-1042`) replaces the seeded entry instead of duplicating it.
- Timelines for newly created requests only mark the first stage done; later stages are not claimed until a real backend reports them.

Backend-ready seams: components depend only on `CampusDataService`, `RequestStoreService` and the abstract `CampusAgentApi` (`services/campus-agent.api.ts`). The default `MockCampusAgentApi` is a deterministic in-browser agent; to use the Python agent, implement `CampusAgentApi` with `HttpClient` calls (see `agent/api_adapter.py`) and change its `useClass`.

```bash
cd frontend
npm install
npm start        # http://localhost:4200
npm run build
```
