#!/usr/bin/env python3
"""Download TCGdex images and update image references in existing app data."""

from __future__ import annotations

import argparse
import sys
import time
from pathlib import Path

from update_logging import duration, log

from report_coverage import generate_coverage
from update_tcgdex_data import IMAGE_WORKERS, REQUEST_TIMEOUT, sync_assets


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--set-only",
        action="store_true",
        help="Download and update set logos and symbols without processing card images.",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    started = time.monotonic()
    project_root = Path(__file__).resolve().parents[1]
    data_root = project_root / "app" / "data"
    public_root = project_root / "app" / "public" / "images"

    if not (data_root / "series.json").exists():
        log(f"Missing generated card data: {data_root}")
        return 1

    result = sync_assets(
        data_root,
        public_root,
        IMAGE_WORKERS,
        REQUEST_TIMEOUT,
        set_only=args.set_only,
    )
    coverage = generate_coverage(data_root, data_root / "coverage.json")

    log("Image update finished with errors" if result["failures"] else "Image update complete",
        file=sys.stderr if result["failures"] else None)
    log(f"Checked {result['candidates']:,} assets · downloaded {result['downloaded']:,} · "
        f"unavailable {result['unavailable']:,} · failed {result['failures']:,}")
    log(f"Filled {result['filled_references']:,} references · "
        f"image coverage {coverage['totals']['image_slot_coverage_percent']:.2f}% · "
        f"elapsed {duration(time.monotonic() - started)}")
    return 1 if result["failures"] else 0


if __name__ == "__main__":
    raise SystemExit(main())
