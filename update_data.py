#!/usr/bin/env python3
"""Run the complete Card Manager data update pipeline."""

from __future__ import annotations

import argparse
import os
import subprocess
import sys
import time
from pathlib import Path


PROJECT_ROOT = Path(__file__).resolve().parent
APP_DATA = PROJECT_ROOT / "app" / "data"
PERSONAL_DATA_FILES = ("collection.json", "binders.json", "manual-images.json")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--overwrite",
        action="store_true",
        help="Replace catalog data and recheck assets previously marked unavailable.",
    )
    parser.add_argument(
        "--skip-images",
        action="store_true",
        help="Skip image processing and preserve all existing catalog image references.",
    )
    parser.add_argument(
        "--skip-prices",
        action="store_true",
        help="Skip all price processing and preserve existing Cardmarket data.",
    )
    parser.add_argument("--skip-validation", action="store_true", help="Skip the final app typecheck.")
    return parser.parse_args()


def run_stage(label: str, command: list[str], *, cwd: Path = PROJECT_ROOT) -> None:
    print(f"\n{'=' * 72}\n{label}\n{'=' * 72}", flush=True)
    subprocess.run(command, cwd=cwd, check=True)


def preserve_personal_data() -> dict[Path, bytes]:
    return {
        path: path.read_bytes()
        for filename in PERSONAL_DATA_FILES
        if (path := APP_DATA / filename).is_file()
    }


def restore_personal_data(files: dict[Path, bytes]) -> None:
    for path, contents in files.items():
        path.parent.mkdir(parents=True, exist_ok=True)
        temporary = path.with_suffix(f"{path.suffix}.update-data.tmp")
        temporary.write_bytes(contents)
        os.replace(temporary, path)


def main() -> int:
    args = parse_args()
    started = time.monotonic()
    python = sys.executable

    stages: list[tuple[str, list[str], Path]] = [
        ("1. Updating the TCGdex source checkout", [python, "scripts/fetch_tcgdex.py"], PROJECT_ROOT),
    ]

    catalog_command = [python, "scripts/update_tcgdex_data.py"]
    if args.overwrite:
        catalog_command.append("--overwrite")
    if args.skip_images:
        catalog_command.append("--preserve-images")
    if args.skip_prices:
        catalog_command.append("--preserve-prices")
    stages.append(("2. Updating catalog data", catalog_command, PROJECT_ROOT))

    if not args.skip_prices:
        stages.append((
            "3. Refreshing Cardmarket prices",
            [python, "scripts/update_cardmarket_prices.py"],
            PROJECT_ROOT,
        ))

    if not args.skip_images:
        image_command = [python, "scripts/update_tcgdex_images.py"]
        if args.overwrite:
            image_command.append("--overwrite")
        stages.append(("4. Updating images", image_command, PROJECT_ROOT))

    stages.append((
        "5. Generating the final coverage report",
        [python, "scripts/report_coverage.py"],
        PROJECT_ROOT,
    ))

    if not args.skip_validation:
        stages.append(("6. Validating the application", ["npm", "run", "typecheck"], PROJECT_ROOT / "app"))

    personal_data = preserve_personal_data() if args.overwrite else {}
    try:
        for label, command, cwd in stages:
            run_stage(label, command, cwd=cwd)
            if command[1:2] == ["scripts/update_tcgdex_data.py"] and personal_data:
                restore_personal_data(personal_data)
    except subprocess.CalledProcessError as error:
        restore_personal_data(personal_data)
        print(f"\nUpdate stopped because a stage failed with exit code {error.returncode}.", file=sys.stderr)
        return error.returncode or 1
    except KeyboardInterrupt:
        restore_personal_data(personal_data)
        print("\nUpdate interrupted.", file=sys.stderr)
        return 130

    print(f"\nData update completed successfully in {time.monotonic() - started:.1f}s.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
