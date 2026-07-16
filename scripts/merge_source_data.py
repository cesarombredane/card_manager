#!/usr/bin/env python3
"""Merge approved fallback sources into generated application data."""

from __future__ import annotations

import argparse
import json
import os
from collections import Counter
from pathlib import Path
from typing import Any

from source_adapters import PokemonTcgAdapter, card_number_keys, match_source_set, normalized_key


ENERGY_MAP = {"colorless": "normal", "darkness": "dark", "lightning": "lightning"}


def read_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def write_json(path: Path, value: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_suffix(f"{path.suffix}.tmp")
    temporary.write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    os.replace(temporary, path)


def enum(value: Any) -> str:
    return str(value or "unknown").strip().lower().replace(" ", "_").replace("-", "_")


def energy(value: Any) -> str:
    normalized = enum(value)
    return ENERGY_MAP.get(normalized, normalized)


def modifier(row: dict[str, Any]) -> dict[str, str]:
    return {"type": energy(row.get("type")), "value": str(row.get("value") or "").replace("×", "x")}


def attack(row: dict[str, Any]) -> dict[str, Any]:
    return {
        "name": {"en": str(row.get("name") or "")},
        "cost": [energy(value) for value in row.get("cost", [])],
        "damage": str(row.get("damage") or ""),
        "text": {"en": str(row.get("text") or "")},
    }


def fill_missing_metadata(local: dict[str, Any], source: dict[str, Any]) -> list[str]:
    """Fill only absent values so TCGdex remains authoritative."""
    changed: list[str] = []

    def fill(field: str, value: Any) -> None:
        if value not in (None, "", [], {}) and local.get(field) in (None, "", [], {}):
            local[field] = value
            changed.append(field)

    fill("illustrator", source.get("artist"))
    fill("rarity", enum(source.get("rarity")) if source.get("rarity") else None)
    fill("regulation_mark", source.get("regulationMark"))
    fill("hp", int(source["hp"]) if str(source.get("hp") or "").isdigit() else None)
    fill("types", [energy(value) for value in source.get("types", [])])
    fill("evolves_from", {"en": source["evolvesFrom"]} if source.get("evolvesFrom") else None)
    fill("attacks", [attack(row) for row in source.get("attacks", [])])
    fill("weaknesses", [modifier(row) for row in source.get("weaknesses", [])])
    fill("resistances", [modifier(row) for row in source.get("resistances", [])])
    fill("retreat_cost", source.get("convertedRetreatCost"))
    fill("rules_text", {"en": "\n".join(source.get("rules", []))} if source.get("rules") else None)
    fill("flavor_text", {"en": source["flavorText"]} if source.get("flavorText") else None)
    fill("legalities", {key: enum(value) for key, value in source.get("legalities", {}).items()})
    return changed


def choose_card(local_card: dict[str, Any], candidates: list[dict[str, Any]]) -> tuple[dict[str, Any] | None, str]:
    local_keys = card_number_keys(local_card.get("number"))
    numbered = [row for row in candidates if local_keys & card_number_keys(row.get("number"))]
    if len(numbered) == 1:
        return numbered[0], "set+number"
    local_name = normalized_key((local_card.get("name") or {}).get("en"))
    named = [row for row in numbered if local_name and normalized_key(row.get("name")) == local_name]
    if len(named) == 1:
        return named[0], "set+number+name"
    return None, "ambiguous" if numbered else "no-match"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--data", default="app/data")
    parser.add_argument("--pokemontcg", default="source_data/pokemontcg")
    parser.add_argument("--report", default="reports/source-merge.json")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    project_root = Path(__file__).resolve().parents[1]
    data_root = (project_root / args.data).resolve()
    source_root = (project_root / args.pokemontcg).resolve()
    report_path = (project_root / args.report).resolve()
    adapter = PokemonTcgAdapter(source_root)
    source_sets = adapter.source_sets()
    mapping: dict[str, Any] = {"version": 1, "sets": {}, "cards": {}}
    counters: Counter[str] = Counter()
    conflicts: list[dict[str, str]] = []

    for sets_path in sorted(data_root.glob("*/sets.json")):
        sets = read_json(sets_path)
        for local_set in sets:
            source_set, reason = match_source_set(local_set, source_sets)
            if not source_set:
                counters[f"set:{reason}"] += 1
                continue
            counters["set:matched"] += 1
            mapping["sets"][local_set["id"]] = {
                "pokemontcg": source_set.id,
                "match": reason,
                "logo_url": source_set.logo_url,
                "symbol_url": source_set.symbol_url,
            }
            cards_path = sets_path.parent / f"cards_{local_set['id']}.json"
            if not cards_path.exists():
                continue
            cards = read_json(cards_path)
            source_cards = adapter.cards(source_set.id)
            changed = False
            for local_card in cards:
                source_card, card_reason = choose_card(local_card, source_cards)
                if not source_card:
                    counters[f"card:{card_reason}"] += 1
                    if card_reason == "ambiguous":
                        conflicts.append({"card_id": local_card["id"], "set_id": local_set["id"], "reason": card_reason})
                    continue
                counters["card:matched"] += 1
                fields = fill_missing_metadata(local_card, source_card)
                changed = changed or bool(fields)
                counters["metadata_fields_filled"] += len(fields)
                mapping["cards"][local_card["id"]] = {
                    "pokemontcg": source_card["id"],
                    "match": card_reason,
                    "image_small": (source_card.get("images") or {}).get("small"),
                    "image_large": (source_card.get("images") or {}).get("large"),
                    "fields_filled": fields,
                }
            if changed:
                write_json(cards_path, cards)

    revision_path = source_root / "revision.txt"
    mapping["sources"] = {
        "tcgdex": {"role": "primary"},
        "pokemontcg": {
            "role": "international-english-fallback",
            "revision": revision_path.read_text(encoding="utf-8").strip() if revision_path.exists() else None,
        },
    }
    write_json(data_root / "source-map.json", mapping)
    report = {"counts": dict(sorted(counters.items())), "conflicts": conflicts, "sources": mapping["sources"]}
    write_json(report_path, report)
    print(json.dumps(report["counts"], indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
