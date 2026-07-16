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

NEXT_DATA="app/data.next"

echo "[1/9] Pulling the latest TCGdex data..."
"$PYTHON_BIN" scripts/pull_tcgdex_data.py

echo "[2/9] Pulling the latest Pokemon TCG API data..."
"$PYTHON_BIN" scripts/pull_pokemontcg_data.py

echo "[3/9] Converting primary TCGdex data..."
"$PYTHON_BIN" scripts/convert_tcgdex_data.py --output "$NEXT_DATA"

echo "[4/9] Merging approved fallback metadata..."
"$PYTHON_BIN" scripts/merge_source_data.py --data "$NEXT_DATA"

echo "[5/9] Synchronizing primary set images..."
"$PYTHON_BIN" scripts/sync_set_images.py --data "$NEXT_DATA"

echo "[6/9] Synchronizing primary card images..."
"$PYTHON_BIN" scripts/sync_card_images.py --data "$NEXT_DATA"

echo "[7/9] Synchronizing fallback images..."
"$PYTHON_BIN" scripts/sync_fallback_assets.py --data "$NEXT_DATA"

echo "[8/9] Writing coverage report..."
"$PYTHON_BIN" scripts/report_coverage.py --data "$NEXT_DATA"

echo "[9/9] Publishing generated data..."
"$PYTHON_BIN" scripts/publish_data.py "$NEXT_DATA" app/data

echo "Data and images are up to date."
