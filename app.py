"""Streamlit demo for the safe, deterministic Campus Helpdesk Agent."""
import json
from pathlib import Path

import streamlit as st

from agent import CampusHelpdeskAgent, Ticket
from agent.prompts import SAFETY_NOTICE
from agent.policy_engine import PolicyEngine

ROOT = Path(__file__).parent

st.set_page_config(page_title="Campus Helpdesk Agent", page_icon="🎓", layout="wide")
st.title("🎓 Campus Helpdesk Agent")
st.caption("A policy-governed, deterministic workflow for synthetic campus support tickets.")
st.info(SAFETY_NOTICE)

@st.cache_data
def demo_tickets():
    return json.loads((ROOT / "data" / "demo_tickets.json").read_text(encoding="utf-8"))

if "metrics" not in st.session_state:
    st.session_state.metrics = {key: 0 for key in ("processed", "resolved", "escalated", "recommendations", "avoided", "blocked", "incorrect", "tool_calls_avoided")}

tickets = demo_tickets()
choice = st.selectbox("Demo ticket", tickets, format_func=lambda item: f"{item['ticket_id']} — {item['title']}")
st.subheader("Ticket contents")
st.code(choice["text"], language=None)

if st.button("Run Agent", type="primary"):
    output = CampusHelpdeskAgent().run(Ticket(choice["ticket_id"], choice["student_id"], choice["text"]))
    st.session_state.result = output.to_dict()
    m = st.session_state.metrics
    m["processed"] += 1
    m["resolved"] += output.outcome.value == "RESOLVED_AUTOMATICALLY"
    m["escalated"] += output.outcome.value == "ESCALATED"
    m["recommendations"] += output.outcome.value == "RECOMMENDATION_REQUIRES_HUMAN"
    m["avoided"] += int(output.was_closed_without_human)
    m["blocked"] += int(output.forbidden_action_detected)
    m["incorrect"] += int(output.was_closed_wrong)
    m["tool_calls_avoided"] += output.unnecessary_tool_calls_avoided

st.subheader("Runtime metrics")
labels = [("Tickets processed", "processed"), ("Automatically resolved", "resolved"), ("Escalated", "escalated"), ("Human approval recommendations", "recommendations"), ("Human interventions avoided", "avoided"), ("Forbidden actions blocked", "blocked"), ("Incorrect closures", "incorrect"), ("Unnecessary tool calls avoided", "tool_calls_avoided")]
cols = st.columns(4)
for index, (label, key) in enumerate(labels):
    cols[index % 4].metric(label, st.session_state.metrics[key])

if result := st.session_state.get("result"):
    st.divider()
    left, right = st.columns(2)
    with left:
        st.subheader("Agent activity timeline")
        for event in result["trace"]:
            st.write(f"• {event}")
        st.subheader("Tool calls")
        st.json(result["tools_called"])
        st.subheader("Tool results")
        st.json(result["tool_results"])
    with right:
        st.subheader("Decision")
        st.metric("Final outcome", result["outcome"])
        st.write("**Policy decision:**", result["policy_decision"])
        st.write("**Human approval required:**", "Yes" if result["human_confirmation_required"] else "No")
        st.write("**Escalation reason:**", result["escalation_reason"] or "Not applicable")
        st.write("**Escalation brief:**", result["escalation_brief"] or "Not applicable")

st.divider()
st.subheader("What this agent cannot do")
st.caption("These restrictions are loaded from policy data and cannot be overridden by the agent.")
for forbidden in PolicyEngine(ROOT / "data" / "policy.json").forbidden_actions():
    st.write(f"• {forbidden}")
