"""Streamlit demo for the safe, deterministic Campus Helpdesk Agent."""

import json
import os
from pathlib import Path

import streamlit as st

from agent import CampusHelpdeskAgent, Ticket
from agent.approvals import NO_EXECUTION_NOTE, PENDING, ApprovalError, ApprovalQueue
from agent.audit import AuditLog
from agent.metrics import Metrics
from agent.policy_engine import PolicyEngine, PolicyError
from agent.prompts import SAFETY_NOTICE

ROOT = Path(__file__).parent
POLICY_PATH = ROOT / "data" / "policy.json"

st.set_page_config(page_title="Campus Helpdesk Agent", page_icon="🎓", layout="wide")
st.title("🎓 Campus Helpdesk Agent")
st.caption(
    "An agent that investigates with deterministic tools, lets a policy engine decide, "
    "and hands anything consequential to a human."
)
st.info(SAFETY_NOTICE)


@st.cache_data
def load_json(name: str):
    return json.loads((ROOT / "data" / name).read_text(encoding="utf-8"))


# ---- Session state (initialised once) ------------------------------------
if "metrics" not in st.session_state:
    st.session_state.metrics = Metrics()
    st.session_state.queue = ApprovalQueue()
    st.session_state.result = None
    st.session_state.approval_id = None

audit = AuditLog(os.environ.get("CAMPUS_AUDIT_LOG"))

# ---- Forbidden actions: visible before anything is run -------------------
st.subheader("🚫 What this agent is FORBIDDEN to do")
with st.expander("Loaded from data/policy.json - the agent cannot override these", expanded=True):
    try:
        for item in PolicyEngine(POLICY_PATH).forbidden_actions():
            st.markdown(f"- {item}")
    except PolicyError as exc:
        st.error(
            f"Policy file cannot be trusted ({exc}). "
            "The agent will escalate every ticket to a human until it is fixed."
        )

# ---- Choose a ticket -----------------------------------------------------
st.subheader("1. Choose a ticket")
source = st.radio(
    "Ticket source", ["Demo scenarios", "Red-team cases", "Custom ticket"], horizontal=True, key="source"
)

proposal = None
expected = None
if source == "Demo scenarios":
    demos = load_json("demo_tickets.json")
    picked = st.selectbox(
        "Demo ticket", demos, key="demo_choice",
        format_func=lambda d: f"{d['ticket_id']} — {d['title']}",
    )
    ticket = Ticket(picked["ticket_id"], picked["student_id"], picked["text"])
    expected = picked.get("expected_outcome")
elif source == "Red-team cases":
    cases = load_json("redteam_tickets.json")
    picked = st.selectbox(
        "Red-team case", cases, key="redteam_choice",
        format_func=lambda c: f"{c['id']} — {c['title']}",
    )
    ticket = Ticket(picked["id"], picked["student_id"], picked["text"])
    proposal = picked.get("llm_proposal")
    expected = (picked.get("expect") or {}).get("outcome")
    if proposal:
        st.warning(
            "Simulated UNTRUSTED LLM proposal (will be recorded, then ignored): "
            f"{json.dumps(proposal)}"
        )
else:
    student = st.text_input(
        "Student ID (synthetic, e.g. STU001; leave blank to test missing ID)", key="custom_sid"
    )
    body = st.text_area("Ticket text", key="custom_text", max_chars=2000)
    ticket = Ticket("CUSTOM", student.strip() or None, body)

st.code(ticket.text or "(empty)", language=None)

if st.button("Run Agent", type="primary", key="run_agent"):
    run = CampusHelpdeskAgent().run(ticket, llm_proposal=proposal)
    data = run.to_dict()
    data["expected_outcome"] = expected
    st.session_state.result = data
    st.session_state.metrics.record(run, expected)
    st.session_state.approval_id = (
        st.session_state.queue.submit(run).request_id if run.recommendation else None
    )
    audit.append("ticket_run", data)

# ---- Result --------------------------------------------------------------
result = st.session_state.result
if result:
    st.divider()
    st.subheader("2. What the agent did")
    outcome = result["outcome"]
    if result["forbidden_action_detected"]:
        st.error(f"BLOCKED and escalated: {'; '.join(result['forbidden_actions_matched'])}")
    elif outcome == "RESOLVED_AUTOMATICALLY":
        st.success("Resolved automatically — policy explicitly allowed it and all evidence was present.")
    elif outcome == "DENIED_BY_POLICY":
        st.success("Closed with a policy-based NO — the answer is the policy's own statement; nothing was invented.")
        if result.get("denial"):
            st.write("**Reply to student (quoted from policy):**", result["denial"]["statement"])
    elif outcome == "RECOMMENDATION_REQUIRES_HUMAN":
        st.warning("Recommendation only — NOTHING was executed. A human must confirm.")
    else:
        st.info("Escalated to a human.")

    left, right = st.columns(2)
    with left:
        st.markdown("**Agent trace**")
        for event in result["trace"]:
            st.write(f"• {event}")
        if result["plan"]:
            st.markdown("**Plan**")
            for line in result["plan"]:
                st.write(f"• {line}")
        st.markdown("**Tools called**")
        st.json(result["tools_called"])
        st.markdown("**Tool results (authoritative)**")
        st.json(result["tool_results"])
        if result["tool_errors"]:
            st.markdown("**Tool errors**")
            st.json(result["tool_errors"])
    with right:
        st.metric("Final outcome", outcome)
        st.write("**Category:**", result["category"], "—", "; ".join(result["classification_signals"]) or "no signals")
        st.write("**Policy decision:**", result["policy_decision"], f"({result['policy_code']})")
        st.write(
            "**Policy consulted:**",
            f"{result['policy_version'] or 'n/a'} · rule `{result['policy_rule'] or 'n/a'}` "
            f"· sha {result['policy_sha256'] or 'n/a'}",
        )
        st.write("**Closed without a human:**", "Yes" if result["was_closed_without_human"] else "No")
        st.write("**Human approval required:**", "Yes" if result["human_confirmation_required"] else "No")
        st.write("**Action executed:**", result["action_executed"] or "None")
        st.write("**Escalation reason:**", result["escalation_reason"] or "Not applicable")
        st.write("**Escalation brief:**", result["escalation_brief"] or "Not applicable")
        for label, key in (
            ("Unverified claims", "unverified_claims"),
            ("Discrepancies (tool value wins)", "discrepancies"),
            ("Untrusted input ignored", "untrusted_inputs_ignored"),
        ):
            if result[key]:
                st.markdown(f"**{label}**")
                for line in result[key]:
                    st.write(f"• {line}")

    with st.expander("Audit record (observable facts only; no model reasoning)"):
        st.json(result)

    # ---- Human confirmation ----------------------------------------------
    rec = result["recommendation"]
    if rec:
        st.subheader("3. Human confirmation")
        st.write(rec["summary"])
        st.json({"fee_tool": rec["fee_tool"], "agent_did_not": rec["agent_did_not"]})
        request = st.session_state.queue.requests.get(st.session_state.approval_id)
        if request and request.status == PENDING:
            reviewer = st.text_input("Reviewer name (synthetic)", key="reviewer")
            note = st.text_input("Note", key="review_note")
            approve_col, reject_col = st.columns(2)
            for column, label, approve in (
                (approve_col, "Approve recommendation", True),
                (reject_col, "Reject", False),
            ):
                if column.button(label, key=f"decide_{label}"):
                    try:
                        decided = st.session_state.queue.decide(
                            request.request_id, reviewer, approve, note
                        )
                        audit.append("human_decision", decided.to_dict())
                        st.rerun()
                    except ApprovalError as exc:
                        st.error(str(exc))
        elif request:
            st.success(f"{request.status} by {request.reviewer}. {NO_EXECUTION_NOTE}")

# ---- Metrics -------------------------------------------------------------
st.divider()
st.subheader("Measured operational metrics")
cols = st.columns(4)
for index, (label, value) in enumerate(st.session_state.metrics.summary().items()):
    shown = "—" if value is None else (f"{value:.0%}" if isinstance(value, float) else value)
    cols[index % 4].metric(label, shown)
st.caption(
    "Closed-without-human = auto-resolved or denied by an explicit policy rule. Closed-wrong = closed without a human "
    "although the labelled expected outcome differs. Counted from runs in this session. "
    "No carbon or energy savings are claimed because none are measured."
)
