#!/usr/bin/env python3
"""Report generated metadata and local asset coverage by language and series."""

from __future__ import annotations

import argparse
import json
from collections import Counter, defaultdict
from pathlib import Path
from typing import Any


def read(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--data", default="app/data")
    parser.add_argument("--output", default="reports/data-coverage.json")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    root = Path(__file__).resolve().parents[1]
    data_root = (root / args.data).resolve()
    totals: Counter[str] = Counter()
    languages: dict[str, Counter[str]] = defaultdict(Counter)
    series_report: dict[str, Counter[str]] = defaultdict(Counter)
    missing_fields: Counter[str] = Counter()

    for sets_path in sorted(data_root.glob("*/sets.json")):
        series = sets_path.parent.name
        for set_row in read(sets_path):
            totals["sets"] += 1
            series_report[series]["sets"] += 1
            for field in ("title_image_url", "symbol_image_url"):
                totals[field] += bool(set_row.get(field))
            cards_path = sets_path.parent / f"cards_{set_row['id']}.json"
            if not cards_path.exists():
                continue
            for card in read(cards_path):
                totals["cards"] += 1
                series_report[series]["cards"] += 1
                has_image = False
                for field in ("name", "category", "rarity", "illustrator"):
                    if card.get(field) in (None, "", [], {}):
                        missing_fields[field] += 1
                for variant in card.get("variants", []):
                    for language, url in variant.get("images", {}).items():
                        languages[language]["slots"] += 1
                        if url:
                            languages[language]["filled"] += 1
                            has_image = True
                totals["cards_with_image"] += has_image
                series_report[series]["cards_with_image"] += has_image

    report = {
        "totals": dict(totals),
        "missing_fields": dict(missing_fields),
        "languages": {key: dict(value) for key, value in sorted(languages.items())},
        "series": {key: dict(value) for key, value in sorted(series_report.items())},
    }
    output = (root / args.output).resolve()
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report["totals"], indent=2))
    print(json.dumps(report["missing_fields"], indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
