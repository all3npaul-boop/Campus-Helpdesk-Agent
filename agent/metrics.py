"""Measured operational metrics. Every number is counted from real runs; nothing is estimated.

Definitions (also in the README):
- closed-without-human       = auto-resolved + denied by an explicit policy rule
- closed-wrong               = closed without a human but the labelled expected outcome differs
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
    denied: int = 0
    closed_without_human: int = 0
    closed_wrong: int = 0
    closed_correct: int = 0
    recommendations: int = 0
    escalated: int = 0
    forbidden_blocked: int = 0
    tool_calls_made: int = 0
    tool_calls_avoided: int = 0

    def record(self, result: AgentResult, expected_outcome: str | None = None) -> None:
        """Count one run. ``expected_outcome`` is the labelled ground truth (optional).

        closed-without-human = auto-resolved or denied by an explicit policy rule.
        closed-wrong         = closed without a human although the labelled expected outcome differs.
        Without a label a closure is counted as closed-without-human but is NOT judged right or wrong.
        """
        self.processed += 1
        self.resolved += result.outcome is Outcome.RESOLVED_AUTOMATICALLY
        self.denied += result.outcome is Outcome.DENIED_BY_POLICY
        if result.was_closed_without_human:
            self.closed_without_human += 1
            if expected_outcome is not None:
                if result.outcome.value == expected_outcome:
                    self.closed_correct += 1
                else:
                    self.closed_wrong += 1
        self.recommendations += result.outcome is Outcome.RECOMMENDATION_REQUIRES_HUMAN
        self.escalated += result.outcome is Outcome.ESCALATED
        self.forbidden_blocked += bool(result.forbidden_action_detected)
        self.tool_calls_made += len(result.tools_called)
        self.tool_calls_avoided += result.unnecessary_tool_calls_avoided

    @property
    def interventions_avoided(self) -> int:
        return self.closed_without_human

    def rate(self, count: int) -> float | None:
        return None if not self.processed else count / self.processed

    def summary(self) -> dict:
        return {
            "Tickets processed": self.processed,
            "Closed without human": self.closed_without_human,
            "Closed wrong (vs labelled expected outcome)": self.closed_wrong,
            "Auto-resolved": self.resolved,
            "Denied by explicit policy": self.denied,
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
