"""Deterministic plan -> act -> observe orchestration for campus-helpdesk tickets.

Authorization never comes from this module or from any language model. The
flow is: guardrails -> classify -> plan -> deterministic tools (validated) ->
policy engine -> closure gate -> outcome. Any doubt ends in escalation.
"""

import re
from pathlib import Path
from typing import Any, Callable

from tools import check_fee_status, check_id_status, generate_reset_link

from . import guardrails
from .models import AgentResult, Outcome, Ticket
from .policy_engine import PolicyEngine

ROOT = Path(__file__).resolve().parents[1]
STUDENT_ID_FORMAT = re.compile(r"^[A-Za-z]{3,4}[0-9]{3,}$")
MAX_TICKET_CHARS = 2000
ALL_TOOLS = ("check_id_status", "check_fee_status", "generate_reset_link")
RESET_LINK_PREFIX = "https://demo.campus.local/"

# Deterministic keyword taxonomy (whole words only). "hostel" alone is NOT a fee signal.
CATEGORY_PATTERNS: dict[str, list[str]] = {
    "warden_only": [r"\bwarden\b", r"\broom ?mates?\b", r"\bharass\w*", r"\bragging\b", r"\bbull(?:y|ied|ying)\b",
                    r"\bthreat\w*", r"\bassault\w*", r"\bunsafe\b", r"\bwelfare\b", r"\bcurfew\b"],
    "refund": [r"\brefunds?\b", r"\brefunded\b", r"\bmoney back\b"],
    "wifi": [r"\bwi-?fi\b", r"\binternet\b", r"\brouter\b", r"\bnetwork\b"],
    "hostel_fee": [r"\bfees?\b", r"\bpaid\b", r"\bpay(?:ment|ments)?\b", r"\bdues?\b", r"\bunpaid\b"],
    "id_issue": [r"\bid\b", r"\bid[- ]?card\b", r"\bstudent id\b", r"\bidentity card\b", r"\bsmart card\b"],
}

# Required evidence and tools per category: this is the agent's visible plan.
PLANS: dict[str, dict[str, Any]] = {
    "id_issue": {"needs": ["student_id"], "tools": ["check_id_status"], "then": "generate_reset_link if policy allows"},
    "hostel_fee": {"needs": ["student_id"], "tools": ["check_fee_status"], "then": "prepare recommendation for human"},
    "refund": {"needs": ["student_id"], "tools": ["check_fee_status"], "then": "prepare recommendation for human"},
    "warden_only": {"needs": [], "tools": [], "then": "escalate; no automation permitted"},
    "wifi": {"needs": [], "tools": [], "then": "escalate; no Wi-Fi tool is authorized"},
    "unknown": {"needs": [], "tools": [], "then": "escalate; category not recognized"},
}


class ToolFailure(Exception):
    pass


def _validate_id_status(payload: Any, student_id: str) -> dict:
    if not isinstance(payload, dict) or payload.get("student_id") != student_id:
        raise ToolFailure("check_id_status returned an invalid or mismatched record")
    if not isinstance(payload.get("status"), str) or not payload["status"]:
        raise ToolFailure("check_id_status returned no status")
    return payload


def _validate_fee(payload: Any, student_id: str) -> dict:
    if not isinstance(payload, dict) or payload.get("student_id") != student_id:
        raise ToolFailure("check_fee_status returned an invalid or mismatched record")
    amount = payload.get("amount_due")
    if not isinstance(payload.get("paid"), bool) or isinstance(amount, bool) or not isinstance(amount, (int, float)) or amount < 0:
        raise ToolFailure("check_fee_status returned an unusable paid/amount_due value")
    if not isinstance(payload.get("currency"), str):
        raise ToolFailure("check_fee_status returned no currency")
    return payload


def _validate_link(payload: Any, student_id: str) -> dict:
    if not isinstance(payload, dict) or payload.get("student_id") != student_id:
        raise ToolFailure("generate_reset_link returned an invalid or mismatched record")
    link = payload.get("reset_link")
    if not isinstance(link, str) or not link.startswith(RESET_LINK_PREFIX):
        raise ToolFailure("generate_reset_link returned a non-demo URL")
    return payload


VALIDATORS = {"check_id_status": _validate_id_status, "check_fee_status": _validate_fee, "generate_reset_link": _validate_link}


class CampusHelpdeskAgent:
    def __init__(self, policy_path: str | Path | None = None, tool_overrides: dict[str, Callable] | None = None):
        self.policy_engine = PolicyEngine(policy_path or ROOT / "data" / "policy.json")
        overrides = tool_overrides or {}
        self.tools = {
            "check_id_status": overrides.get("check_id_status", check_id_status),
            "check_fee_status": overrides.get("check_fee_status", check_fee_status),
            "generate_reset_link": overrides.get("generate_reset_link", generate_reset_link),
        }

    # ---- classification -------------------------------------------------
    @staticmethod
    def classify_with_signals(text: str) -> tuple[str, list[str]]:
        matched: dict[str, list[str]] = {}
        for category, patterns in CATEGORY_PATTERNS.items():
            hits = [m.group(0).lower() for p in patterns for m in re.finditer(p, text, re.IGNORECASE)]
            if hits:
                matched[category] = sorted(set(hits))
        signals = [f"{cat}: {', '.join(words)}" for cat, words in matched.items()]
        if "warden_only" in matched:  # welfare/safety boundary always dominates
            return "warden_only", signals
        if "refund" in matched:  # a refund request subsumes fee wording
            matched.pop("hostel_fee", None)
        if len(matched) > 1:
            return "ambiguous", signals
        return (next(iter(matched)) if matched else "unknown"), signals

    @staticmethod
    def classify(text: str) -> str:
        return CampusHelpdeskAgent.classify_with_signals(text)[0]

    # ---- main loop ------------------------------------------------------
    def run(self, ticket: Ticket, llm_proposal: dict | None = None) -> AgentResult:
        """Handle one ticket. ``llm_proposal`` models an UNTRUSTED model suggestion: it is recorded, compared, and ignored."""
        result = AgentResult(ticket_id=str(ticket.ticket_id), ticket_text=str(ticket.text)[:MAX_TICKET_CHARS], student_id=ticket.student_id)
        try:
            return self._run(ticket, result, llm_proposal)
        except Exception as exc:  # last-resort safety net: never crash, never guess
            result.trace.append(f"Internal error contained: {exc.__class__.__name__}")
            return self._escalate(result, "INTERNAL_ERROR", "Unexpected internal error; a human must review this ticket.", ticket)

    def _run(self, ticket: Ticket, result: AgentResult, llm_proposal: dict | None) -> AgentResult:
        result.trace.append("Ticket received")
        text = ticket.text if isinstance(ticket.text, str) else ""
        if not text.strip() or len(text) > MAX_TICKET_CHARS:
            return self._escalate(result, "INVALID_TICKET", "Ticket text is empty or too long to process safely.", ticket)

        # 1. Forbidden-request guardrail (runs before anything else)
        flags = guardrails.scan(text)
        if flags:
            result.forbidden_action_detected = True
            result.forbidden_actions_matched = sorted({f.forbidden_action for f in flags})
            result.policy_checked, result.policy_decision, result.policy_code = True, "FORBIDDEN", "FORBIDDEN_REQUEST"
            result.trace.append(f"Forbidden request detected: {'; '.join(result.forbidden_actions_matched)}")
            result.trace.append("No tools called; nothing was executed")
            result.unnecessary_tool_calls_avoided = len(ALL_TOOLS)
            self._record_llm_proposal(result, llm_proposal, fee=None)
            return self._escalate(result, "FORBIDDEN_REQUEST", "Requested action is explicitly forbidden and was blocked.", ticket)

        # 2. Classify + plan
        category, signals = self.classify_with_signals(text)
        result.category, result.classification_signals = category, signals
        result.trace.append(f"Classified as {category.replace('_', ' ')}")
        if category == "ambiguous":
            result.unnecessary_tool_calls_avoided = len(ALL_TOOLS)
            self._record_llm_proposal(result, llm_proposal, fee=None)
            return self._escalate(result, "AMBIGUOUS_TICKET", "Ticket matches several categories; a human must decide which applies.", ticket)
        plan = PLANS[category]
        result.plan = [f"needs: {', '.join(plan['needs']) or 'nothing'}", f"tools: {', '.join(plan['tools']) or 'none'}", f"then: {plan['then']}"]
        result.trace.append("Plan: " + " | ".join(result.plan))

        # 3. Gather required information
        sid = self._normalize_student_id(ticket.student_id)
        if "student_id" in plan["needs"]:
            if sid is None:
                result.trace.append("Required student ID is missing or malformed")
                result.unnecessary_tool_calls_avoided = len(ALL_TOOLS)
                return self._escalate(result, "MISSING_INFO", "A valid student ID is required before any lookup; none was provided.", ticket)
            other_ids = guardrails.referenced_student_ids(text) - {sid}
            if other_ids:
                result.trace.append("Ticket text references a different student ID than the ticket owner")
                result.unnecessary_tool_calls_avoided = len(ALL_TOOLS)
                return self._escalate(result, "IDENTITY_MISMATCH",
                                      f"Ticket owner {sid} mentions other student ID(s) {', '.join(sorted(other_ids))}; requests about someone else need a human.",
                                      ticket)

        # 4. Category handlers
        if category == "id_issue":
            return self._handle_id(ticket, result, sid, llm_proposal)
        if category in ("hostel_fee", "refund"):
            return self._handle_fee(ticket, result, sid, text, llm_proposal)
        return self._handle_no_tool(ticket, result, category, llm_proposal)

    # ---- helpers --------------------------------------------------------
    @staticmethod
    def _normalize_student_id(value: str | None) -> str | None:
        if not isinstance(value, str):
            return None
        value = value.strip()
        return value.upper() if STUDENT_ID_FORMAT.match(value) else None

    def _call(self, result: AgentResult, tool_name: str, student_id: str, *extra: str) -> dict | None:
        result.trace.append(f"Called {tool_name}")
        result.tools_called.append(tool_name)
        try:
            payload = self.tools[tool_name](student_id, *extra)
            payload = VALIDATORS[tool_name](payload, student_id)
        except Exception as exc:  # tool bugs, lookups, and bad payloads all end the same way: no result, escalate
            detail = f"{tool_name}: {exc.__class__.__name__}: {exc}"
            result.tool_errors.append(detail)
            result.trace.append(f"{tool_name} failed; no result was invented")
            return None
        result.tool_results.append({"tool": tool_name, "result": payload})
        return payload

    def _consult(self, result: AgentResult, category: str, action: str | None = None, facts: dict | None = None):
        decision = self.policy_engine.decide(category, action, facts=facts)
        result.policy_checked = True
        result.policy_decision, result.policy_code, result.policy_rule = decision.decision, decision.code, decision.rule
        result.policy_version, result.policy_sha256 = decision.policy_version, decision.policy_sha256
        result.human_confirmation_required = decision.human_confirmation_required
        result.trace.append(f"Policy engine: {decision.decision} ({decision.code})")
        return decision

    def _handle_id(self, ticket: Ticket, result: AgentResult, sid: str, llm_proposal: dict | None) -> AgentResult:
        status = self._call(result, "check_id_status", sid)
        self._record_llm_proposal(result, llm_proposal, fee=None)
        if status is None:
            return self._tool_failure(ticket, result)
        result.trace.append(f"ID status returned: {status['status']}")
        decision = self._consult(result, "id_issue", "generate_id_reset_link", {"id_status": status["status"]})
        if decision.decision != "ALLOW":
            return self._escalate(result, decision.code, decision.reason, ticket)
        link = self._call(result, "generate_reset_link", sid)
        if link is None:
            return self._tool_failure(ticket, result)
        result.action_executed = "mock_reset_link_generated"
        return self._close_if_evidenced(ticket, result)

    def _handle_fee(self, ticket: Ticket, result: AgentResult, sid: str, text: str, llm_proposal: dict | None) -> AgentResult:
        fee = self._call(result, "check_fee_status", sid, "hostel")
        self._record_llm_proposal(result, llm_proposal, fee=fee)
        if fee is None:
            result.unnecessary_tool_calls_avoided = len(ALL_TOOLS) - len(result.tools_called)
            return self._tool_failure(ticket, result)
        result.trace.append(f"Fee tool: {'paid' if fee['paid'] else 'unpaid'}; amount due {fee['amount_due']} {fee['currency']}")
        self._compare_claims(result, text, fee)
        decision = self._consult(result, result.category)
        result.unnecessary_tool_calls_avoided = len(ALL_TOOLS) - len(result.tools_called)
        if decision.decision != "HUMAN_REQUIRED":
            return self._escalate(result, decision.code, decision.reason, ticket)
        result.recommendation = self._fee_recommendation(result, fee)
        result.outcome = Outcome.RECOMMENDATION_REQUIRES_HUMAN
        result.escalation_code = "HUMAN_CONFIRMATION_REQUIRED"
        result.escalation_reason = decision.reason
        result.escalation_brief = self._brief(ticket, result, decision.reason)
        result.trace.append("Recommendation prepared - NOT executed; awaiting human confirmation")
        return result

    def _handle_no_tool(self, ticket: Ticket, result: AgentResult, category: str, llm_proposal: dict | None) -> AgentResult:
        result.unnecessary_tool_calls_avoided = len(ALL_TOOLS)
        self._record_llm_proposal(result, llm_proposal, fee=None)
        result.trace.append("No tools needed; none called")
        decision = self._consult(result, category)
        code = decision.code if category != "unknown" else "UNKNOWN_CATEGORY"
        reason = decision.reason if category != "unknown" else "Ticket category not recognized; no policy authorizes automation."
        return self._escalate(result, code, reason, ticket)

    # ---- claims, proposals, recommendation -----------------------------
    def _compare_claims(self, result: AgentResult, text: str, fee: dict) -> None:
        amounts = guardrails.extract_claimed_amounts(text)
        for amount in amounts:
            shown = f"{amount:,.0f}"
            result.unverified_claims.append(f"Ticket text quotes an amount of {shown} (unverified)")
            if abs(amount - fee["amount_due"]) > 0.005:
                result.discrepancies.append(f"Ticket amount {shown} differs from fee-tool amount due {fee['amount_due']:,.0f}; tool value is authoritative")
        if guardrails.claims_payment(text):
            result.unverified_claims.append("Ticket claims a payment was made (unverified)")
            if not fee["paid"]:
                result.discrepancies.append("Ticket claims payment, but the fee tool shows the fee UNPAID; payment is unverified")

    def _record_llm_proposal(self, result: AgentResult, proposal: dict | None, fee: dict | None) -> None:
        if not proposal:
            return
        for key, value in proposal.items():
            result.untrusted_inputs_ignored.append(f"LLM proposed {key}={value!r}: recorded, NOT used for any decision")
        amount = proposal.get("amount")
        if fee is not None and isinstance(amount, (int, float)) and not isinstance(amount, bool) and abs(amount - fee["amount_due"]) > 0.005:
            result.discrepancies.append(f"LLM-proposed amount {amount:,.0f} conflicts with fee-tool amount due {fee['amount_due']:,.0f}; tool value used")
        result.trace.append("Untrusted LLM proposal recorded and ignored; the policy engine decides")

    @staticmethod
    def _fee_recommendation(result: AgentResult, fee: dict) -> dict:
        if result.category == "refund":
            summary = ("Refund requested. Policy data defines no refund eligibility rule or amount, so the agent proposes none. "
                       "A human must decide whether any refund applies.")
        elif not fee["paid"]:
            summary = ("Fee tool shows the hostel fee UNPAID. The agent cannot verify any payment. "
                       "A human finance reviewer should check payment evidence before any correction.")
        else:
            summary = "Fee tool shows the hostel fee PAID, which conflicts with the ticket. A human should check why the student sees a different status."
        return {
            "type": "fee_review",
            "status": "PENDING_HUMAN_CONFIRMATION",
            "executed": False,
            "summary": summary,
            "fee_tool": {"paid": fee["paid"], "amount_due": fee["amount_due"], "currency": fee["currency"]},
            "discrepancies": list(result.discrepancies),
            "agent_did_not": ["process a payment", "issue a refund", "decide refund eligibility", "change any fee record"],
        }

    # ---- closing / escalation ------------------------------------------
    def _close_if_evidenced(self, ticket: Ticket, result: AgentResult) -> AgentResult:
        problems = closure_gate_problems(result)
        if problems:
            result.action_executed = None
            return self._escalate(result, "CLOSURE_GATE_FAILED", "Closure blocked: " + "; ".join(problems), ticket)
        result.outcome = Outcome.RESOLVED_AUTOMATICALLY
        result.was_closed_without_human = True
        result.unnecessary_tool_calls_avoided = len(ALL_TOOLS) - len(result.tools_called)
        result.trace.extend(["Mock reset link generated (demo URL only)", "Ticket resolved automatically: policy ALLOW and all evidence present"])
        return result

    def _tool_failure(self, ticket: Ticket, result: AgentResult) -> AgentResult:
        result.policy_decision = "NOT_EVALUATED_MISSING_EVIDENCE"
        result.policy_code = "NOT_EVALUATED_MISSING_EVIDENCE"
        return self._escalate(result, "TOOL_FAILURE", "Required tool evidence is unavailable: " + "; ".join(result.tool_errors), ticket)

    def _escalate(self, result: AgentResult, code: str, reason: str, ticket: Ticket) -> AgentResult:
        result.outcome = Outcome.ESCALATED
        result.human_confirmation_required = False
        result.action_executed = None  # an escalated ticket never reports an executed action
        result.escalation_code, result.escalation_reason = code, reason
        result.escalation_brief = self._brief(ticket, result, reason)
        result.trace.append("Ticket escalated to a human")
        return result

    @staticmethod
    def _brief(ticket: Ticket, result: AgentResult, reason: str) -> str:
        tools = ", ".join(result.tools_called) or "no tools"
        return f"Ticket {result.ticket_id} ({result.category}) needs human review. Evidence gathered: {tools}. Reason: {reason}"


def closure_gate_problems(result: AgentResult) -> list[str]:
    """Defense in depth: an automatic closure needs a policy ALLOW plus every piece of evidence."""
    problems = []
    if result.policy_decision != "ALLOW":
        problems.append("policy did not return ALLOW")
    if result.forbidden_action_detected:
        problems.append("a forbidden request was detected")
    if result.tool_errors:
        problems.append("a tool reported an error")
    called = {entry["tool"] for entry in result.tool_results}
    for needed in ("check_id_status", "generate_reset_link"):
        if needed not in called:
            problems.append(f"missing tool evidence: {needed}")
    return problems
