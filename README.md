# Campus Helpdesk Agent

A Streamlit hackathon demo for **“Designing and building sustainable, intelligent AI agentic systems.”** It turns a limited set of synthetic campus tickets into an auditable, policy-governed workflow rather than a free-form chatbot.

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
4. Explicitly permitted active-ID resets may generate a mock reset link. Payment/refund matters produce a recommendation requiring human confirmation. Warden, Wi-Fi, unknown, missing, and ambiguous policy cases escalate.
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
- identifying people, storing faces/plates, or operating cameras beyond any future counts-only design;
- controlling traffic signals, gates, gate holds, or medical changes;
- bypassing required human approval, closing without evidence, or claiming a recommendation was executed;
- treating an LLM-generated value as authoritative where a tool or policy source is required.

The complete machine-readable list is visible in the Streamlit UI and in [`data/policy.json`](data/policy.json).

## Demo scenarios

- **Easy ID (`DEMO-001`):** `STU001` is checked, then a mock reset link is generated only after policy allows it.
- **Missing fee (`DEMO-002`):** fee status comes from the mock fee tool. No payment, correction, or refund is executed; a human recommendation is prepared.
- **Warden-only (`DEMO-003`):** no automated resolution is attempted; the agent makes a concise escalation brief.

## Sustainability and resource efficiency

The dashboard tracks runtime—not fabricated—metrics for tickets processed, automatic resolutions, escalations, human approval recommendations, human interventions avoided, forbidden actions blocked, incorrect closures, and unnecessary tool calls avoided per result. The intended benefit is avoiding repetitive, low-risk helpdesk work while keeping humans in control; this project makes **no unmeasured carbon-saving claim**.

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
- Future work can add authenticated staff approvals, policy versioning/signatures, durable audit storage, monitored error handling, accessibility testing, and optional aggregate **counts-only** occupancy inputs—never identity recognition.

## Angular frontend (Iteration 1)

The production-facing frontend now lives in [`frontend/`](frontend/). It introduces only two routes:

- `/command-center` — an interactive SVG campus schematic, clearly labeled demo pulse data, Campus AI insight rows, and a future-ready command-bar surface.
- `/investigation/:id` — a route-driven evidence view with a modeled comparison chart, reasoning trail, recommendation, and local-only human approval state.

The Angular UI deliberately consumes data from `frontend/src/app/data/campus-demo.data.ts`; it does **not** claim a connection to energy, water, facilities, or helpdesk services. `agent/api_adapter.py` is a small framework-neutral bridge that preserves the existing Python agent and can be wrapped by a future authenticated API without changing agent logic.

To run the frontend after dependencies are available:

```bash
cd frontend
npm install
npm start
```

The Angular package registry was unavailable in this execution environment, so dependencies could not be installed or the Angular build launched here. The existing Python test suite remains runnable from the repository root.
