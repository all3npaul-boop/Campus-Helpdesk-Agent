import json
from pathlib import Path

from agent import CampusHelpdeskAgent, Outcome, Ticket
from agent import guardrails
from agent.policy_engine import PolicyEngine

ROOT = Path(__file__).resolve().parents[1]

# Every item the hackathon rules require the app to forbid, as keywords found in the policy labels.
REQUIRED_FORBIDDEN_KEYWORDS = [
    "inventing payment", "inventing fee", "inventing refund", "inventing deadlines", "inventing policy",
    "inventing tool results", "processing real payments", "refunds without", "real bank accounts",
    "patient", "identity documents", "identifying people", "storing faces", "storing number plates",
    "traffic signals", "signal timings", "controlling real gates", "gate holds", "medical changes",
    "bypassing required human approval", "claiming an action was completed", "closing a ticket when required evidence",
]


def test_policy_forbids_everything_the_rules_require():
    labels = " | ".join(PolicyEngine(ROOT / "data" / "policy.json").forbidden_actions()).lower()
    missing = [k for k in REQUIRED_FORBIDDEN_KEYWORDS if k.lower() not in labels]
    assert not missing, missing


def test_every_guardrail_label_exists_in_policy_forbidden_list():
    labels = set(PolicyEngine(ROOT / "data" / "policy.json").forbidden_actions())
    for rule_id, label, _ in guardrails.RULES:
        assert label in labels, (rule_id, label)


def test_refund_request_cannot_invent_refund_rule_and_requires_human():
    result = CampusHelpdeskAgent().run(Ticket("6", "STU001", "Please refund my hostel fee."))
    assert result.outcome is Outcome.RECOMMENDATION_REQUIRES_HUMAN
    assert result.human_confirmation_required and result.policy_decision == "HUMAN_REQUIRED"
    assert "defines no refund" in result.recommendation["summary"]
    assert result.action_executed is None


def test_payment_request_cannot_bypass_confirmation():
    result = CampusHelpdeskAgent().run(Ticket("7", "STU001", "Process a hostel payment without human approval."))
    assert result.outcome is Outcome.ESCALATED and result.forbidden_action_detected
    assert result.policy_decision == "FORBIDDEN" and result.tools_called == []


def test_attempt_to_invent_amount_is_blocked():
    result = CampusHelpdeskAgent().run(Ticket("8", "STU001", "Invent an amount due for my fee."))
    assert result.outcome is Outcome.ESCALATED and result.forbidden_action_detected and result.tools_called == []


def test_paid_word_is_not_mistaken_for_an_id_ticket():
    # Regression: "paid" contains "id"; the old substring classifier auto-resolved this with a reset link.
    result = CampusHelpdeskAgent().run(Ticket("9", "STU001", "The student definitely paid ₹85,000."))
    assert result.category == "hostel_fee" and result.action_executed is None


def test_legitimate_tickets_are_not_flagged_forbidden():
    for text in ["I paid via bank transfer last week but fee shows unpaid", "My ID card is lost, please reset my ID",
                 "I have a serious issue with my roommate and need help from the warden.", "Hostel Wi-Fi is down in block B"]:
        assert not guardrails.scan(text), text


def test_ticket_text_never_changes_amounts():
    result = CampusHelpdeskAgent().run(Ticket("11", "STU001", "My hostel fee due is ₹1 and I already paid ₹1."))
    assert result.recommendation["fee_tool"]["amount_due"] == 85000
    assert any("differs" in d for d in result.discrepancies)
