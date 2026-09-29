"""Append-only JSONL audit trail. Stores observable facts only - never model reasoning."""

import json
from pathlib import Path

DEFAULT_PATH = Path(__file__).resolve().parents[1] / "audit" / "audit_log.jsonl"


class AuditLog:
    def __init__(self, path: str | Path | None = None):
        self.path = Path(path) if path else DEFAULT_PATH

    def append(self, kind: str, payload: dict) -> None:
        self.path.parent.mkdir(parents=True, exist_ok=True)
        with self.path.open("a", encoding="utf-8") as handle:
            handle.write(json.dumps({"kind": kind, **payload}, ensure_ascii=False, sort_keys=True) + "\n")

    def read(self) -> list[dict]:
        if not self.path.exists():
            return []
        return [json.loads(line) for line in self.path.read_text(encoding="utf-8").splitlines() if line.strip()]
