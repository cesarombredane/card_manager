#!/usr/bin/env python3
"""Cache missing assets from approved fallback providers using the generated source map."""

from __future__ import annotations

import argparse
import json
import os
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen


USER_AGENT = "card-manager-multisource-cache/1.0"


def read_json(path: Path, fallback: Any) -> Any:
    return json.loads(path.read_text(encoding="utf-8")) if path.exists() else fallback


def write_json(path: Path, value: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_suffix(f"{path.suffix}.tmp")
    temporary.write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    os.replace(temporary, path)


def extension(payload: bytes) -> str:
    if payload.startswith(b"\x89PNG\r\n\x1a\n"):
        return ".png"
    if payload.startswith(b"\xff\xd8\xff"):
        return ".jpg"
    if len(payload) >= 12 and payload[:4] == b"RIFF" and payload[8:12] == b"WEBP":
        return ".webp"
    raise ValueError("response is not a supported image")


def download(url: str, base_destination: Path, timeout: float) -> Path:
    request = Request(url, headers={"Accept": "image/*", "User-Agent": USER_AGENT})
    with urlopen(request, timeout=timeout) as response:
        payload = response.read()
    destination = base_destination.with_suffix(extension(payload))
    destination.parent.mkdir(parents=True, exist_ok=True)
    temporary = destination.with_suffix(f"{destination.suffix}.tmp")
    temporary.write_bytes(payload)
    os.replace(temporary, destination)
    return destination


def existing_asset(base: Path) -> Path | None:
    return next((base.with_suffix(suffix) for suffix in (".webp", ".png", ".jpg") if base.with_suffix(suffix).exists()), None)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--data", default="app/data")
    parser.add_argument("--set-cache", default="app/public/images/sets")
    parser.add_argument("--card-cache", default="app/public/images/cards")
    parser.add_argument("--workers", type=int, default=8)
    parser.add_argument("--timeout", type=float, default=30.0)
    parser.add_argument("--limit", type=int, help="Download at most this many uncached assets for a pilot run.")
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--refresh-missing", action="store_true", help="Retry URLs previously returning 404.")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    project_root = Path(__file__).resolve().parents[1]
    data_root = (project_root / args.data).resolve()
    set_cache = (project_root / args.set_cache).resolve()
    card_cache = (project_root / args.card_cache).resolve()
    source_map = read_json(data_root / "source-map.json", {})
    status_path = card_cache / ".fallback-status.json"
    known_missing: dict[str, None] = read_json(status_path, {})
    set_map = source_map.get("sets", {})
    card_map = source_map.get("cards", {})
    tasks: list[tuple[str, str, Path]] = []

    for sets_path in sorted(data_root.glob("*/sets.json")):
        sets = read_json(sets_path, [])
        for set_row in sets:
            mapping = set_map.get(set_row["id"], {})
            for asset, url_key in (("logo", "logo_url"), ("symbol", "symbol_url")):
                base = set_cache / set_row["id"] / asset
                if not existing_asset(base) and mapping.get(url_key) and (args.refresh_missing or mapping[url_key] not in known_missing):
                    tasks.append((f"set:{set_row['id']}:{asset}", mapping[url_key], base))

            cards_path = sets_path.parent / f"cards_{set_row['id']}.json"
            for card in read_json(cards_path, []):
                mapping = card_map.get(card["id"], {})
                if not mapping.get("image_large"):
                    continue
                base = card_cache / set_row["id"] / "en" / str(card.get("number") or card["id"])
                if not existing_asset(base) and (args.refresh_missing or mapping["image_large"] not in known_missing):
                    tasks.append((f"card:{card['id']}:en", mapping["image_large"], base))

    pending = tasks[:args.limit] if args.limit else tasks
    print(f"Fallback candidates: {len(tasks)}; selected: {len(pending)}")
    if args.dry_run:
        return 0

    downloaded: dict[str, Path] = {}
    failures: dict[str, str] = {}
    unavailable: dict[str, str] = {}
    with ThreadPoolExecutor(max_workers=max(1, args.workers)) as executor:
        futures = {executor.submit(download, url, base, args.timeout): key for key, url, base in pending}
        for future in as_completed(futures):
            key = futures[future]
            try:
                downloaded[key] = future.result()
            except HTTPError as error:
                task_url = next(url for task_key, url, _base in pending if task_key == key)
                if error.code == 404:
                    known_missing[task_url] = None
                    unavailable[key] = str(error)
                else:
                    failures[key] = str(error)
            except (URLError, TimeoutError, ValueError, OSError) as error:
                failures[key] = str(error)

    for sets_path in sorted(data_root.glob("*/sets.json")):
        sets = read_json(sets_path, [])
        sets_changed = False
        for set_row in sets:
            for asset, field in (("logo", "title_image_url"), ("symbol", "symbol_image_url")):
                path = existing_asset(set_cache / set_row["id"] / asset)
                if path and not set_row.get(field):
                    set_row[field] = f"/images/sets/{set_row['id']}/{path.name}"
                    sets_changed = True
            cards_path = sets_path.parent / f"cards_{set_row['id']}.json"
            cards = read_json(cards_path, [])
            cards_changed = False
            for card in cards:
                path = existing_asset(card_cache / set_row["id"] / "en" / str(card.get("number") or card["id"]))
                if not path:
                    continue
                public_url = f"/images/cards/{set_row['id']}/en/{path.name}"
                for variant in card.get("variants", []):
                    images = variant.setdefault("images", {})
                    if "en" in images and not images["en"]:
                        images["en"] = public_url
                        cards_changed = True
            if cards_changed:
                write_json(cards_path, cards)
        if sets_changed:
            write_json(sets_path, sets)

    write_json(status_path, known_missing)
    status = {
        "candidates": len(tasks),
        "selected": len(pending),
        "downloaded": len(downloaded),
        "unavailable": unavailable,
        "failures": failures,
    }
    write_json(project_root / "reports" / "fallback-assets.json", status)
    print(json.dumps({
        "candidates": len(tasks),
        "selected": len(pending),
        "downloaded": len(downloaded),
        "unavailable": len(unavailable),
        "failures": len(failures),
    }, indent=2))
    if failures:
        print(f"Failures: {len(failures)}")
    return 1 if failures else 0


if __name__ == "__main__":
    raise SystemExit(main())
