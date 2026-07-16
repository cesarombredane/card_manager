#!/usr/bin/env bash

set -Eeuo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd -- "$SCRIPT_DIR/.." && pwd)"
PYTHON_BIN="${PYTHON_BIN:-python3}"

if ! command -v "$PYTHON_BIN" >/dev/null 2>&1; then
  echo "Error: $PYTHON_BIN was not found. Set PYTHON_BIN to a Python 3 executable." >&2
  exit 127
fi

cd "$PROJECT_ROOT"

echo "[1/4] Pulling the latest TCGdex data..."
"$PYTHON_BIN" scripts/pull_tcgdex_data.py

echo "[2/4] Converting TCGdex data to application JSON..."
"$PYTHON_BIN" scripts/convert_tcgdex_data.py

echo "[3/4] Synchronizing set images..."
"$PYTHON_BIN" scripts/sync_set_images.py

echo "[4/4] Synchronizing card images..."
"$PYTHON_BIN" scripts/sync_card_images.py

echo "Data and images are up to date."
