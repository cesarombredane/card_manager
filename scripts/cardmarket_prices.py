#!/usr/bin/env python3
"""Shared Cardmarket price-guide download and normalization helpers."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any
from urllib.request import Request, urlopen


PRICE_GUIDE_URL = "https://downloads.s3.cardmarket.com/productCatalog/priceGuide/price_guide_6.json"
USER_AGENT = "card-manager-cardmarket-sync/1.0"
REQUEST_TIMEOUT = 60.0

NON_HOLO_FIELDS = {
    "average": "avg",
    "low": "low",
    "trend": "trend",
    "average_1d": "avg1",
    "average_7d": "avg7",
    "average_30d": "avg30",
}
HOLO_FIELDS = {
    "average": "avg-holo",
    "low": "low-holo",
    "trend": "trend-holo",
    "average_1d": "avg1-holo",
    "average_7d": "avg7-holo",
    "average_30d": "avg30-holo",
}


def product_url(product_id: int) -> str:
    """Return Cardmarket's stable numeric product redirect URL."""
    return f"https://www.cardmarket.com/en/Pokemon/Products?idProduct={product_id}"


def download_price_guide(cache_path: Path | None = None) -> dict[str, Any]:
    """Download the price guide, falling back to a previously cached response."""
    request = Request(PRICE_GUIDE_URL, headers={"Accept": "application/json", "User-Agent": USER_AGENT})
    try:
        with urlopen(request, timeout=REQUEST_TIMEOUT) as response:
            payload = response.read()
        guide = json.loads(payload)
        if cache_path:
            cache_path.parent.mkdir(parents=True, exist_ok=True)
            temporary = cache_path.with_suffix(f"{cache_path.suffix}.tmp")
            temporary.write_bytes(payload)
            temporary.replace(cache_path)
        return guide
    except Exception:
        if cache_path and cache_path.exists():
            return json.loads(cache_path.read_text(encoding="utf-8"))
        raise


def index_price_guide(guide: dict[str, Any]) -> tuple[str, dict[int, dict[str, Any]]]:
    """Return the guide timestamp and product rows indexed by Cardmarket ID."""
    updated_at = str(guide.get("createdAt") or "")
    rows = {
        int(row["idProduct"]): row
        for row in guide.get("priceGuides", [])
        if isinstance(row, dict) and isinstance(row.get("idProduct"), int)
    }
    return updated_at, rows


def normalized_price(
    product_id: int,
    row: dict[str, Any],
    updated_at: str,
    *,
    use_holo_fields: bool = False,
    url: str | None = None,
) -> dict[str, Any]:
    """Convert one Cardmarket price-guide row into the app JSON contract."""
    fields = HOLO_FIELDS if use_holo_fields else NON_HOLO_FIELDS
    values = {
        output_name: row.get(input_name)
        for output_name, input_name in fields.items()
    }
    # Detailed variant product IDs normally use the non-holo columns. Older
    # card-level mappings may only expose the dedicated holo columns.
    if use_holo_fields and not any(value is not None for value in values.values()):
        values = {
            output_name: row.get(input_name)
            for output_name, input_name in NON_HOLO_FIELDS.items()
        }
    return {
        "product_id": product_id,
        "currency": "EUR",
        "updated_at": updated_at,
        "price_kind": "holo" if use_holo_fields else "standard",
        **values,
        "url": url,
    }
