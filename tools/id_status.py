"""Synthetic ID-status lookup; it never contacts a campus identity system."""

ID_STATUS_DATA = {
    "STU001": "active",
    "STU002": "inactive",
    "DEMO123": "active",
}


def check_id_status(student_id: str) -> dict:
    """Return deterministic synthetic status for a valid demo student ID."""
    if not student_id:
        raise ValueError("student_id is required")
    normalized_id = student_id.upper()
    if normalized_id not in ID_STATUS_DATA:
        raise LookupError(f"No synthetic ID record exists for {normalized_id}")
    return {"student_id": normalized_id, "status": ID_STATUS_DATA[normalized_id]}
