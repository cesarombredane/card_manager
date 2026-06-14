#!/bin/sh
set -eu

DB_NAME="${POSTGRES_DB:-card_manager}"
DB_USER="${POSTGRES_USER:-postgres}"

until pg_isready -U "$DB_USER" -d "$DB_NAME" >/dev/null 2>&1; do
  sleep 1
done

if [ "$(psql -U "$DB_USER" -d "$DB_NAME" -Atc "SELECT to_regclass('public.card_concepts') IS NOT NULL")" != "t" ]; then
  echo "Card manager schema not found, applying schema"
  psql -U "$DB_USER" -d "$DB_NAME" -f /app/context/init/10-schema.sql
fi

echo "Importing card manager CSV context"
python3 /app/context/scripts/import_csv.py
