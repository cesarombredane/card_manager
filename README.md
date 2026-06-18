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

## Update data based on tcgdex

```sh
cd scripts
python3 pull_tcgdex_data.py
python3 update_card_data.py
```