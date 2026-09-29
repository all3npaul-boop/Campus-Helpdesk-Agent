"""Measured operational metrics. Every number is counted from real runs; nothing is estimated.

Definitions (also in the README):
- automatic resolution rate  = auto-resolved / processed
- escalation rate            = escalated / processed
- human-review rate          = (escalated + recommendations) / processed
- human interventions avoided = auto-resolved tickets (each would otherwise need a staff touch - an assumption, stated openly)
- unnecessary tool calls avoided = tools NOT called versus a naive baseline that calls every tool on every ticket
No carbon or energy figure is reported because none is measured here.
"""

from dataclasses import dataclass

from .agent import ALL_TOOLS
from .models import AgentResult, Outcome


@dataclass
class Metrics:
    processed: int = 0
    resolved: int = 0
    recommendations: int = 0
    escalated: int = 0
    forbidden_blocked: int = 0
    tool_calls_made: int = 0
    tool_calls_avoided: int = 0

    def record(self, result: AgentResult) -> None:
        self.processed += 1
        self.resolved += result.outcome is Outcome.RESOLVED_AUTOMATICALLY
        self.recommendations += result.outcome is Outcome.RECOMMENDATION_REQUIRES_HUMAN
        self.escalated += result.outcome is Outcome.ESCALATED
        self.forbidden_blocked += bool(result.forbidden_action_detected)
        self.tool_calls_made += len(result.tools_called)
        self.tool_calls_avoided += result.unnecessary_tool_calls_avoided

    @property
    def interventions_avoided(self) -> int:
        return self.resolved

    def rate(self, count: int) -> float | None:
        return None if not self.processed else count / self.processed

    def summary(self) -> dict:
        return {
            "Tickets processed": self.processed,
            "Auto-resolved": self.resolved,
            "Escalated": self.escalated,
            "Human-confirmation recommendations": self.recommendations,
            "Forbidden requests blocked": self.forbidden_blocked,
            "Human interventions avoided": self.interventions_avoided,
            "Tool calls made": self.tool_calls_made,
            "Unnecessary tool calls avoided (vs call-all baseline)": self.tool_calls_avoided,
            "Automatic resolution rate": self.rate(self.resolved),
            "Escalation rate": self.rate(self.escalated),
            "Human-review rate": self.rate(self.escalated + self.recommendations),
        }

    @staticmethod
    def baseline_tools_per_ticket() -> int:
        return len(ALL_TOOLS)
