"""Synthetic reset-link generator; it produces a mock URL only."""

VALID_DEMO_IDS = {"STU001", "STU002", "DEMO123"}


def generate_reset_link(student_id: str) -> dict:
    """Return a deterministic mock reset link for a known synthetic student ID."""
    if not student_id:
        raise ValueError("student_id is required")
    normalized_id = student_id.upper()
    if normalized_id not in VALID_DEMO_IDS:
        raise LookupError(f"No synthetic ID record exists for {normalized_id}")
    return {
        "student_id": normalized_id,
        "reset_link": f"https://demo.campus.local/reset/{normalized_id}",
    }
