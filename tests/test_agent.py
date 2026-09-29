from agent import CampusHelpdeskAgent, Outcome, Ticket


def test_easy_id_ticket_resolves_with_tools_and_policy():
    result = CampusHelpdeskAgent().run(Ticket("1", "STU001", "My student ID is not working. Can you help me reset it?"))
    assert result.outcome is Outcome.RESOLVED_AUTOMATICALLY
    assert result.tools_called == ["check_id_status", "generate_reset_link"]
    assert result.policy_decision == "ALLOW"
    assert result.was_closed_without_human


def test_missing_fee_ticket_requires_human_and_never_executes_payment():
    result = CampusHelpdeskAgent().run(Ticket("2", "STU001", "I paid my hostel fee but it is still unpaid."))
    assert result.outcome is Outcome.RECOMMENDATION_REQUIRES_HUMAN
    assert result.tools_called == ["check_fee_status"]
    assert result.human_confirmation_required
    assert not result.was_closed_without_human


def test_warden_ticket_escalates_without_tool_calls():
    result = CampusHelpdeskAgent().run(Ticket("3", "STU002", "My roommate issue needs the warden."))
    assert result.outcome is Outcome.ESCALATED
    assert not result.tools_called
    assert result.escalation_brief


def test_tool_failure_has_no_hallucinated_result():
    def broken_tool(_student_id):
        raise RuntimeError("synthetic tool unavailable")
    result = CampusHelpdeskAgent(tool_overrides={"check_id_status": broken_tool}).run(Ticket("4", "STU001", "ID reset please"))
    assert result.outcome is Outcome.ERROR
    assert result.tool_results == []
    assert "unavailable" in result.escalation_reason


def test_missing_student_id_escalates():
    result = CampusHelpdeskAgent().run(Ticket("5", None, "My ID is not working"))
    assert result.outcome is Outcome.ESCALATED
