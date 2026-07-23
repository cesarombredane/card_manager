#!/usr/bin/env python3
"""Generate the detailed data and image coverage used by the coverage page."""

from __future__ import annotations

import argparse
import json
import os
from collections import Counter, defaultdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


METADATA_FIELDS = (
    "name", "category", "rarity", "illustrator", "regulation_mark", "variants",
)


def read(path: Path, fallback: Any = None) -> Any:
    return json.loads(path.read_text(encoding="utf-8")) if path.exists() else fallback


def write(path: Path, value: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_suffix(f"{path.suffix}.tmp")
    temporary.write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    os.replace(temporary, path)


def percentage(filled: int, total: int) -> float:
    return round(filled * 100 / total, 2) if total else 100.0


def generate_coverage(data_root: Path, output: Path | None = None) -> dict[str, Any]:
    """Build and write one coverage report, returning it for updater summaries."""
    output = output or data_root / "coverage.json"
    series_metadata = {row["id"]: row for row in read(data_root / "series.json", [])}
    totals: Counter[str] = Counter()
    languages: dict[str, Counter[str]] = defaultdict(Counter)
    series_totals: dict[str, Counter[str]] = defaultdict(Counter)
    missing_metadata: dict[str, list[str]] = {field: [] for field in METADATA_FIELDS}
    missing_set_assets = {"logo": [], "symbol": []}
    set_reports: list[dict[str, Any]] = []

    for sets_path in sorted(data_root.glob("*/sets.json")):
        series_id = sets_path.parent.name
        series_row = series_metadata.get(series_id, {})
        for set_row in read(sets_path, []):
            set_id = str(set_row["id"])
            totals["sets"] += 1
            series_totals[series_id]["sets"] += 1
            has_logo = bool(set_row.get("title_image_url"))
            has_symbol = bool(set_row.get("symbol_image_url"))
            totals["set_logos"] += has_logo
            totals["set_symbols"] += has_symbol
            if not has_logo:
                missing_set_assets["logo"].append(set_id)
            if not has_symbol:
                missing_set_assets["symbol"].append(set_id)

            cards = read(sets_path.parent / f"cards_{set_id}.json", [])
            set_counts: Counter[str] = Counter()
            set_languages: dict[str, Counter[str]] = defaultdict(Counter)
            missing_images: dict[str, list[str]] = defaultdict(list)
            missing_card_ids: list[str] = []

            for card in cards:
                card_id = str(card["id"])
                totals["cards"] += 1
                set_counts["cards"] += 1
                series_totals[series_id]["cards"] += 1
                for field in METADATA_FIELDS:
                    if card.get(field) in (None, "", [], {}):
                        missing_metadata[field].append(card_id)

                card_has_image = False
                for variant in card.get("variants", []):
                    totals["variants"] += 1
                    set_counts["variants"] += 1
                    for language_id in set_row.get("language_ids", []):
                        url = variant.get("images", {}).get(language_id, "")
                        slot_id = f"{card_id}:{variant.get('id', 'normal')}"
                        totals["image_slots"] += 1
                        languages[language_id]["slots"] += 1
                        set_languages[language_id]["slots"] += 1
                        if url:
                            totals["filled_image_slots"] += 1
                            languages[language_id]["filled"] += 1
                            set_languages[language_id]["filled"] += 1
                            card_has_image = True
                        else:
                            missing_images[language_id].append(slot_id)
                if card_has_image:
                    totals["cards_with_image"] += 1
                    set_counts["cards_with_image"] += 1
                    series_totals[series_id]["cards_with_image"] += 1
                else:
                    missing_card_ids.append(card_id)

            localized_names = set_row.get("name") or {}
            set_reports.append({
                "id": set_id,
                "name": localized_names.get("en") or next(iter(localized_names.values()), set_id),
                "series_id": series_id,
                "series_name": series_row.get("name", series_id),
                "region_id": series_row.get("region_id", "unknown"),
                "release_date": set_row.get("release_date", ""),
                "languages": list(set_row.get("language_ids", [])),
                "has_logo": has_logo,
                "has_symbol": has_symbol,
                "cards": set_counts["cards"],
                "variants": set_counts["variants"],
                "cards_with_image": set_counts["cards_with_image"],
                "cards_without_image": set_counts["cards"] - set_counts["cards_with_image"],
                "image_coverage_percent": percentage(set_counts["cards_with_image"], set_counts["cards"]),
                "language_coverage": {
                    language: {
                        "slots": counts["slots"],
                        "filled": counts["filled"],
                        "missing": counts["slots"] - counts["filled"],
                        "percent": percentage(counts["filled"], counts["slots"]),
                    }
                    for language, counts in sorted(set_languages.items())
                },
                "missing_card_ids": missing_card_ids,
                "missing_images": {
                    language: slots for language, slots in sorted(missing_images.items())
                },
                "sources": {},
            })

    language_report = {
        language: {
            "slots": counts["slots"],
            "filled": counts["filled"],
            "missing": counts["slots"] - counts["filled"],
            "percent": percentage(counts["filled"], counts["slots"]),
        }
        for language, counts in sorted(languages.items())
    }
    totals_report = {
        **dict(totals),
        "missing_set_logos": totals["sets"] - totals["set_logos"],
        "missing_set_symbols": totals["sets"] - totals["set_symbols"],
        "cards_without_image": totals["cards"] - totals["cards_with_image"],
        "missing_image_slots": totals["image_slots"] - totals["filled_image_slots"],
        "card_image_coverage_percent": percentage(totals["cards_with_image"], totals["cards"]),
        "image_slot_coverage_percent": percentage(totals["filled_image_slots"], totals["image_slots"]),
    }
    report = {
        "schema_version": 1,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "totals": totals_report,
        "sources": {
            "definitions": {"tcgdex": {"name": "TCGdex"}},
            "matched_sets": totals["sets"],
            "matched_cards": totals["cards"],
            "metadata_fields_filled": 0,
        },
        "languages": language_report,
        "missing_metadata": {field: ids for field, ids in missing_metadata.items() if ids},
        "missing_set_assets": missing_set_assets,
        "series": {
            series_id: {
                "name": series_metadata.get(series_id, {}).get("name", series_id),
                "region_id": series_metadata.get(series_id, {}).get("region_id", "unknown"),
                "sets": counts["sets"],
                "cards": counts["cards"],
                "cards_with_image": counts["cards_with_image"],
                "cards_without_image": counts["cards"] - counts["cards_with_image"],
                "percent": percentage(counts["cards_with_image"], counts["cards"]),
            }
            for series_id, counts in sorted(series_totals.items())
        },
        "sets": sorted(
            set_reports,
            key=lambda row: (row["region_id"], row["release_date"], row["name"]),
        ),
    }
    write(output, report)
    return report


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--data", default="app/data")
    parser.add_argument("--output", help="Defaults to <data>/coverage.json.")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    root = Path(__file__).resolve().parents[1]
    data_root = (root / args.data).resolve()
    output = (root / args.output).resolve() if args.output else data_root / "coverage.json"
    report = generate_coverage(data_root, output)
    totals = report["totals"]
    print("Coverage generated")
    print(f"  Sets:            {totals['sets']}")
    print(f"  Cards:           {totals['cards']}")
    print(f"  Variants:        {totals['variants']}")
    print(f"  Card coverage:   {totals['card_image_coverage_percent']:.2f}%")
    print(f"  Image coverage:  {totals['image_slot_coverage_percent']:.2f}%")
    print(f"  Output:           {output}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
