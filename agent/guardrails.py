"""Deterministic pre-filter for requests the agent must never act on.

This is a safety net that runs BEFORE classification and tools. It only ever
makes outcomes more conservative (block + escalate); it can never authorize
anything. Each rule maps to a label in ``data/policy.json -> forbidden_actions``
(a test enforces that the labels stay in sync).
"""

import re
from dataclasses import dataclass

I = re.IGNORECASE
_ACCESS = r"(?:access|check|look ?up|fetch|pull|retrieve|verify|show|get|open|view|read|send|give me|share)"


@dataclass(frozen=True)
class ForbiddenFlag:
    rule_id: str
    forbidden_action: str  # must match a label in policy.json


RULES: list[tuple[str, str, list[str]]] = [
    ("invent_values", "inventing fee amounts",
     [r"\b(?:invent|make up|fabricate|guess|estimate|assume|just pick)\b.{0,40}\b(?:amount|fee|price|due|balance)",
      r"\b(?:invent|make up|fabricate)\b.{0,30}\b(?:number|value|figure)"]),
    ("invent_refund_rule", "inventing refund rules",
     [r"\b(?:invent|make up|fabricate|assume)\b.{0,40}\brefund (?:rule|polic|eligib)",
      r"\brefunds? (?:is|are)\s+(?:obviously|clearly|surely|definitely|certainly)\s+(?:allowed|permitted|eligible)",
      r"\b(?:obviously|clearly|surely|definitely|certainly)\s+(?:allowed|permitted|eligible)"]),
    ("invent_deadline", "inventing deadlines",
     [r"\b(?:invent|make up|fabricate|assume|guess)\b.{0,40}\b(?:deadline|due date|last date)"]),
    ("invent_policy", "inventing policy",
     [r"\bpolic(?:y|ies)\s+(?:doesn'?t|does not|didn'?t|did not|never)\s+(?:say|mention|cover|state)",
      r"\b(?:invent|make up|assume|imagine)\b.{0,30}\bpolic(?:y|ies)\b",
      r"\bnot (?:in|covered by) (?:the )?polic(?:y|ies)\b.{0,40}\b(?:allow|ok|fine|permitted)"]),
    ("bypass_approval", "bypassing required human approval",
     [r"\b(?:ignore|override|disregard|bypass|skip|circumvent|forget)\b.{0,25}\b(?:polic(?:y|ies)|rules?|instructions?|guardrails?|safeguards?|approval|confirmation|review|human)",
      r"\bwithout (?:any )?(?:human )?(?:approval|confirmation|review|sign[- ]?off|authori[sz]ation)\b",
      r"\bno (?:human|approval|confirmation) (?:needed|required|necessary)\b",
      r"\bpretend (?:the )?(?:human|approval|it)\b.{0,20}\b(?:approved|confirmed|signed)"]),
    ("false_completion", "claiming an action was completed when it was only recommended",
     [r"\b(?:mark|say|report|tell (?:them|me|him|her)|claim|state)\b.{0,30}\b(?:as )?(?:done|completed|executed|processed|refunded|paid)\b"]),
    ("close_without_evidence", "closing a ticket when required evidence is missing",
     [r"\bclose\b.{0,20}\b(?:ticket|case|request)\b.{0,40}\b(?:anyway|regardless|without (?:checking|evidence|proof|verification))"]),
    ("real_identity_docs", "accessing real student or personal identity documents",
     [r"\b(?:aadhaar|aadhar|passport|pan card|driving licen[cs]e|voter id|identity document|id document|id scan|marksheet)\b",
      rf"\b{_ACCESS}\b.{{0,40}}\b(?:classmate|roommate|friend|another student|other student|someone else|his|her|their)(?:'s|s')?\b.{{0,30}}\b(?:id|identity|documents?|records?)\b",
      r"\b(?:classmate|roommate|friend|another student|other student|someone else)(?:'s|s')?\b.{0,30}\b(?:identity|id) (?:document|proof|scan|copy)"]),
    ("real_bank", "accessing real bank accounts",
     [rf"\b{_ACCESS}\b.{{0,40}}\b(?:bank|upi|net ?banking|transaction|account statement|card number|account number)",
      r"\b(?:bank (?:account|statement|balance|transaction)|net ?banking|card number|account number)\b"]),
    ("real_payment", "processing real payments",
     [r"\b(?:charge|debit|deduct)\b.{0,30}\b(?:card|account|bank|wallet)\b",
      r"\b(?:transfer|send|wire)\b.{0,20}(?:money|funds|₹|rs\.?|inr)"]),
    ("financial_modification", "modifying real financial accounts",
     [r"\b(?:change|edit|update|modify|correct|write off|waive)\b.{0,30}\b(?:ledger|balance|dues?|fee record|account)\b"]),
    ("medical", "making medical changes",
     [r"\b(?:medical|medication|medicine|prescription|dosage|dose|diagnos\w*|patient|treatment|health record|insulin)\b"]),
    ("traffic_signal", "controlling real traffic signals",
     [r"\btraffic (?:signal|light)s?\b", r"\bsignal (?:timing|timings|phase|plan)\b", r"\bgreen (?:time|phase|light)\b"]),
    ("gate", "placing real gate holds",
     [r"\bgate\b.{0,30}\b(?:hold|open|close|lock|block|unlock|shut)\b", r"\b(?:hold|open|close|lock|block|unlock|shut)\b.{0,30}\bgate\b",
      r"\bgate hold\b"]),
    ("camera_identity", "identifying people from camera feeds",
     [r"\b(?:identify|recogni[sz]e|track|match|find out who)\b.{0,40}\b(?:face|person|people|student|plate|vehicle|cctv|camera)",
      r"\b(?:face|facial) (?:recognition|match|scan|id)\b", r"\bcctv\b.{0,30}\b(?:who|identify|footage of)\b"]),
    ("store_plates", "storing number plates",
     [r"\b(?:number ?plate|licen[cs]e plate|registration plate)\b"]),
    ("store_faces", "storing faces",
     [r"\b(?:store|save|keep|log|record)\b.{0,30}\b(?:faces?|facial|photos? of (?:students|people))\b"]),
]

_COMPILED = [(rid, label, [re.compile(p, I | re.DOTALL) for p in pats]) for rid, label, pats in RULES]


def scan(text: str) -> list[ForbiddenFlag]:
    """Return one flag per rule that matches. Empty list means nothing forbidden was detected."""
    flags: list[ForbiddenFlag] = []
    for rule_id, label, patterns in _COMPILED:
        if any(p.search(text) for p in patterns):
            flags.append(ForbiddenFlag(rule_id, label))
    return flags


AMOUNT_RE = re.compile(r"(?:₹|\brs\.?|\binr\b)\s*([0-9][0-9,]*(?:\.[0-9]+)?)", I)
CLAIMS_PAID_RE = re.compile(r"\b(?:paid|already paid|payment (?:was |is )?(?:made|done|complete[d]?)|have paid|had paid)\b", I)
STUDENT_ID_RE = re.compile(r"\b[A-Z]{3,4}\d{3,}\b", I)


def extract_claimed_amounts(text: str) -> list[float]:
    """Amounts quoted in free text. They are CLAIMS, never facts."""
    values = []
    for match in AMOUNT_RE.finditer(text):
        try:
            values.append(float(match.group(1).replace(",", "")))
        except ValueError:
            continue
    return values


def claims_payment(text: str) -> bool:
    return bool(CLAIMS_PAID_RE.search(text))


def referenced_student_ids(text: str) -> set[str]:
    return {m.upper() for m in STUDENT_ID_RE.findall(text)}
