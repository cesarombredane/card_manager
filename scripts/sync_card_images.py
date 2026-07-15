#!/usr/bin/env python3
"""Cache localized TCGdex card scans and update generated card metadata."""

from __future__ import annotations

import argparse
import json
import os
import re
import sys
from pathlib import Path
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.parse import quote
from urllib.request import Request, urlopen


API_ROOT = "https://api.tcgdex.net/v2"
USER_AGENT = "card-manager-card-image-cache/1.0"
API_LANGUAGE_CODES = {
    "es-mx": "es",
    "pt-BR": "pt-br",
    "zh-CN": "zh-cn",
    "zh-TW": "zh-tw",
}


def parse_args() -> argparse.Namespace:
    """Parse command-line options."""
    parser = argparse.ArgumentParser(description="Cache TCGdex card scans as local WebP files.")
    parser.add_argument("--data", default="app/data", help="Generated app data directory.")
    parser.add_argument("--cache", default="app/public/images/cards", help="Local public image cache directory.")
    parser.add_argument("--set", dest="set_ids", action="append", help="Only synchronize this local set id; repeatable.")
    parser.add_argument("--card", dest="card_ids", action="append", help="Only synchronize this local card id or number; repeatable.")
    parser.add_argument("--language", dest="language_ids", action="append", help="Only synchronize this language id; repeatable.")
    parser.add_argument("--refresh-missing", action="store_true", help="Retry scans previously reported missing.")
    parser.add_argument("--timeout", type=float, default=20.0, help="HTTP request timeout in seconds.")
    return parser.parse_args()


def read_json(path: Path, fallback: Any) -> Any:
    """Read JSON when present, otherwise return a fallback value."""
    if not path.exists():
        return fallback
    return json.loads(path.read_text(encoding="utf-8"))


def write_json(path: Path, value: Any) -> None:
    """Write stable JSON atomically."""
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary_path = path.with_suffix(f"{path.suffix}.tmp")
    temporary_path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    os.replace(temporary_path, path)


def request_json(url: str, timeout: float) -> Any:
    """Fetch one JSON document from TCGdex."""
    request = Request(url, headers={"Accept": "application/json", "User-Agent": USER_AGENT})
    with urlopen(request, timeout=timeout) as response:
        return json.load(response)


def image_download_url(asset_url: str) -> str:
    """Return the high-quality WebP URL for a TCGdex extensionless image asset."""
    clean_url = asset_url.rstrip("/")
    if clean_url.lower().endswith(".webp"):
        return clean_url
    return f"{clean_url}/high.webp"


def download_webp(url: str, destination: Path, timeout: float) -> None:
    """Download a WebP asset atomically and reject unexpected response bodies."""
    request = Request(image_download_url(url), headers={"Accept": "image/webp", "User-Agent": USER_AGENT})
    with urlopen(request, timeout=timeout) as response:
        payload = response.read()

    if len(payload) < 12 or payload[:4] != b"RIFF" or payload[8:12] != b"WEBP":
        raise ValueError(f"TCGdex did not return a WebP image for {image_download_url(url)}")

    destination.parent.mkdir(parents=True, exist_ok=True)
    temporary_path = destination.with_suffix(".webp.tmp")
    temporary_path.write_bytes(payload)
    os.replace(temporary_path, destination)


def api_language_code(language_id: str) -> str:
    """Map an application language id to the corresponding TCGdex API code."""
    return API_LANGUAGE_CODES.get(language_id, language_id.lower())


def safe_card_filename(card: dict[str, Any]) -> str:
    """Return a stable filesystem-safe filename derived from the local card number."""
    number = str(card.get("number") or card.get("id") or "unknown")
    safe_number = re.sub(r"[^A-Za-z0-9._-]+", "-", number).strip("-.")
    return safe_number or str(card.get("id") or "unknown")


def status_key(set_id: str, language_id: str, card: dict[str, Any]) -> str:
    """Return the manifest key for one localized card scan."""
    return f"{set_id}/{language_id}/{card.get('id', safe_card_filename(card))}"


def public_asset_url(set_id: str, language_id: str, card: dict[str, Any]) -> str:
    """Return the Vite public URL for a cached card scan."""
    return f"/images/cards/{set_id}/{language_id}/{safe_card_filename(card)}.webp"


def card_catalog(rows: Any) -> tuple[dict[str, dict[str, Any]], dict[str, dict[str, Any]]]:
    """Index TCGdex card briefs by API id and local card number."""
    cards = rows.get("cards", []) if isinstance(rows, dict) else []
    by_id: dict[str, dict[str, Any]] = {}
    by_number: dict[str, dict[str, Any]] = {}
    for row in cards:
        if not isinstance(row, dict):
            continue
        if row.get("id") is not None:
            by_id[str(row["id"])] = row
        if row.get("localId") is not None:
            by_number[str(row["localId"])] = row
    return by_id, by_number


def find_api_card(
    card: dict[str, Any], tcgdex_set_id: str, by_id: dict[str, dict[str, Any]], by_number: dict[str, dict[str, Any]]
) -> dict[str, Any] | None:
    """Match a generated card to its TCGdex card brief."""
    number = str(card.get("number") or "")
    for candidate_id in (f"{tcgdex_set_id}-{number}", str(card.get("id") or "")):
        if candidate_id in by_id:
            return by_id[candidate_id]
    return by_number.get(number)


def main() -> int:
    """Download uncached scans and update card variants to use local URLs."""
    args = parse_args()
    project_root = Path(__file__).resolve().parents[1]
    data_root = (project_root / args.data).resolve()
    cache_root = (project_root / args.cache).resolve()
    status_path = cache_root / ".asset-status.json"
    status: dict[str, str | None] = read_json(status_path, {})
    selected_sets = set(args.set_ids or [])
    selected_cards = set(args.card_ids or [])
    selected_languages = set(args.language_ids or [])
    api_requests = downloaded = cached = unavailable = failures = 0

    cache_root.mkdir(parents=True, exist_ok=True)

    for sets_path in sorted(data_root.glob("*/sets.json")):
        sets = read_json(sets_path, [])
        for set_row in sets:
            set_id = str(set_row["id"])
            if selected_sets and set_id not in selected_sets:
                continue

            cards_path = sets_path.parent / f"cards_{set_id}.json"
            all_cards = read_json(cards_path, [])
            if not cards_path.exists():
                continue
            cards = [
                card for card in all_cards
                if not selected_cards or str(card.get("id")) in selected_cards or str(card.get("number")) in selected_cards
            ]
            if not cards:
                continue

            tcgdex_set_id = str(set_row["tcgdex_id"])
            for language_id in set_row.get("language_ids", []):
                language_id = str(language_id)
                if selected_languages and language_id not in selected_languages:
                    continue

                destinations = {
                    str(card["id"]): cache_root / set_id / language_id / f"{safe_card_filename(card)}.webp"
                    for card in cards
                }
                pending = [
                    card for card in cards
                    if not destinations[str(card["id"])].exists()
                    and (status_key(set_id, language_id, card) not in status or args.refresh_missing)
                ]
                by_id: dict[str, dict[str, Any]] = {}
                by_number: dict[str, dict[str, Any]] = {}
                lookup_completed = False

                if pending:
                    api_language = api_language_code(language_id)
                    url = f"{API_ROOT}/{quote(api_language)}/sets/{quote(tcgdex_set_id)}"
                    try:
                        by_id, by_number = card_catalog(request_json(url, args.timeout))
                        api_requests += 1
                        lookup_completed = True
                    except (HTTPError, URLError, TimeoutError, ValueError, json.JSONDecodeError) as error:
                        print(f"Could not query TCGdex set {tcgdex_set_id} for {language_id}: {error}", file=sys.stderr)
                        failures += 1

                for card in pending:
                    key = status_key(set_id, language_id, card)
                    if lookup_completed:
                        api_card = find_api_card(card, tcgdex_set_id, by_id, by_number)
                        status[key] = str(api_card["image"]) if api_card and api_card.get("image") else None
                    asset_url = status.get(key)
                    if not asset_url:
                        unavailable += 1
                        continue
                    try:
                        download_webp(asset_url, destinations[str(card["id"])], args.timeout)
                        downloaded += 1
                    except (HTTPError, URLError, TimeoutError, ValueError) as error:
                        print(f"Could not download {card['id']} ({language_id}): {error}", file=sys.stderr)
                        failures += 1

                changed = False
                for card in cards:
                    destination = destinations[str(card["id"])]
                    local_url = public_asset_url(set_id, language_id, card) if destination.exists() else ""
                    if destination.exists():
                        cached += 1
                    for variant in card.get("variants", []):
                        images = variant.setdefault("images", {})
                        if images.get(language_id) != local_url:
                            images[language_id] = local_url
                            changed = True

                if changed:
                    write_json(cards_path, all_cards)

    write_json(status_path, status)
    print(f"TCGdex set requests: {api_requests}")
    print(f"Downloaded WebP assets: {downloaded}")
    print(f"Local asset references: {cached}")
    print(f"Unavailable assets: {unavailable}")
    print(f"Failures: {failures}")
    return 1 if failures else 0


if __name__ == "__main__":
    raise SystemExit(main())
