from uuid import uuid4

from psycopg2.extras import Json


def upsert_by_id(cursor, table_name, data):
    columns = list(data.keys())
    placeholders = ", ".join(["%s"] * len(columns))
    updates = ", ".join(f"{column} = EXCLUDED.{column}" for column in columns if column != "id")
    query = f"""
        INSERT INTO {table_name} ({", ".join(columns)})
        VALUES ({placeholders})
        ON CONFLICT (id) DO UPDATE SET {updates}
        RETURNING id
    """
    cursor.execute(query, [data[column] for column in columns])
    return cursor.fetchone()[0]


def save_raw_source_payload(cursor, import_job_id, source_id, record_type, external_id, payload, record_id=None):
    return upsert_by_id(
        cursor,
        "raw_import_records",
        {
            "id": record_id or str(uuid4()),
            "import_job_id": import_job_id,
            "source_id": source_id,
            "record_type": record_type,
            "external_id": external_id,
            "payload": Json(payload),
            "normalized": False,
        },
    )


def upsert_language(cursor, data):
    return upsert_by_id(cursor, "languages", data)


def upsert_series(cursor, data):
    return upsert_by_id(cursor, "series", data)


def upsert_set(cursor, data):
    return upsert_by_id(cursor, "sets", data)


def upsert_card_concept(cursor, data):
    return upsert_by_id(cursor, "card_concepts", data)


def upsert_card_print(cursor, data):
    return upsert_by_id(cursor, "card_prints", data)


def upsert_print_variant(cursor, data):
    return upsert_by_id(cursor, "print_variants", data)
