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

The UI displays the selected language when available, then falls back to
English and finally the first non-empty translated name.

## Update data based on tcgdex

```sh
./scripts/update_data.sh
```

This pulls the latest source data, regenerates the app JSON, and synchronizes
all set and card images. The conversion also recreates `app/data/pokemon.json`
from TCGdex Pokédex ids and localized card names, keeping Mega and regional
forms distinct. Set `PYTHON_BIN` if Python 3 is available under a different
executable name.

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
