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
./scripts/update_data.sh
```

This pulls TCGdex as the primary source and Pokémon TCG API data
as the international English fallback, regenerates the app JSON, and synchronizes
supported set and card images. A final catalog-scope step removes unsupported
sets, translations, and cached image languages. Generation happens in
`app/data.next` and is published
only after every step succeeds. The conversion also recreates `app/data/pokemon.json`
from TCGdex Pokédex ids and localized card names, keeping Mega and regional
forms distinct; the scope step fills known inference gaps with canonical
National Pokédex names. Set `PYTHON_BIN` if Python 3 is available under a
different executable name.

Source matching evidence and asset candidates are written to
`app/data/source-map.json`. Detailed coverage is regenerated as
`app/data/coverage.json` on every update and displayed at `/coverage`; diagnostic
conflict reports remain under the Git-ignored `reports/` directory. TCGdex remains authoritative; fallback
providers only fill missing values.

## Cache set artwork

TCGdex set logos and symbols can be synchronized into the local, Git-ignored
image library after regenerating the JSON data:

```sh
python3 scripts/sync_set_images.py
```

The command queries TCGdex only for sets with uncached artwork, requests the
original set assets as WebP, and stores them under
`app/public/images/sets/<set-id>/`. Generated set metadata points only to files
that exist locally. Known-missing artwork is remembered to avoid repeated API
requests; use `--refresh-missing` to check for newly added upstream artwork.

## Cache card artwork

TCGdex card scans can be synchronized into the local, Git-ignored image library
after regenerating the JSON data:

```sh
python3 scripts/sync_card_images.py
```

The command requests each set catalog once per language, downloads high-quality
WebP scans into `app/public/images/cards/<set-id>/<language-id>/`, and updates
every card variant to reference only an existing local file. TCGdex currently
provides one scan per localized card, so variants of that card share the same
image. Known-missing scans are remembered; use `--refresh-missing` to retry them.
For a smaller synchronization, repeat `--set <local-set-id>`,
`--card <local-card-id-or-number>`, and/or `--language <language-id>` as needed.
