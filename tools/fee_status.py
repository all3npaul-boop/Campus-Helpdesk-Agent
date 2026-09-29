"""Synthetic fee lookup; values originate only from this deterministic mock data."""

FEE_STATUS_DATA = {
    ("STU001", "hostel"): {"paid": False, "amount_due": 85000, "currency": "INR"},
    ("STU002", "hostel"): {"paid": True, "amount_due": 0, "currency": "INR"},
    ("DEMO123", "hostel"): {"paid": False, "amount_due": 42000, "currency": "INR"},
}


def check_fee_status(student_id: str, fee_type: str) -> dict:
    """Return a deterministic synthetic fee record without making network calls."""
    if not student_id:
        raise ValueError("student_id is required")
    if not fee_type:
        raise ValueError("fee_type is required")
    key = (student_id.upper(), fee_type.lower())
    if key not in FEE_STATUS_DATA:
        raise LookupError(f"No synthetic {key[1]} fee record exists for {key[0]}")
    return {"student_id": key[0], "fee_type": key[1], **FEE_STATUS_DATA[key]}
