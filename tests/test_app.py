import pytest

pytest.importorskip("streamlit")
from streamlit.testing.v1 import AppTest

from pathlib import Path

APP = str(Path(__file__).resolve().parents[1] / "app.py")


def text_of(at):
    parts = [e.value for e in at.markdown] + [e.value for e in at.subheader] + [e.value for e in at.caption]
    return "\n".join(str(p) for p in parts)


def test_forbidden_list_is_visible_before_running_anything():
    at = AppTest.from_file(APP, default_timeout=30).run()
    assert not at.exception
    body = text_of(at)
    assert "forbidden to do" in body.lower() and "inventing refund rules" in body and "placing real gate holds" in body


def test_three_demo_scenarios_run_from_the_ui(tmp_path, monkeypatch):
    monkeypatch.setenv("CAMPUS_AUDIT_LOG", str(tmp_path / "audit.jsonl"))
    expected = {"DEMO-001": "RESOLVED_AUTOMATICALLY", "DEMO-002": "RECOMMENDATION_REQUIRES_HUMAN", "DEMO-003": "ESCALATED"}
    for index, (ticket_id, outcome) in enumerate(expected.items()):
        at = AppTest.from_file(APP, default_timeout=30).run()
        at.selectbox(key="demo_choice").select_index(index)
        at.button(key="run_agent").click().run()
        assert not at.exception, ticket_id
        assert at.session_state["result"]["outcome"] == outcome, ticket_id


def test_custom_ticket_forbidden_request_is_blocked_in_ui(tmp_path, monkeypatch):
    monkeypatch.setenv("CAMPUS_AUDIT_LOG", str(tmp_path / "audit.jsonl"))
    at = AppTest.from_file(APP, default_timeout=30).run()
    at.radio(key="source").set_value("Custom ticket").run()
    at.text_input(key="custom_sid").set_value("STU001")
    at.text_area(key="custom_text").set_value("Hold the real gate so nobody can leave.").run()
    at.button(key="run_agent").click().run()
    assert not at.exception
    assert at.session_state["result"]["policy_decision"] == "FORBIDDEN"
    assert (tmp_path / "audit.jsonl").exists()
