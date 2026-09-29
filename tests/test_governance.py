import json

import pytest

from agent import CampusHelpdeskAgent, Outcome, Ticket
from agent.approvals import APPROVED, PENDING, REJECTED, ApprovalError, ApprovalQueue
from agent.audit import AuditLog
from agent.metrics import Metrics

FEE = Ticket("F", "STU001", "I paid my hostel fee but it shows unpaid.")


def test_agent_run_never_approves_anything():
    queue = ApprovalQueue()
    result = CampusHelpdeskAgent().run(FEE)
    request = queue.submit(result)
    assert request.status == PENDING and request.execution == "NOT_EXECUTED"
    assert result.recommendation["status"] == "PENDING_HUMAN_CONFIRMATION"


def test_only_recommendations_can_be_queued():
    with pytest.raises(ApprovalError):
        ApprovalQueue().submit(CampusHelpdeskAgent().run(Ticket("W", "STU002", "My roommate needs the warden.")))


def test_human_decision_requires_named_reviewer_and_is_final():
    queue = ApprovalQueue()
    request = queue.submit(CampusHelpdeskAgent().run(FEE))
    for blank in ("", "   "):
        with pytest.raises(ApprovalError):
            queue.decide(request.request_id, blank, True)
    done = queue.decide(request.request_id, "Dr. Rao (synthetic)", True, "checked ledger")
    assert done.status == APPROVED and done.reviewer and done.execution == "NOT_EXECUTED"
    with pytest.raises(ApprovalError):
        queue.decide(request.request_id, "Someone else", False)


def test_rejection_is_recorded():
    queue = ApprovalQueue()
    request = queue.submit(CampusHelpdeskAgent().run(FEE))
    assert queue.decide(request.request_id, "Reviewer A", False).status == REJECTED


def test_audit_record_has_every_required_field(tmp_path):
    log = AuditLog(tmp_path / "audit.jsonl")
    result = CampusHelpdeskAgent().run(FEE)
    log.append("ticket_run", result.to_dict())
    record = log.read()[0]
    for key in ("ticket_id", "ticket_text", "category", "classification_signals", "tools_called", "tool_results",
                "policy_version", "policy_rule", "policy_decision", "human_confirmation_required", "recommendation",
                "escalation_reason", "outcome", "trace", "timestamp"):
        assert key in record, key
    assert "chain" not in json.dumps(record).lower().replace("chained", "")  # no reasoning dump


def test_metrics_are_counted_not_invented():
    metrics = Metrics()
    assert metrics.rate(0) is None  # no tickets -> no rate, not 0% or 100%
    agent = CampusHelpdeskAgent()
    for ticket in (Ticket("1", "STU001", "My ID is not working, please reset it."), FEE, Ticket("3", "STU002", "My roommate needs the warden.")):
        metrics.record(agent.run(ticket))
    summary = metrics.summary()
    assert (metrics.processed, metrics.resolved, metrics.recommendations, metrics.escalated) == (3, 1, 1, 1)
    assert summary["Tool calls made"] == 3  # 2 + 1 + 0
    assert summary["Unnecessary tool calls avoided (vs call-all baseline)"] == 6  # 1 + 2 + 3
    assert summary["Automatic resolution rate"] == pytest.approx(1 / 3)
    assert not any("carbon" in key.lower() or "co2" in key.lower() for key in summary)
