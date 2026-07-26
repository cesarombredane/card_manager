#!/usr/bin/env python3
"""Download TCGdex images and update image references in existing app data."""

from __future__ import annotations

import argparse
import time
from pathlib import Path

from report_coverage import generate_coverage
from update_tcgdex_data import IMAGE_WORKERS, REQUEST_TIMEOUT, sync_assets


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--overwrite",
        action="store_true",
        help="Recheck known-missing assets; existing cached image files remain reusable.",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    started = time.monotonic()
    project_root = Path(__file__).resolve().parents[1]
    data_root = project_root / "app" / "data"
    public_root = project_root / "app" / "public" / "images"

    if not (data_root / "series.json").exists():
        print(f"Missing generated card data: {data_root}")
        return 1

    missing_status = public_root / ".tcgdex-missing-assets.json"
    if args.overwrite and missing_status.exists():
        missing_status.unlink()

    result = sync_assets(data_root, public_root, IMAGE_WORKERS, REQUEST_TIMEOUT)
    coverage = generate_coverage(data_root, data_root / "coverage.json")

    print("\nImage update complete")
    print(f"  Mode:                 {'recheck unavailable' if args.overwrite else 'missing only'}")
    print(f"  Missing assets checked: {result['candidates']}")
    print(f"  Images downloaded:      {result['downloaded']}")
    print(f"  References filled:      {result['filled_references']}")
    print(f"  Known unavailable:      {result['unavailable']}")
    print(f"  Request failures:       {result['failures']}")
    print(f"  Image coverage:         {coverage['totals']['image_slot_coverage_percent']:.2f}%")
    print(f"  Total duration:         {time.monotonic() - started:.1f}s")
    return 1 if result["failures"] else 0


if __name__ == "__main__":
    raise SystemExit(main())
