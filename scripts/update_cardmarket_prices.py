#!/usr/bin/env python3
"""Update only Cardmarket price fields in the existing app card JSON files."""

from __future__ import annotations

import json
import os
import sys
from pathlib import Path
from typing import Any

from cardmarket_prices import download_price_guide, index_price_guide, normalized_price, product_url


def write_json_atomic(path: Path, value: Any) -> None:
    temporary = path.with_suffix(f"{path.suffix}.tmp")
    temporary.write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    os.replace(temporary, path)


def main() -> int:
    project_root = Path(__file__).resolve().parents[1]
    data_root = project_root / "app" / "data"
    cache_path = project_root / "tcgdex_data" / "cardmarket-price-guide.json"
    if not data_root.is_dir():
        print(f"Missing app data folder: {data_root}", file=sys.stderr)
        return 1

    print("Downloading Cardmarket price guide")
    try:
        guide = download_price_guide(cache_path)
    except Exception as error:
        print(f"Unable to load Cardmarket price guide: {error}", file=sys.stderr)
        return 1
    updated_at, prices = index_price_guide(guide)

    files_changed = variants_seen = variants_priced = missing_products = 0
    for cards_path in sorted(data_root.glob("*/cards_*.json")):
        cards = json.loads(cards_path.read_text(encoding="utf-8"))
        changed = False
        for card in cards:
            for variant in card.get("variants", []):
                variants_seen += 1
                existing = variant.get("cardmarket")
                if not isinstance(existing, dict) or not isinstance(existing.get("product_id"), int):
                    continue
                product_id = int(existing["product_id"])
                row = prices.get(product_id)
                if not row:
                    missing_products += 1
                    continue
                refreshed = normalized_price(
                    product_id,
                    row,
                    updated_at,
                    use_holo_fields=existing.get("price_kind") == "holo",
                    url=product_url(product_id),
                )
                variants_priced += 1
                if existing != refreshed:
                    variant["cardmarket"] = refreshed
                    changed = True
        if changed:
            write_json_atomic(cards_path, cards)
            files_changed += 1

    print("Cardmarket price update complete")
    print(f"  Guide updated:     {updated_at or 'unknown'}")
    print(f"  Variants scanned:  {variants_seen}")
    print(f"  Variants priced:   {variants_priced}")
    print(f"  Products missing:  {missing_products}")
    print(f"  Files changed:     {files_changed}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
