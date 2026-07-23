# Card Manager

Static Vue app for browsing local Pokemon card JSON data.

## Run

From the project root:

```sh
cd app
npm i
npm run dev
```

## Access

```text
http://localhost:5173
```

## Data

The app reads JSON files directly from:

```text
app/data
```

The catalog is intentionally limited to three product regions:

- International sets in English and French when a French release exists.
- Japanese sets in Japanese.
- Mainland Chinese sets in Simplified Chinese.

No other translations or localized card scans are shipped. The UI displays the
selected supported language when available, then uses a stable fallback.

## Update data based on tcgdex

```sh
python3 scripts/update_tcgdex.py
```

This one script shallow-clones the required TCGdex data, excludes Pokémon TCG
Pocket, filters the supported regions and languages, appends new catalog
records, and caches newly available images.

By default, updates are append-only:

- Existing Pokémon, series, set, and card records remain unchanged.
- Existing translations and metadata are never replaced.
- Existing image files and non-empty image references are never replaced.
- New series, sets, cards, and Pokémon may be appended.
- Empty image references may be filled when TCGdex gains an image.
- Cached files are never pruned by the updater.

Generated data is prepared in temporary directories and published atomically.
The updater accepts two options, which can be combined:

- `--no-images` skips image discovery and downloads.
- `--overwrite` replaces current catalog data with the latest filtered TCGdex
  catalog. Existing cached image files are still reused and never overwritten.

Every update regenerates `app/data/coverage.json`. The same report can be
refreshed independently with `python3 scripts/report_coverage.py`.
