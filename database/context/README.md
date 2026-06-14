# Database Context

This folder contains the rebuildable database context for the app.

## Files

- `init/10-schema.sql`: creates tables, enums, indexes, and constraints.
- `init/20-import-csv.sh`: runs the CSV importer during PostgreSQL initialization.
- `scripts/import_csv.py`: imports CSV files into PostgreSQL.
- `csv/*.csv`: source data for the catalog and collection.

## Import Order

CSV files are imported in dependency order:

1. `languages.csv`
2. `generations.csv`
3. `pokemon.csv`
4. `series.csv`
5. `sets.csv`
6. `set_languages.csv`
7. `cards.csv`
8. `card_pokemon.csv`
9. `collected_cards.csv`

## Important

The official PostgreSQL Docker image runs files from `/docker-entrypoint-initdb.d` only when the database volume is empty.

If you change CSV files and want to rebuild the database from scratch, remove the database PVC, then start again.
