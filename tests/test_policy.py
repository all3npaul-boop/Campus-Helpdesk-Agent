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


def test_policy_exposes_forbidden_actions():
    forbidden = PolicyEngine(POLICY).forbidden_actions()
    assert "inventing payment or fee amounts" in forbidden
    assert "bypassing required human approval" in forbidden
