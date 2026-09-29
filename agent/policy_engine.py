"""Data-driven authorization boundary for the Campus Helpdesk Agent."""

import json
from dataclasses import dataclass
from pathlib import Path


@dataclass(frozen=True)
class PolicyDecision:
    decision: str
    reason: str
    human_confirmation_required: bool = False


class PolicyEngine:
    """Loads policy data and returns conservative authorization decisions."""

    def __init__(self, policy_path: str | Path):
        self.policy_path = Path(policy_path)

    def load(self) -> dict:
        with self.policy_path.open(encoding="utf-8") as handle:
            policy = json.load(handle)
        if not isinstance(policy, dict) or not isinstance(policy.get("rules"), dict):
            raise ValueError("Policy is missing required rules data")
        if not isinstance(policy.get("forbidden_actions"), list):
            raise ValueError("Policy is missing forbidden_actions")
        return policy

    def forbidden_actions(self) -> list[str]:
        return self.load()["forbidden_actions"]

    def decide(self, category: str, action: str, *, id_status: str | None = None) -> PolicyDecision:
        try:
            policy = self.load()
        except (OSError, json.JSONDecodeError, ValueError):
            return PolicyDecision("ESCALATE", "Policy is missing, invalid, or insufficient.")

        rules = policy["rules"]
        if category == "id_issue" and action == "generate_id_reset_link":
            if rules.get("id_reset") != "allowed_when_id_status_is_active":
                return PolicyDecision("ESCALATE", "ID reset policy is ambiguous or not explicitly authorized.")
            if action not in policy.get("automatic_actions", []):
                return PolicyDecision("ESCALATE", "Automatic ID reset link generation is not explicitly authorized.")
            if id_status != "active":
                return PolicyDecision("ESCALATE", "ID status is not active; human review is required.")
            return PolicyDecision("ALLOW", "Active ID reset link generation is explicitly authorized.")
        if category in {"hostel_fee", "payment", "refund"}:
            return PolicyDecision("HUMAN_REQUIRED", "Payment or refund-related actions require human confirmation.", True)
        if category == "warden_only":
            return PolicyDecision("ESCALATE", "Warden-only issues require escalation.")
        return PolicyDecision("ESCALATE", "No explicit policy authorization exists for this request.")
