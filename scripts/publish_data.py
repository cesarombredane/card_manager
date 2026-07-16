#!/usr/bin/env python3
"""Atomically publish a validated generated data directory."""

from __future__ import annotations

import argparse
import shutil
from pathlib import Path


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("source")
    parser.add_argument("destination")
    args = parser.parse_args()
    root = Path(__file__).resolve().parents[1]
    source = (root / args.source).resolve()
    destination = (root / args.destination).resolve()
    backup = destination.with_name(f"{destination.name}.previous")
    if not source.exists():
        raise SystemExit(f"Missing publish source: {source}")
    if backup.exists():
        shutil.rmtree(backup)
    if destination.exists():
        destination.rename(backup)
    try:
        source.rename(destination)
    except Exception:
        if backup.exists() and not destination.exists():
            backup.rename(destination)
        raise
    if backup.exists():
        shutil.rmtree(backup)
    print(f"Published {destination}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
