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
python3 scripts/pull_tcgdex_data.py
python3 scripts/convert_tcgdex_data.py
python3 scripts/sync_set_images.py
```

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
