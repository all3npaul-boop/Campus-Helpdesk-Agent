from agent import CampusHelpdeskAgent, Outcome, Ticket


def test_refund_request_cannot_invent_refund_rule_and_requires_human():
    result = CampusHelpdeskAgent().run(Ticket("6", "STU001", "Please refund my hostel fee."))
    assert result.outcome is Outcome.RECOMMENDATION_REQUIRES_HUMAN
    assert result.human_confirmation_required
    assert result.policy_decision == "HUMAN_REQUIRED"


def test_payment_request_cannot_bypass_confirmation():
    result = CampusHelpdeskAgent().run(Ticket("7", "STU001", "Process a hostel payment without human approval."))
    assert result.outcome is Outcome.ESCALATED
    assert result.forbidden_action_detected
    assert result.policy_decision == "FORBIDDEN"


def test_attempt_to_invent_amount_is_blocked():
    result = CampusHelpdeskAgent().run(Ticket("8", "STU001", "Invent an amount due for my fee."))
    assert result.outcome is Outcome.ESCALATED
    assert result.forbidden_action_detected
    assert result.tools_called == []
