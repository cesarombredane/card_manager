"""Source-neutral catalog records and adapters used by the merge pipeline."""

from __future__ import annotations

import json
import re
import unicodedata
from dataclasses import dataclass
from pathlib import Path
from typing import Any


def normalized_key(value: str | None) -> str:
    text = unicodedata.normalize("NFKD", value or "").encode("ascii", "ignore").decode()
    return re.sub(r"[^a-z0-9]+", "", text.lower())


def normalized_date(value: str | None) -> str:
    return (value or "").replace("/", "-")


@dataclass(frozen=True)
class SourceSet:
    source_id: str
    id: str
    name: str
    release_date: str
    printed_total: int
    logo_url: str | None
    symbol_url: str | None


class PokemonTcgAdapter:
    source_id = "pokemontcg"

    def __init__(self, root: Path):
        self.root = root
        self.sets = json.loads((root / "sets" / "en.json").read_text(encoding="utf-8"))
        self._cards: dict[str, list[dict[str, Any]]] = {}

    def source_sets(self) -> list[SourceSet]:
        return [
            SourceSet(
                source_id=self.source_id,
                id=str(row["id"]),
                name=str(row.get("name") or ""),
                release_date=normalized_date(row.get("releaseDate")),
                printed_total=int(row.get("printedTotal") or 0),
                logo_url=(row.get("images") or {}).get("logo"),
                symbol_url=(row.get("images") or {}).get("symbol"),
            )
            for row in self.sets
        ]

    def cards(self, set_id: str) -> list[dict[str, Any]]:
        if set_id not in self._cards:
            path = self.root / "cards" / "en" / f"{set_id}.json"
            self._cards[set_id] = json.loads(path.read_text(encoding="utf-8")) if path.exists() else []
        return self._cards[set_id]


def match_source_set(local_set: dict[str, Any], candidates: list[SourceSet]) -> tuple[SourceSet | None, str]:
    """Match one international set, rejecting ties and weak name-only matches."""
    if not str(local_set.get("id", "")).startswith("intl-"):
        return None, "non-international"

    local_name = str((local_set.get("name") or {}).get("en") or "")
    local_date = normalized_date(local_set.get("release_date"))
    local_total = int(local_set.get("card_count") or 0)
    tcgdex_id = normalized_key(str(local_set.get("tcgdex_id") or ""))
    scored: list[tuple[int, SourceSet, list[str]]] = []

    for candidate in candidates:
        score = 0
        reasons: list[str] = []
        if tcgdex_id and tcgdex_id == normalized_key(candidate.id):
            score += 100
            reasons.append("source-id")
        if local_name and normalized_key(local_name) == normalized_key(candidate.name):
            score += 40
            reasons.append("name")
        if local_date and local_date == candidate.release_date:
            score += 30
            reasons.append("release-date")
        if local_total and candidate.printed_total and abs(local_total - candidate.printed_total) <= max(5, candidate.printed_total // 2):
            score += 10
            reasons.append("card-count")
        # A provider id is decisive. Otherwise require name plus at least one
        # independent signal; dates or approximate counts alone are too weak.
        if score >= 100 or ("name" in reasons and score >= 70):
            scored.append((score, candidate, reasons))

    scored.sort(key=lambda item: item[0], reverse=True)
    if not scored:
        return None, "no-match"
    if len(scored) > 1 and scored[0][0] == scored[1][0]:
        return None, "ambiguous"
    score, candidate, reasons = scored[0]
    return candidate, f"score={score}:{','.join(reasons)}"


def card_number_keys(value: Any) -> set[str]:
    raw = str(value or "").strip()
    keys = {normalized_key(raw)}
    match = re.match(r"^0*(\d+)(.*)$", raw)
    if match:
        keys.add(f"{int(match.group(1))}{normalized_key(match.group(2))}")
    return {key for key in keys if key}
