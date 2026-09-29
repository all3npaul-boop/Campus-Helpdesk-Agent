"""UI-facing safety copy. Authorization always comes from policy_engine, not a prompt."""

SAFETY_NOTICE = (
    "This workflow uses deterministic synthetic tools and a policy engine. "
    "It does not connect to real campus, financial, identity, medical, traffic, or gate systems."
)
