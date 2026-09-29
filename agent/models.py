"""Structured, auditable data models for the helpdesk workflow."""

from dataclasses import asdict, dataclass, field
from enum import Enum
from typing import Any


class Outcome(str, Enum):
    RESOLVED_AUTOMATICALLY = "RESOLVED_AUTOMATICALLY"
    RECOMMENDATION_REQUIRES_HUMAN = "RECOMMENDATION_REQUIRES_HUMAN"
    ESCALATED = "ESCALATED"
    ERROR = "ERROR"


@dataclass(frozen=True)
class Ticket:
    ticket_id: str
    student_id: str | None
    text: str


@dataclass
class AgentResult:
    ticket_id: str
    category: str
    outcome: Outcome
    trace: list[str] = field(default_factory=list)
    tools_called: list[str] = field(default_factory=list)
    tool_results: list[dict[str, Any]] = field(default_factory=list)
    policy_checked: bool = False
    policy_decision: str = "NOT_CHECKED"
    human_confirmation_required: bool = False
    forbidden_action_detected: bool = False
    escalation_reason: str | None = None
    escalation_brief: str | None = None
    was_closed_without_human: bool = False
    was_closed_wrong: bool = False
    unnecessary_tool_calls_avoided: int = 0

    def to_dict(self) -> dict[str, Any]:
        data = asdict(self)
        data["outcome"] = self.outcome.value
        return data
