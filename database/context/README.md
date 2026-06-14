# Database Context

This folder contains the rebuildable database context for the app.

## Model

The database is not modeled as `Series -> Set -> Card` only, because that breaks across Pokemon TCG languages and regions.

Instead, the model separates:

- `card_concepts`: the abstract card design, independent of language and physical printing.
- `card_texts`: language-specific names, rules text, attacks, weakness, resistance, and flavor text for a card concept.
- `card_prints`: a physical printed card in a specific set and language.
- `print_variants`: collectible versions of a print, such as normal, reverse holo, stamped, or first edition.
- `series` and `sets`: language/region-specific release structures.
- `set_relationships`: many-to-many links between sets across languages and regions.

## Examples

Japanese `Collection Sun` and `Collection Moon` can both relate to English `Sun & Moon` through `set_relationships` with `merged_into`.

One `card_concept` can represent the same Pikachu card design while having English, Japanese, French, Korean, Simplified Chinese, Thai, and Indonesian `card_prints`.

One English Pikachu `card_print` can have several `print_variants`: `normal`, `reverse_holo`, `stamped`, and `first_edition`.

## Files

- `init/10-schema.sql`: creates the schema, comments, indexes, and update triggers.
- `init/20-import-csv.sh`: runs the CSV importer during PostgreSQL initialization.
- `scripts/generate_fake_dataset.py`: regenerates the deterministic development fixture CSVs.
- `scripts/import_csv.py`: imports CSV files into PostgreSQL.
- `scripts/normalization.py`: skeleton helpers for future API normalization.
- `csv/*.csv`: source data for local rebuilds and test data.

## Development Fixture

The generated fixture contains:

- 15 print languages.
- 45 language-specific series.
- 150 language-specific sets.
- 11 card prints per set.
- 1,650 card prints.
- 3,362 print variants.
- 3,362 card image rows using public `images.pokemontcg.io` URLs.

Regenerate the CSV files from the project root:

```sh
python3 database/context/scripts/generate_fake_dataset.py
```

Replace the running dev database with the current CSV files:

```sh
CARD_MANAGER_RESET=1 python3 /app/context/scripts/import_csv.py
```

## Import Order

CSV files are imported in dependency order:

1. `languages.csv`
2. `regions.csv`
3. `sources.csv`
4. `series.csv`
5. `sets.csv`
6. `set_relationships.csv`
7. `card_concepts.csv`
8. `card_texts.csv`
9. `pokemon_card_details.csv`
10. `attacks.csv`
11. `abilities.csv`
12. `card_prints.csv`
13. `print_variants.csv`
14. `card_images.csv`
15. `source_mappings.csv`
16. `import_jobs.csv`
17. `raw_import_records.csv`

## Important

The official PostgreSQL Docker image runs files from `/docker-entrypoint-initdb.d` only when the database volume is empty. For day-to-day fixture changes, prefer `CARD_MANAGER_RESET=1` with the importer instead of deleting the PVC.
