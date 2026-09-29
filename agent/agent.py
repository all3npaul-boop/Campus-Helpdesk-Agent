"""Deterministic orchestration for safe campus-helpdesk ticket handling."""

from pathlib import Path
from typing import Callable

from tools import check_fee_status, check_id_status, generate_reset_link

from .models import AgentResult, Outcome, Ticket
from .policy_engine import PolicyEngine

ROOT = Path(__file__).resolve().parents[1]


class CampusHelpdeskAgent:
    def __init__(self, policy_path: str | Path | None = None, tool_overrides: dict[str, Callable] | None = None):
        self.policy_engine = PolicyEngine(policy_path or ROOT / "data" / "policy.json")
        overrides = tool_overrides or {}
        self.tools = {
            "check_id_status": overrides.get("check_id_status", check_id_status),
            "check_fee_status": overrides.get("check_fee_status", check_fee_status),
            "generate_reset_link": overrides.get("generate_reset_link", generate_reset_link),
        }

    @staticmethod
    def classify(text: str) -> str:
        lowered = text.lower()
        if any(word in lowered for word in ("warden", "roommate", "room mate")):
            return "warden_only"
        if "refund" in lowered:
            return "refund"
        if any(word in lowered for word in ("pay", "payment", "fee", "hostel")):
            return "hostel_fee"
        if any(word in lowered for word in ("id", "identity", "reset")):
            return "id_issue"
        if any(word in lowered for word in ("wi-fi", "wifi", "internet")):
            return "wifi"
        return "unknown"

    def run(self, ticket: Ticket) -> AgentResult:
        category = self.classify(ticket.text)
        result = AgentResult(ticket_id=ticket.ticket_id, category=category, outcome=Outcome.ERROR)
        result.trace.extend(["Ticket received", f"Classified as {category.replace('_', ' ')}"])
        lowered = ticket.text.lower()
        unsafe_request = any(phrase in lowered for phrase in (
            "invent an amount", "make up an amount", "invent a refund rule", "bypass human confirmation",
            "without human approval", "without approval",
        ))
        if unsafe_request:
            result.forbidden_action_detected = True
            result.policy_checked = True
            result.policy_decision = "FORBIDDEN"
            result.trace.extend(["Forbidden action request detected", "Policy check: forbidden", "Ticket escalated"])
            result.outcome = Outcome.ESCALATED
            result.escalation_reason = "Requested action is explicitly forbidden and was blocked."
            result.escalation_brief = self._brief(ticket, result, result.escalation_reason)
            return result

        if category == "id_issue":
            return self._handle_id(ticket, result)
        if category == "hostel_fee":
            return self._handle_fee(ticket, result)
        return self._finish_with_policy(ticket, result, "no_action")

    def _call(self, result: AgentResult, tool_name: str, *args: str) -> dict | None:
        result.trace.append(f"Called {tool_name}")
        result.tools_called.append(tool_name)
        try:
            tool_result = self.tools[tool_name](*args)
        except (ValueError, LookupError, RuntimeError) as exc:
            result.trace.append(f"{tool_name} failed: {exc}")
            result.escalation_reason = f"Tool failure or missing synthetic data: {exc}"
            result.outcome = Outcome.ERROR
            return None
        result.tool_results.append({"tool": tool_name, "result": tool_result})
        return tool_result

    def _handle_id(self, ticket: Ticket, result: AgentResult) -> AgentResult:
        if not ticket.student_id:
            result.trace.append("Required student ID is missing")
            result.escalation_reason = "Student ID is required before an ID status check."
            result.outcome = Outcome.ESCALATED
            return result
        status = self._call(result, "check_id_status", ticket.student_id)
        if status is None:
            return result
        result.trace.append(f"ID status returned: {status['status']}")
        decision = self.policy_engine.decide("id_issue", "generate_id_reset_link", id_status=status["status"])
        result.policy_checked, result.policy_decision = True, decision.decision
        result.trace.append(f"Policy check: {decision.decision.lower()}")
        if decision.decision != "ALLOW":
            return self._escalate(result, decision.reason)
        link = self._call(result, "generate_reset_link", ticket.student_id)
        if link is None:
            return result
        result.trace.extend(["Mock reset link generated", "Ticket resolved automatically"])
        result.outcome = Outcome.RESOLVED_AUTOMATICALLY
        result.was_closed_without_human = True
        result.unnecessary_tool_calls_avoided = 1
        return result

    def _handle_fee(self, ticket: Ticket, result: AgentResult) -> AgentResult:
        if not ticket.student_id:
            result.trace.append("Required student ID is missing")
            return self._escalate(result, "Student ID is required before a fee status check.")
        fee = self._call(result, "check_fee_status", ticket.student_id, "hostel")
        if fee is None:
            return result
        result.trace.append(f"Fee status returned: {'paid' if fee['paid'] else 'unpaid'}")
        result.unnecessary_tool_calls_avoided = 1
        return self._finish_with_policy(ticket, result, "payment_action")

    def _finish_with_policy(self, ticket: Ticket, result: AgentResult, action: str) -> AgentResult:
        decision = self.policy_engine.decide(result.category, action)
        result.policy_checked, result.policy_decision = True, decision.decision
        result.human_confirmation_required = decision.human_confirmation_required
        result.trace.append(f"Policy check: {decision.decision.lower()}")
        if decision.decision == "HUMAN_REQUIRED":
            result.outcome = Outcome.RECOMMENDATION_REQUIRES_HUMAN
            result.escalation_reason = decision.reason
            result.escalation_brief = self._brief(ticket, result, decision.reason)
            result.trace.append("Recommendation prepared; no payment or refund action was executed")
            return result
        return self._escalate(result, decision.reason, ticket)

    def _escalate(self, result: AgentResult, reason: str, ticket: Ticket | None = None) -> AgentResult:
        result.outcome = Outcome.ESCALATED
        result.escalation_reason = reason
        if ticket:
            result.escalation_brief = self._brief(ticket, result, reason)
        result.trace.append("Ticket escalated")
        return result

    @staticmethod
    def _brief(ticket: Ticket, result: AgentResult, reason: str) -> str:
        tools = ", ".join(result.tools_called) or "no tools"
        return f"Ticket {ticket.ticket_id} ({result.category}) needs human review. Evidence gathered: {tools}. Reason: {reason}"
