#!/usr/bin/env python3
"""Cache TCGdex set logos and symbols locally and update generated set metadata."""

from __future__ import annotations

import argparse
import json
import os
import sys
from pathlib import Path
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen


API_ROOT = "https://api.tcgdex.net/v2"
USER_AGENT = "card-manager-set-image-cache/1.0"
API_LANGUAGE_CODES = {
    "es-mx": "es",
    "pt-BR": "pt-br",
    "zh-CN": "zh-cn",
    "zh-TW": "zh-tw",
}


def parse_args() -> argparse.Namespace:
    """Parse command-line options."""
    parser = argparse.ArgumentParser(description="Cache TCGdex set logos and symbols as local WebP files.")
    parser.add_argument("--data", default="app/data", help="Generated app data directory.")
    parser.add_argument("--cache", default="app/public/images/sets", help="Local public image cache directory.")
    parser.add_argument("--refresh-missing", action="store_true", help="Retry assets previously reported missing.")
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


def download_webp(url: str, destination: Path, timeout: float) -> None:
    """Download a WebP asset atomically and reject unexpected response bodies."""
    webp_url = url if url.lower().endswith(".webp") else f"{url}.webp"
    request = Request(webp_url, headers={"Accept": "image/webp", "User-Agent": USER_AGENT})
    with urlopen(request, timeout=timeout) as response:
        payload = response.read()

    if len(payload) < 12 or payload[:4] != b"RIFF" or payload[8:12] != b"WEBP":
        raise ValueError(f"TCGdex did not return a WebP image for {webp_url}")

    destination.parent.mkdir(parents=True, exist_ok=True)
    temporary_path = destination.with_suffix(".webp.tmp")
    temporary_path.write_bytes(payload)
    os.replace(temporary_path, destination)


def preferred_languages(language_ids: list[str]) -> list[str]:
    """Prefer English, then Japanese, while retaining every distributed language."""
    ordered = [language for language in ("en", "ja", *language_ids) if language in language_ids]
    return list(dict.fromkeys(ordered))


def public_asset_url(set_id: str, asset_name: str) -> str:
    """Return the Vite public URL for a cached set asset."""
    return f"/images/sets/{set_id}/{asset_name}.webp"


def main() -> int:
    """Download uncached artwork and update set JSON files to use local URLs."""
    args = parse_args()
    project_root = Path(__file__).resolve().parents[1]
    data_root = (project_root / args.data).resolve()
    cache_root = (project_root / args.cache).resolve()
    status_path = cache_root / ".asset-status.json"
    status: dict[str, dict[str, str | None]] = read_json(status_path, {})
    catalogs: dict[str, dict[str, dict[str, Any]]] = {}
    failed_languages: set[str] = set()
    api_requests = 0
    downloaded = 0
    cached = 0
    unavailable = 0
    failures = 0

    def catalog(language_id: str) -> dict[str, dict[str, Any]]:
        nonlocal api_requests
        api_language = API_LANGUAGE_CODES.get(language_id, language_id.lower())
        if api_language not in catalogs:
            rows = request_json(f"{API_ROOT}/{api_language}/sets", args.timeout)
            catalogs[api_language] = {str(row.get("id")): row for row in rows if isinstance(row, dict)}
            api_requests += 1
        return catalogs[api_language]

    cache_root.mkdir(parents=True, exist_ok=True)

    for sets_path in sorted(data_root.glob("*/sets.json")):
        sets = read_json(sets_path, [])
        changed = False

        for set_row in sets:
            set_id = str(set_row["id"])
            tcgdex_id = str(set_row["tcgdex_id"])
            set_status = status.setdefault(set_id, {})
            destinations = {
                "logo": cache_root / set_id / "logo.webp",
                "symbol": cache_root / set_id / "symbol.webp",
            }
            missing_assets = [name for name, path in destinations.items() if not path.exists()]

            if missing_assets:
                needs_lookup = any(
                    name not in set_status or (args.refresh_missing and set_status.get(name) is None)
                    for name in missing_assets
                )
                if needs_lookup:
                    discovered_urls: dict[str, str] = {}
                    completed_lookup = False
                    for language_id in preferred_languages(list(set_row.get("language_ids", []))):
                        api_language = API_LANGUAGE_CODES.get(language_id, language_id.lower())
                        if api_language in failed_languages:
                            continue
                        try:
                            api_set = catalog(language_id).get(tcgdex_id)
                            completed_lookup = True
                        except (HTTPError, URLError, TimeoutError, ValueError, json.JSONDecodeError) as error:
                            print(f"Could not query TCGdex sets for {language_id}: {error}", file=sys.stderr)
                            failed_languages.add(api_language)
                            failures += 1
                            continue
                        if api_set:
                            for asset_name in missing_assets:
                                asset_url = api_set.get(asset_name)
                                if asset_url and asset_name not in discovered_urls:
                                    discovered_urls[asset_name] = str(asset_url)
                        if all(asset_name in discovered_urls for asset_name in missing_assets):
                            break

                    if completed_lookup:
                        for asset_name in missing_assets:
                            if asset_name not in set_status or args.refresh_missing:
                                set_status[asset_name] = discovered_urls.get(asset_name)

                for asset_name in missing_assets:
                    asset_url = set_status.get(asset_name)
                    if not asset_url:
                        unavailable += 1
                        continue
                    try:
                        download_webp(asset_url, destinations[asset_name], args.timeout)
                        downloaded += 1
                    except (HTTPError, URLError, TimeoutError, ValueError) as error:
                        print(f"Could not download {set_id} {asset_name}: {error}", file=sys.stderr)
                        failures += 1

            for asset_name, destination in destinations.items():
                local_url = public_asset_url(set_id, asset_name) if destination.exists() else None
                field_name = "title_image_url" if asset_name == "logo" else "symbol_image_url"
                if set_row.get(field_name) != local_url:
                    set_row[field_name] = local_url
                    changed = True
                if destination.exists():
                    cached += 1

        if changed:
            write_json(sets_path, sets)

    write_json(status_path, status)
    print(f"TCGdex catalog requests: {api_requests}")
    print(f"Downloaded WebP assets: {downloaded}")
    print(f"Local asset references: {cached}")
    print(f"Unavailable assets: {unavailable}")
    print(f"Failures: {failures}")
    return 1 if failures else 0


if __name__ == "__main__":
    raise SystemExit(main())
