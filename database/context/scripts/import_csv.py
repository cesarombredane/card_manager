import csv
import os
from decimal import Decimal
from pathlib import Path

import psycopg2


CSV_DIR = Path(os.environ.get("CARD_MANAGER_CSV_DIR", "/app/context/csv"))


TABLES = [
    {
        "name": "languages",
        "columns": ["id", "code", "name"],
        "types": {},
    },
    {
        "name": "generations",
        "columns": ["id", "name", "release_date"],
        "types": {"release_date": "date"},
    },
    {
        "name": "pokemon",
        "columns": ["id", "name", "pokedex_number", "generation_id", "regional_variant", "image_url"],
        "types": {"pokedex_number": "int"},
    },
    {
        "name": "series",
        "columns": ["id", "name", "image_url", "release_date"],
        "types": {"release_date": "date"},
    },
    {
        "name": "sets",
        "columns": ["id", "series_id", "name", "image_url", "symbol_image_url", "release_date"],
        "types": {"release_date": "date"},
    },
    {
        "name": "set_languages",
        "columns": ["set_id", "language_id"],
        "types": {},
    },
    {
        "name": "cards",
        "columns": [
            "id",
            "set_id",
            "name",
            "image_url",
            "number",
            "rarity",
            "card_type",
            "variant",
            "artist",
            "external_id",
        ],
        "types": {},
    },
    {
        "name": "card_pokemon",
        "columns": ["card_id", "pokemon_id"],
        "types": {},
    },
    {
        "name": "collected_cards",
        "columns": [
            "id",
            "card_id",
            "language_id",
            "image_url",
            "condition",
            "quantity",
            "note",
            "acquired_at",
            "purchase_price",
            "estimated_value",
            "storage_location",
            "for_trade",
        ],
        "types": {
            "quantity": "int",
            "acquired_at": "date",
            "purchase_price": "decimal",
            "estimated_value": "decimal",
            "for_trade": "bool",
        },
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
            values = [
                normalize(row[column], table["types"].get(column))
                for column in table["columns"]
            ]
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
    updates = ", ".join(f"{column} = EXCLUDED.{column}" for column in columns if column != "id")

    if table["name"] in {"set_languages", "card_pokemon"}:
        conflict = "ON CONFLICT DO NOTHING"
    else:
        conflict = f"ON CONFLICT (id) DO UPDATE SET {updates}"

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
                rows = read_rows(table)
                upsert_rows(cursor, table, rows)

    connection.close()


if __name__ == "__main__":
    main()
