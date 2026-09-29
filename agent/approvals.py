"""Human confirmation queue.

The agent can only SUBMIT a recommendation. Only a named human reviewer can
approve or reject it, through ``decide``. Nothing here processes a payment or
refund: an approval is recorded as a human decision and the demo states plainly
that no execution integration exists.
"""

import itertools
from dataclasses import asdict, dataclass, field
from datetime import datetime, timezone

from .models import AgentResult, Outcome

PENDING, APPROVED, REJECTED = "PENDING_HUMAN_CONFIRMATION", "APPROVED_BY_HUMAN", "REJECTED_BY_HUMAN"
NO_EXECUTION_NOTE = "Decision recorded only. This demo has no payment/refund integration; the agent executed nothing."


class ApprovalError(Exception):
    pass


@dataclass
class ApprovalRequest:
    request_id: str
    ticket_id: str
    summary: str
    status: str = PENDING
    reviewer: str | None = None
    note: str | None = None
    decided_at: str | None = None
    execution: str = "NOT_EXECUTED"

    def to_dict(self) -> dict:
        return asdict(self)


@dataclass
class ApprovalQueue:
    requests: dict[str, ApprovalRequest] = field(default_factory=dict)
    _ids: itertools.count = field(default_factory=lambda: itertools.count(1), repr=False)

    def submit(self, result: AgentResult) -> ApprovalRequest:
        if result.outcome is not Outcome.RECOMMENDATION_REQUIRES_HUMAN or not result.recommendation:
            raise ApprovalError("Only a recommendation that requires human confirmation can be queued.")
        request = ApprovalRequest(f"APR-{next(self._ids):04d}", result.ticket_id, result.recommendation["summary"])
        self.requests[request.request_id] = request
        return request

    def decide(self, request_id: str, reviewer: str, approve: bool, note: str = "") -> ApprovalRequest:
        request = self.requests.get(request_id)
        if request is None:
            raise ApprovalError("Unknown approval request.")
        if not isinstance(reviewer, str) or not reviewer.strip():
            raise ApprovalError("A named human reviewer is required.")
        if request.status != PENDING:
            raise ApprovalError("This request was already decided.")
        request.status = APPROVED if approve else REJECTED
        request.reviewer, request.note = reviewer.strip(), note.strip() or None
        request.decided_at = datetime.now(timezone.utc).isoformat(timespec="seconds")
        return request
