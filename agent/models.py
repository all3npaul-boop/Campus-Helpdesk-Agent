"""Structured, auditable data models for the helpdesk workflow."""

from dataclasses import asdict, dataclass, field
from datetime import datetime, timezone
from enum import Enum
from typing import Any


class Outcome(str, Enum):
    RESOLVED_AUTOMATICALLY = "RESOLVED_AUTOMATICALLY"
    RECOMMENDATION_REQUIRES_HUMAN = "RECOMMENDATION_REQUIRES_HUMAN"
    ESCALATED = "ESCALATED"


@dataclass(frozen=True)
class Ticket:
    ticket_id: str
    student_id: str | None
    text: str


@dataclass
class AgentResult:
    # ticket
    ticket_id: str
    ticket_text: str = ""
    student_id: str | None = None
    timestamp: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat(timespec="seconds"))
    # classification / plan
    category: str = "unknown"
    classification_signals: list[str] = field(default_factory=list)
    plan: list[str] = field(default_factory=list)
    # tools
    tools_called: list[str] = field(default_factory=list)
    tool_results: list[dict[str, Any]] = field(default_factory=list)
    tool_errors: list[str] = field(default_factory=list)
    # policy
    policy_checked: bool = False
    policy_decision: str = "NOT_CHECKED"
    policy_code: str = "NOT_CHECKED"
    policy_rule: str | None = None
    policy_version: str | None = None
    policy_sha256: str | None = None
    # safety
    forbidden_action_detected: bool = False
    forbidden_actions_matched: list[str] = field(default_factory=list)
    untrusted_inputs_ignored: list[str] = field(default_factory=list)
    unverified_claims: list[str] = field(default_factory=list)
    discrepancies: list[str] = field(default_factory=list)
    # outcome
    outcome: Outcome = Outcome.ESCALATED
    human_confirmation_required: bool = False
    action_executed: str | None = None  # only ever the mock ID-reset link
    recommendation: dict[str, Any] | None = None
    escalation_code: str | None = None
    escalation_reason: str | None = None
    escalation_brief: str | None = None
    was_closed_without_human: bool = False
    unnecessary_tool_calls_avoided: int = 0
    trace: list[str] = field(default_factory=list)

    def to_dict(self) -> dict[str, Any]:
        data = asdict(self)
        data["outcome"] = self.outcome.value
        return data
