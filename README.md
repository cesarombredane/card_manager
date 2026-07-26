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

Create the persistent sparse checkout, or update it on later runs:

```sh
python3 scripts/fetch_tcgdex.py
```

The checkout is stored in the git-ignored `tcgdex_data/cards-database` folder
and is not deleted after the command finishes. Then update catalog data and
images independently:

```sh
python3 scripts/update_tcgdex_data.py
python3 scripts/update_tcgdex_images.py
```

The data updater excludes Pokémon TCG Pocket and filters the supported regions
and languages. The image updater uses the generated catalog to cache newly
available images and fill empty image references.

By default, updates are append-only:

- Existing Pokémon, series, set, and card records remain unchanged.
- Existing translations and metadata are never replaced.
- New series, sets, cards, and Pokémon may be appended.
- Existing image files and non-empty image references are never replaced.
- Empty image references may be filled when TCGdex gains an image.
- Cached files are never pruned by the updater.

Generated card data is prepared in temporary directories and published
atomically. Both update commands accept `--overwrite`:

- For `update_tcgdex_data.py`, it replaces current catalog data with the latest
  filtered TCGdex catalog.
- For `update_tcgdex_images.py`, it retries assets previously recorded as
  unavailable. Existing cached image files are still reused and never
  overwritten.

Both update commands regenerate `app/data/coverage.json`. The same report can
be refreshed independently with `python3 scripts/report_coverage.py`.
