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
