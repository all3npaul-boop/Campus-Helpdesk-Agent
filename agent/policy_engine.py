"""Data-driven authorization boundary for the Campus Helpdesk Agent."""

"""Data-driven authorization boundary for the Campus Helpdesk Agent.

Every decision is derived from ``data/policy.json``. If the policy is missing,
corrupt, ambiguous, contradictory, or silent about a category, the result is
ESCALATE. The engine never fills a gap with a default "allow" or a default
"human required" - a gap means a human reviews the ticket.
"""

import hashlib
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

VALID_DECISIONS = {"ALLOW_IF", "HUMAN_REQUIRED", "ESCALATE"}


class PolicyError(Exception):
    """Raised when the policy file cannot be trusted."""


@dataclass(frozen=True)
class PolicyDecision:
    decision: str  # ALLOW | HUMAN_REQUIRED | ESCALATE
    reason: str
    human_confirmation_required: bool = False
    code: str = "OK"
    rule: str | None = None
    policy_version: str | None = None
    policy_sha256: str | None = None


class PolicyEngine:
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
        try:
            raw = self.policy_path.read_bytes()
        except OSError as exc:
            raise PolicyError(f"policy file unreadable: {exc.__class__.__name__}") from exc
        try:
            policy = json.loads(raw.decode("utf-8"))
        except (UnicodeDecodeError, json.JSONDecodeError) as exc:
            raise PolicyError("policy file is corrupt (not valid JSON)") from exc
        if not isinstance(policy, dict) or not isinstance(policy.get("rules"), dict):
            raise PolicyError("policy is missing required rules data")
        forbidden = policy.get("forbidden_actions")
        if not isinstance(forbidden, list) or not forbidden or not all(isinstance(x, str) and x for x in forbidden):
            raise PolicyError("policy is missing a valid forbidden_actions list")
        if not isinstance(policy.get("automatic_actions", []), list):
            raise PolicyError("automatic_actions must be a list")
        policy["_sha256"] = hashlib.sha256(raw).hexdigest()
        return policy

    def forbidden_actions(self) -> list[str]:
        """Raises PolicyError if the policy cannot be trusted; callers must handle it."""
        return list(self.load()["forbidden_actions"])

    def decide(self, category: str, action: str | None = None, *, facts: dict | None = None) -> PolicyDecision:
        try:
            policy = self.load()
        except PolicyError as exc:
            return PolicyDecision("ESCALATE", f"Policy unavailable: {exc}.", code="POLICY_UNAVAILABLE")

        meta = {"policy_version": str(policy.get("policy_version", "unversioned")), "policy_sha256": policy["_sha256"][:12]}

        def out(decision, reason, code, rule=None, human=False):
            return PolicyDecision(decision, reason, human, code, rule, **meta)

        rule = policy["rules"].get(category)
        if rule is None:
            return out("ESCALATE", f"Policy has no rule for '{category}'; the agent will not guess.", "POLICY_NO_RULE")
        if not isinstance(rule, dict) or rule.get("decision") not in VALID_DECISIONS:
            return out("ESCALATE", f"Policy rule for '{category}' is ambiguous or malformed.", "POLICY_AMBIGUOUS", category)

        kind = rule["decision"]
        automatic = policy.get("automatic_actions", [])
        if kind != "ALLOW_IF" and action in automatic:
            return out("ESCALATE", f"Policy contradicts itself: '{action}' is automatic but rule '{category}' is {kind}.",
                       "POLICY_CONTRADICTORY", category)
        if kind == "ESCALATE":
            return out("ESCALATE", f"Policy rule '{category}' requires escalation to a human.", "RULE_ESCALATE", category)
        if kind == "HUMAN_REQUIRED":
            return out("HUMAN_REQUIRED", f"Policy rule '{category}' requires human confirmation before any action.",
                       "HUMAN_REQUIRED", category, human=True)

        # ALLOW_IF: every element must be explicit, otherwise escalate.
        requires = rule.get("requires")
        if not isinstance(requires, dict) or not requires or rule.get("action") != action or action not in automatic:
            return out("ESCALATE", f"Automatic action '{action}' is not explicitly authorized for '{category}'.",
                       "POLICY_AMBIGUOUS", category)
        facts = facts or {}
        for key, expected in requires.items():
            if facts.get(key) != expected:
                return out("ESCALATE", f"Condition not met: {key} must be '{expected}' (got '{facts.get(key)}').",
                           "CONDITION_NOT_MET", category)
        return out("ALLOW", f"Rule '{category}' explicitly authorizes '{action}' when {requires}.", "OK", category)
