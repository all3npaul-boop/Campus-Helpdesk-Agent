from agent import CampusHelpdeskAgent, Outcome, Ticket


def test_easy_id_ticket_resolves_with_tools_and_policy():
    result = CampusHelpdeskAgent().run(Ticket("1", "STU001", "My student ID is not working. Can you help me reset it?"))
    assert result.outcome is Outcome.RESOLVED_AUTOMATICALLY
    assert result.tools_called == ["check_id_status", "generate_reset_link"]
    assert result.policy_decision == "ALLOW"
    assert result.was_closed_without_human
    assert result.action_executed == "mock_reset_link_generated"
    assert result.plan  # visible plan, not just a reaction


def test_inactive_id_is_not_auto_resolved():
    result = CampusHelpdeskAgent().run(Ticket("1b", "STU002", "My ID card is not working."))
    assert result.outcome is Outcome.ESCALATED
    assert result.policy_code == "CONDITION_NOT_MET"
    assert result.tools_called == ["check_id_status"]
    assert result.action_executed is None


def test_missing_fee_ticket_requires_human_and_never_executes_payment():
    result = CampusHelpdeskAgent().run(Ticket("2", "STU001", "I paid my hostel fee but it is still unpaid."))
    assert result.outcome is Outcome.RECOMMENDATION_REQUIRES_HUMAN
    assert result.tools_called == ["check_fee_status"]
    assert result.human_confirmation_required
    assert not result.was_closed_without_human
    assert result.action_executed is None
    assert result.recommendation["executed"] is False
    assert result.recommendation["fee_tool"]["amount_due"] == 85000  # amount comes from the tool only
    assert any("UNPAID" in d for d in result.discrepancies)


def test_warden_ticket_escalates_without_tool_calls():
    result = CampusHelpdeskAgent().run(Ticket("3", "STU002", "My roommate issue needs the warden."))
    assert result.outcome is Outcome.ESCALATED
    assert not result.tools_called
    assert result.escalation_brief


def test_tool_failure_has_no_hallucinated_result():
    def broken_tool(_student_id):
        raise RuntimeError("synthetic tool unavailable")
    result = CampusHelpdeskAgent(tool_overrides={"check_id_status": broken_tool}).run(Ticket("4", "STU001", "ID reset please"))
    assert result.outcome is Outcome.ESCALATED and result.escalation_code == "TOOL_FAILURE"
    assert result.tool_results == []
    assert "unavailable" in result.escalation_reason
    assert result.policy_decision == "NOT_EVALUATED_MISSING_EVIDENCE"
    assert not result.was_closed_without_human


def test_missing_student_id_escalates():
    result = CampusHelpdeskAgent().run(Ticket("5", None, "My ID is not working"))
    assert result.outcome is Outcome.ESCALATED
    assert result.escalation_code == "MISSING_INFO"
    assert result.tools_called == []


def test_malformed_student_id_escalates_without_tool_call():
    result = CampusHelpdeskAgent().run(Ticket("5b", "STU001; DROP TABLE", "My ID is not working"))
    assert result.escalation_code == "MISSING_INFO" and result.tools_called == []


def test_empty_and_oversized_tickets_escalate():
    assert CampusHelpdeskAgent().run(Ticket("6", "STU001", "   ")).escalation_code == "INVALID_TICKET"
    assert CampusHelpdeskAgent().run(Ticket("6b", "STU001", "fee " * 1000)).escalation_code == "INVALID_TICKET"


def test_wifi_ticket_escalates_by_policy_not_as_a_fee():
    result = CampusHelpdeskAgent().run(Ticket("7", "STU001", "Hostel Wi-Fi is down in block B, please provide a fix."))
    assert result.category == "wifi"
    assert result.outcome is Outcome.ESCALATED and result.tools_called == []


def test_multi_intent_ticket_is_ambiguous_and_escalates():
    result = CampusHelpdeskAgent().run(Ticket("8", "STU001", "My Wi-Fi is down and my hostel fee shows unpaid."))
    assert result.escalation_code == "AMBIGUOUS_TICKET" and result.tools_called == []


def test_unknown_category_escalates():
    result = CampusHelpdeskAgent().run(Ticket("9", "STU001", "What time does the library open?"))
    assert result.outcome is Outcome.ESCALATED and result.escalation_code == "UNKNOWN_CATEGORY"


def test_other_students_id_in_text_escalates_before_any_tool():
    result = CampusHelpdeskAgent().run(Ticket("10", "STU001", "Reset the ID for STU002 please."))
    assert result.escalation_code == "IDENTITY_MISMATCH" and result.tools_called == []
