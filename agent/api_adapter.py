"""Framework-neutral adapter reserved for a future authenticated frontend API."""
from .agent import CampusHelpdeskAgent
from .models import Ticket

def process_ticket(ticket_id: str, student_id: str | None, text: str) -> dict:
    """Return the existing agent's safe structured outcome without external I/O."""
    return CampusHelpdeskAgent().run(Ticket(ticket_id, student_id, text)).to_dict()
