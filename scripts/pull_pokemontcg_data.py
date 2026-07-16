#!/usr/bin/env python3
"""Refresh the Pokémon TCG API's English data snapshot from its public repository."""

from __future__ import annotations

import argparse
import shutil
import subprocess
import tempfile
from pathlib import Path


REPOSITORY_URL = "https://github.com/PokemonTCG/pokemon-tcg-data.git"


def run(command: list[str], cwd: Path | None = None) -> str:
    result = subprocess.run(command, cwd=cwd, check=True, text=True, capture_output=True)
    return result.stdout.strip()


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--repository-url", default=REPOSITORY_URL)
    parser.add_argument("--output", default="source_data/pokemontcg")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    project_root = Path(__file__).resolve().parents[1]
    output = (project_root / args.output).resolve()

    with tempfile.TemporaryDirectory(prefix="pokemon-tcg-data-") as temporary_directory:
        clone = Path(temporary_directory) / "repository"
        run(["git", "clone", "--depth", "1", "--filter=blob:none", "--sparse", args.repository_url, str(clone)])
        run(["git", "sparse-checkout", "set", "cards/en", "sets"], cwd=clone)
        revision = run(["git", "rev-parse", "HEAD"], cwd=clone)
        staging = output.with_name(f"{output.name}.tmp")
        if staging.exists():
            shutil.rmtree(staging)
        staging.mkdir(parents=True)
        shutil.copytree(clone / "cards", staging / "cards")
        shutil.copytree(clone / "sets", staging / "sets")
        (staging / "revision.txt").write_text(revision + "\n", encoding="utf-8")
        if output.exists():
            shutil.rmtree(output)
        staging.rename(output)

    print(f"Pulled Pokémon TCG API data at {revision}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
