#!/usr/bin/env python3
"""Create or update the persistent, sparse TCGdex source checkout."""

from __future__ import annotations

import subprocess
import sys
from pathlib import Path


REPOSITORY_URL = "https://github.com/tcgdex/cards-database.git"
SPARSE_FOLDERS = ("data", "data-asia")


def run(command: list[str], cwd: Path | None = None) -> str:
    result = subprocess.run(command, cwd=cwd, check=True, text=True, capture_output=True)
    return result.stdout.strip()


def main() -> int:
    project_root = Path(__file__).resolve().parents[1]
    checkout = project_root / "tcgdex_data" / "cards-database"

    if checkout.exists() and not (checkout / ".git").is_dir():
        print(f"Refusing to replace non-Git path: {checkout}", file=sys.stderr)
        return 1

    if not checkout.exists():
        checkout.parent.mkdir(parents=True, exist_ok=True)
        print(f"Cloning TCGdex into {checkout}")
        run([
            "git", "clone", "--depth", "1", "--filter=blob:none", "--sparse",
            REPOSITORY_URL, str(checkout),
        ])
        run(["git", "sparse-checkout", "set", *SPARSE_FOLDERS], cwd=checkout)
    else:
        print(f"Updating existing TCGdex checkout in {checkout}")
        run(["git", "pull", "--ff-only"], cwd=checkout)
        run(["git", "sparse-checkout", "set", *SPARSE_FOLDERS], cwd=checkout)

    print(f"TCGdex checkout ready at commit {run(['git', 'rev-parse', 'HEAD'], cwd=checkout)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
