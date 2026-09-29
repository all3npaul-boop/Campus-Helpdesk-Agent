import json
from pathlib import Path

from agent.policy_engine import PolicyEngine


POLICY = Path("data/policy.json")


def test_active_id_reset_is_explicitly_allowed():
    decision = PolicyEngine(POLICY).decide("id_issue", "generate_id_reset_link", id_status="active")
    assert decision.decision == "ALLOW"


def test_payment_requires_human_confirmation():
    decision = PolicyEngine(POLICY).decide("hostel_fee", "payment_action")
    assert decision.decision == "HUMAN_REQUIRED"
    assert decision.human_confirmation_required


def test_missing_policy_escalates(tmp_path):
    assert PolicyEngine(tmp_path / "none.json").decide("id_issue", "generate_id_reset_link", id_status="active").decision == "ESCALATE"


def test_ambiguous_policy_escalates(tmp_path):
    policy = json.loads(POLICY.read_text())
    policy["rules"]["id_reset"] = "maybe"
    path = tmp_path / "policy.json"
    path.write_text(json.dumps(policy))
    assert PolicyEngine(path).decide("id_issue", "generate_id_reset_link", id_status="active").decision == "ESCALATE"
import pytest

from agent.policy_engine import PolicyEngine, PolicyError

POLICY = Path(__file__).resolve().parents[1] / "data" / "policy.json"
ACTIVE = {"id_status": "active"}


def write(tmp_path, mutate):
    policy = json.loads(POLICY.read_text())
    mutate(policy)
    path = tmp_path / "policy.json"
    path.write_text(json.dumps(policy))
    return PolicyEngine(path)


def test_active_id_reset_is_explicitly_allowed():
    decision = PolicyEngine(POLICY).decide("id_issue", "generate_id_reset_link", facts=ACTIVE)
    assert decision.decision == "ALLOW" and decision.policy_version and decision.policy_sha256


def test_inactive_id_is_not_allowed():
    assert PolicyEngine(POLICY).decide("id_issue", "generate_id_reset_link", facts={"id_status": "inactive"}).decision == "ESCALATE"


def test_payment_and_refund_require_human_confirmation():
    for category in ("hostel_fee", "refund"):
        decision = PolicyEngine(POLICY).decide(category)
        assert decision.decision == "HUMAN_REQUIRED" and decision.human_confirmation_required


def test_missing_policy_escalates(tmp_path):
    decision = PolicyEngine(tmp_path / "none.json").decide("id_issue", "generate_id_reset_link", facts=ACTIVE)
    assert (decision.decision, decision.code) == ("ESCALATE", "POLICY_UNAVAILABLE")


def test_corrupted_policy_escalates(tmp_path):
    path = tmp_path / "policy.json"
    path.write_text("{not valid json")
    assert PolicyEngine(path).decide("hostel_fee").decision == "ESCALATE"
    with pytest.raises(PolicyError):
        PolicyEngine(path).forbidden_actions()


def test_ambiguous_rule_escalates(tmp_path):
    engine = write(tmp_path, lambda p: p["rules"]["id_issue"].update(decision="maybe"))
    assert engine.decide("id_issue", "generate_id_reset_link", facts=ACTIVE).code == "POLICY_AMBIGUOUS"


def test_allow_rule_without_requirements_is_ambiguous(tmp_path):
    engine = write(tmp_path, lambda p: p["rules"]["id_issue"].pop("requires"))
    assert engine.decide("id_issue", "generate_id_reset_link", facts=ACTIVE).decision == "ESCALATE"


def test_action_not_listed_as_automatic_escalates(tmp_path):
    engine = write(tmp_path, lambda p: p.update(automatic_actions=[]))
    assert engine.decide("id_issue", "generate_id_reset_link", facts=ACTIVE).decision == "ESCALATE"


def test_contradictory_policy_escalates(tmp_path):
    def mutate(p):
        p["automatic_actions"].append("issue_refund")
    engine = write(tmp_path, mutate)
    assert engine.decide("refund", "issue_refund").code == "POLICY_CONTRADICTORY"


def test_policy_silent_on_category_escalates_instead_of_guessing(tmp_path):
    engine = write(tmp_path, lambda p: p["rules"].pop("refund"))
    decision = engine.decide("refund")
    assert (decision.decision, decision.code) == ("ESCALATE", "POLICY_NO_RULE")


def test_missing_or_empty_forbidden_list_invalidates_policy(tmp_path):
    engine = write(tmp_path, lambda p: p.update(forbidden_actions=[]))
    assert engine.decide("id_issue", "generate_id_reset_link", facts=ACTIVE).code == "POLICY_UNAVAILABLE"


def test_policy_exposes_forbidden_actions():
    forbidden = PolicyEngine(POLICY).forbidden_actions()
    assert "inventing payment or fee amounts" in forbidden
    assert "inventing payment amounts" in forbidden and "inventing fee amounts" in forbidden
    assert "bypassing required human approval" in forbidden
