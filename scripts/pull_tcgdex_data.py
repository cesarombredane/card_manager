#!/usr/bin/env python3
"""Refresh local raw TCGdex data from tcgdex/cards-database.

The script intentionally downloads only the upstream `data/` and `data-asia/`
folders. The result is copied into `tcgdex_data/` at the project root so a later
converter can reshape it into the app's own data model.
"""

from __future__ import annotations

import argparse
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path


TCGDEX_REPOSITORY_URL = "https://github.com/tcgdex/cards-database.git"
SPARSE_FOLDERS = ("data", "data-asia")


def run_command(command: list[str], cwd: Path | None = None) -> str:
    """Run a command and return its standard output."""
    result = subprocess.run(
        command,
        cwd=cwd,
        check=True,
        text=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
    )
    return result.stdout.strip()


def clone_sparse_repository(repository_url: str, clone_path: Path) -> None:
    """Clone the repository without blobs, ready for sparse checkout."""
    run_command([
        "git",
        "clone",
        "--depth",
        "1",
        "--filter=blob:none",
        "--sparse",
        repository_url,
        str(clone_path),
    ])


def checkout_data_folders(clone_path: Path) -> None:
    """Hydrate only the data folders needed from the sparse clone."""
    run_command(["git", "sparse-checkout", "set", *SPARSE_FOLDERS], cwd=clone_path)


def copy_data_folders(clone_path: Path, output_path: Path) -> None:
    """Replace the output folder with the freshly pulled data folders."""
    staging_path = output_path.with_name(f"{output_path.name}.tmp")

    if staging_path.exists():
        shutil.rmtree(staging_path)

    staging_path.mkdir(parents=True)

    for folder_name in SPARSE_FOLDERS:
        shutil.copytree(clone_path / folder_name, staging_path / folder_name)

    if output_path.exists():
        shutil.rmtree(output_path)

    staging_path.rename(output_path)


def count_files(output_path: Path) -> int:
    """Count every copied file in the refreshed output folder."""
    return sum(1 for path in output_path.rglob("*") if path.is_file())


def parse_args() -> argparse.Namespace:
    """Parse command line arguments."""
    parser = argparse.ArgumentParser(description="Pull raw TCGdex data folders into tcgdex_data/.")
    parser.add_argument(
        "--repository-url",
        default=TCGDEX_REPOSITORY_URL,
        help="Git repository URL to clone.",
    )
    parser.add_argument(
        "--output",
        default="tcgdex_data",
        help="Output folder to refresh.",
    )
    return parser.parse_args()


def main() -> int:
    """Pull the upstream data folders and refresh the local output folder."""
    args = parse_args()
    project_root = Path(__file__).resolve().parents[1]
    output_path = (project_root / args.output).resolve()

    with tempfile.TemporaryDirectory(prefix="tcgdex-cards-database-") as temporary_directory:
        clone_path = Path(temporary_directory) / "cards-database"

        print(f"Cloning {args.repository_url}")
        clone_sparse_repository(args.repository_url, clone_path)

        print(f"Checking out {', '.join(SPARSE_FOLDERS)}")
        checkout_data_folders(clone_path)

        commit_sha = run_command(["git", "rev-parse", "HEAD"], cwd=clone_path)

        print(f"Refreshing {output_path}")
        copy_data_folders(clone_path, output_path)

    print(f"Pulled tcgdex/cards-database at {commit_sha}")
    print(f"Copied {count_files(output_path)} files into {output_path}")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except subprocess.CalledProcessError as error:
        print(error.stderr.strip() or str(error), file=sys.stderr)
        raise SystemExit(error.returncode)
