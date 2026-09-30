"""The 'correct no': when the policy file itself denies, the agent closes with that exact statement."""
import json
from pathlib import Path

from agent import CampusHelpdeskAgent, Outcome, Ticket
from agent.metrics import Metrics
from agent.policy_engine import PolicyEngine

POLICY = Path(__file__).resolve().parents[1] / "data" / "policy.json"
STATEMENT = "TEST-ONLY statement: this refund is not permitted by the policy paragraph."
REFUND = Ticket("R", "STU001", "Please refund my hostel fee.")


def deny_policy(tmp_path, statement=STATEMENT):
    policy = json.loads(POLICY.read_text())
    policy["rules"]["refund"] = {"decision": "DENY"} if statement is None else {"decision": "DENY", "statement": statement}
    path = tmp_path / "policy.json"
    path.write_text(json.dumps(policy))
    return path


def test_shipped_policy_never_invents_a_refund_rule():
    decision = PolicyEngine(POLICY).decide("refund")
    assert decision.decision == "HUMAN_REQUIRED"  # until the official no-refund paragraph is pasted in


def test_explicit_deny_rule_closes_with_the_policy_statement_verbatim(tmp_path):
    result = CampusHelpdeskAgent(policy_path=deny_policy(tmp_path)).run(REFUND)
    assert result.outcome is Outcome.DENIED_BY_POLICY
    assert result.denial["statement"] == STATEMENT and result.denial["rule"] == "refund"
    assert result.was_closed_without_human and result.action_executed is None
    assert result.tools_called == ["check_fee_status"]  # evidence gathered before saying no
    assert not result.human_confirmation_required and result.recommendation is None


def test_deny_without_a_statement_escalates_instead_of_inventing_one(tmp_path):
    result = CampusHelpdeskAgent(policy_path=deny_policy(tmp_path, statement=None)).run(REFUND)
    assert result.outcome is Outcome.ESCALATED and result.policy_code == "POLICY_AMBIGUOUS"
    assert not result.was_closed_without_human


def test_deny_is_not_reached_when_fee_evidence_is_missing(tmp_path):
    def broken(_sid, _fee):
        raise RuntimeError("down")
    agent = CampusHelpdeskAgent(policy_path=deny_policy(tmp_path), tool_overrides={"check_fee_status": broken})
    result = agent.run(REFUND)
    assert result.outcome is Outcome.ESCALATED and result.escalation_code == "TOOL_FAILURE"


def test_metrics_report_closed_without_human_and_closed_wrong(tmp_path):
    metrics = Metrics()
    agent = CampusHelpdeskAgent()
    metrics.record(agent.run(Ticket("1", "STU001", "My ID is not working, please reset it.")), "RESOLVED_AUTOMATICALLY")
    metrics.record(agent.run(Ticket("3", "STU002", "My roommate needs the warden.")), "ESCALATED")
    denied = CampusHelpdeskAgent(policy_path=deny_policy(tmp_path)).run(REFUND)
    metrics.record(denied, "RECOMMENDATION_REQUIRES_HUMAN")  # deliberately mislabelled -> must count as closed-wrong
    assert (metrics.closed_without_human, metrics.closed_correct, metrics.closed_wrong) == (2, 1, 1)
    summary = metrics.summary()
    assert summary["Closed without human"] == 2 and summary["Closed wrong (vs labelled expected outcome)"] == 1
