import csv
import json
import os
from decimal import Decimal
from pathlib import Path

import psycopg2
from psycopg2.extras import Json


CSV_DIR = Path(os.environ.get("CARD_MANAGER_CSV_DIR", "/app/context/csv"))


TABLES = [
    {
        "name": "languages",
        "columns": ["id", "code", "name", "native_name", "status", "notes"],
        "types": {},
        "conflict": ["id"],
    },
    {
        "name": "regions",
        "columns": ["id", "code", "name"],
        "types": {},
        "conflict": ["id"],
    },
    {
        "name": "sources",
        "columns": ["id", "name", "url", "source_type", "license_notes", "terms_url"],
        "types": {},
        "conflict": ["id"],
    },
    {
        "name": "series",
        "columns": ["id", "language_id", "region_id", "name", "local_name", "start_date", "end_date", "notes"],
        "types": {"start_date": "date", "end_date": "date"},
        "conflict": ["id"],
    },
    {
        "name": "sets",
        "columns": [
            "id",
            "series_id",
            "language_id",
            "region_id",
            "name",
            "local_name",
            "set_code",
            "official_card_count",
            "secret_card_count",
            "release_date",
            "set_type",
            "notes",
        ],
        "types": {"official_card_count": "int", "secret_card_count": "int", "release_date": "date"},
        "conflict": ["id"],
    },
    {
        "name": "set_relationships",
        "columns": ["id", "source_set_id", "target_set_id", "relationship_type", "confidence", "notes"],
        "types": {"confidence": "decimal"},
        "conflict": ["id"],
    },
    {
        "name": "card_concepts",
        "columns": [
            "id",
            "original_language_id",
            "original_set_id",
            "original_card_number",
            "canonical_name",
            "card_category",
            "artist",
            "regulation_mark",
            "evolves_from",
            "concept_fingerprint",
            "notes",
        ],
        "types": {},
        "conflict": ["id"],
    },
    {
        "name": "card_texts",
        "columns": [
            "id",
            "card_concept_id",
            "language_id",
            "name",
            "rules_text",
            "flavor_text",
            "ability_name",
            "ability_text",
            "attacks",
            "weakness",
            "resistance",
            "retreat_cost",
        ],
        "types": {"attacks": "json", "weakness": "json", "resistance": "json", "retreat_cost": "int"},
        "conflict": ["id"],
    },
    {
        "name": "pokemon_card_details",
        "columns": ["card_concept_id", "hp", "pokemon_type", "stage", "subtype", "rule_box", "evolves_from"],
        "types": {"hp": "int"},
        "conflict": ["card_concept_id"],
    },
    {
        "name": "attacks",
        "columns": ["id", "card_concept_id", "attack_order", "name", "cost", "damage", "text"],
        "types": {"attack_order": "int", "cost": "json"},
        "conflict": ["id"],
    },
    {
        "name": "abilities",
        "columns": ["id", "card_concept_id", "name", "text", "ability_type"],
        "types": {},
        "conflict": ["id"],
    },
    {
        "name": "card_prints",
        "columns": [
            "id",
            "card_concept_id",
            "set_id",
            "language_id",
            "printed_name",
            "card_number",
            "printed_total",
            "rarity",
            "release_date",
            "is_promo",
            "is_jumbo",
            "is_deck_exclusive",
            "external_reference",
            "notes",
        ],
        "types": {
            "release_date": "date",
            "is_promo": "bool",
            "is_jumbo": "bool",
            "is_deck_exclusive": "bool",
        },
        "conflict": ["id"],
    },
    {
        "name": "print_variants",
        "columns": [
            "id",
            "card_print_id",
            "variant_type",
            "foil_type",
            "stamp_text",
            "edition",
            "is_tournament_legal",
            "notes",
        ],
        "types": {"is_tournament_legal": "bool"},
        "conflict": ["id"],
    },
    {
        "name": "card_images",
        "columns": ["id", "print_variant_id", "image_url", "image_source", "width", "height", "is_front"],
        "types": {"width": "int", "height": "int", "is_front": "bool"},
        "conflict": ["id"],
    },
    {
        "name": "source_mappings",
        "columns": [
            "id",
            "source_id",
            "entity_type",
            "entity_id",
            "external_id",
            "external_url",
            "raw_payload",
            "last_checked_at",
        ],
        "types": {"raw_payload": "json", "last_checked_at": "timestamp"},
        "conflict": ["id"],
    },
    {
        "name": "import_jobs",
        "columns": ["id", "source_id", "job_type", "status", "started_at", "finished_at", "error_message", "metadata"],
        "types": {"started_at": "timestamp", "finished_at": "timestamp", "metadata": "json"},
        "conflict": ["id"],
    },
    {
        "name": "raw_import_records",
        "columns": ["id", "import_job_id", "source_id", "record_type", "external_id", "payload", "normalized"],
        "types": {"payload": "json", "normalized": "bool"},
        "conflict": ["id"],
    },
]


def normalize(value, value_type):
    if value is None:
        return None

    value = value.strip()
    if value == "":
        return None

    if value_type == "int":
        return int(value)

    if value_type == "decimal":
        return Decimal(value)

    if value_type == "bool":
        return value.lower() in {"1", "true", "yes", "y"}

    if value_type == "json":
        return Json(json.loads(value))

    return value


def read_rows(table):
    path = CSV_DIR / f"{table['name']}.csv"
    if not path.exists():
        print(f"Skipping {path}: file not found")
        return []

    with path.open(newline="", encoding="utf-8") as csv_file:
        reader = csv.DictReader(csv_file)
        if reader.fieldnames is None:
            return []

        missing_columns = [column for column in table["columns"] if column not in reader.fieldnames]
        if missing_columns:
            raise ValueError(f"{path} is missing columns: {', '.join(missing_columns)}")

        rows = []
        for row in reader:
            values = [normalize(row[column], table["types"].get(column)) for column in table["columns"]]
            if any(value is not None for value in values):
                rows.append(values)

        return rows


def upsert_rows(cursor, table, rows):
    if not rows:
        print(f"Imported 0 rows into {table['name']}")
        return

    columns = table["columns"]
    placeholders = ", ".join(["%s"] * len(columns))
    quoted_columns = ", ".join(columns)
    conflict_columns = ", ".join(table["conflict"])
    updates = ", ".join(
        f"{column} = EXCLUDED.{column}"
        for column in columns
        if column not in table["conflict"]
    )

    conflict = f"ON CONFLICT ({conflict_columns})"
    if updates:
        conflict = f"{conflict} DO UPDATE SET {updates}"
    else:
        conflict = f"{conflict} DO NOTHING"

    query = f"""
        INSERT INTO {table["name"]} ({quoted_columns})
        VALUES ({placeholders})
        {conflict}
    """

    cursor.executemany(query, rows)
    print(f"Imported {len(rows)} rows into {table['name']}")


def main():
    connection = psycopg2.connect(
        dbname=os.environ["POSTGRES_DB"],
        user=os.environ["POSTGRES_USER"],
    )

    with connection:
        with connection.cursor() as cursor:
            for table in TABLES:
                upsert_rows(cursor, table, read_rows(table))

    connection.close()


if __name__ == "__main__":
    main()
