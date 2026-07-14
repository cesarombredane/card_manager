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

Set names are localized objects keyed by the normalized language ids listed in
`language_ids`:

```json
{
  "name": {
    "de": "Erhabene Helden",
    "en": "Ascended Heroes"
  },
  "language_ids": ["de", "en"]
}
```

The UI displays the selected language when available, then falls back to
English and finally the first non-empty translated name.

## Update data based on tcgdex

```sh
cd scripts
python3 pull_tcgdex_data.py
python3 update_card_data.py
```
