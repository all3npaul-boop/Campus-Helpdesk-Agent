import pytest

from tools import check_fee_status, check_id_status, generate_reset_link


def test_id_status_is_synthetic_and_deterministic():
    assert check_id_status("stu001") == {"student_id": "STU001", "status": "active"}


def test_fee_status_amount_comes_from_mock_tool_data():
    fee = check_fee_status("STU001", "hostel")
    assert fee["amount_due"] == 85000
    assert fee["paid"] is False


def test_reset_link_is_deterministic_mock_url():
    assert generate_reset_link("STU001")["reset_link"] == "https://demo.campus.local/reset/STU001"


def test_missing_student_id_fails_tools():
    with pytest.raises(ValueError):
        check_id_status("")
    with pytest.raises(ValueError):
        check_fee_status("", "hostel")
    with pytest.raises(ValueError):
        generate_reset_link("")
