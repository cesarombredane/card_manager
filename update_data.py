#!/usr/bin/env python3
"""Run the complete Card Manager data update pipeline."""

from __future__ import annotations

import argparse
import os
import shutil
import subprocess
import sys
import time
from pathlib import Path

from scripts.update_logging import duration, log, title

PROJECT_ROOT = Path(__file__).resolve().parent
APP_DATA = PROJECT_ROOT / "app" / "data"
PERSONAL_DATA_FILES = ("collection.json", "binders.json", "manual-images.json")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    modes = parser.add_mutually_exclusive_group()
    modes.add_argument(
        "--reset",
        action="store_true",
        help="Rebuild the TCGdex catalog and image caches, preserving personal data.",
    )
    modes.add_argument(
        "--prices",
        action="store_true",
        help="Only refresh prices of existing cards and validate the application.",
    )
    return parser.parse_args()


def run_stage(label: str, command: list[str], *, cwd: Path = PROJECT_ROOT) -> None:
    title(label)
    started = time.monotonic()
    subprocess.run(command, cwd=cwd, check=True)
    log(f"Stage complete in {duration(time.monotonic() - started)}")


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


def reset_generated_caches() -> None:
    """Discard generated assets while leaving manual images and user data intact."""
    image_root = PROJECT_ROOT / "app" / "public" / "images"
    for name in ("cards", "sets"):
        path = image_root / name
        if path.exists():
            shutil.rmtree(path)
    (image_root / ".tcgdex-missing-assets.json").unlink(missing_ok=True)
    (PROJECT_ROOT / "tcgdex_data" / "cardmarket-price-guide.json").unlink(missing_ok=True)


def main() -> int:
    args = parse_args()
    started = time.monotonic()
    python = sys.executable

    stages: list[tuple[str, list[str], Path]] = []
    if not args.prices:
        stages.append(
            ("1. Updating the TCGdex source checkout", [python, "scripts/fetch_tcgdex.py"], PROJECT_ROOT),
        )

        catalog_command = [python, "scripts/update_tcgdex_data.py"]
        if args.reset:
            catalog_command.append("--overwrite")
        stages.append(("2. Updating catalog data", catalog_command, PROJECT_ROOT))

    stages.append((
        "Refreshing Cardmarket prices",
        [python, "scripts/update_cardmarket_prices.py"],
        PROJECT_ROOT,
    ))

    if not args.prices:
        image_command = [python, "scripts/update_tcgdex_images.py"]
        stages.append(("4. Updating images", image_command, PROJECT_ROOT))

        stages.append((
            "5. Generating the final coverage report",
            [python, "scripts/report_coverage.py"],
            PROJECT_ROOT,
        ))

    stages.append(("Validating the application", ["npm", "run", "typecheck"], PROJECT_ROOT / "app"))

    personal_data = preserve_personal_data() if args.reset else {}
    try:
        for label, command, cwd in stages:
            run_stage(label, command, cwd=cwd)
            if command[1:2] == ["scripts/update_tcgdex_data.py"] and personal_data:
                restore_personal_data(personal_data)
            if args.reset and command[1:2] == ["scripts/update_tcgdex_data.py"]:
                reset_generated_caches()
    except subprocess.CalledProcessError as error:
        restore_personal_data(personal_data)
        log(f"Update stopped because a stage failed with exit code {error.returncode}.", file=sys.stderr)
        return error.returncode or 1
    except KeyboardInterrupt:
        restore_personal_data(personal_data)
        log("Update interrupted.", file=sys.stderr)
        return 130

    log(f"Data update completed successfully in {duration(time.monotonic() - started)}.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
