"""Deterministic, synthetic tools used by the Campus Helpdesk Agent."""

from .fee_status import check_fee_status
from .id_status import check_id_status
from .reset_link import generate_reset_link

__all__ = ["check_fee_status", "check_id_status", "generate_reset_link"]
