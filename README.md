# Card Manager

Card Manager is a local-first web application for browsing the Pokémon Trading
Card Game catalog and organizing a personal collection. It combines card and
set metadata, localized scans, Cardmarket prices, wanted lists, and visual
binder planning in one interface.

The application is designed to run on your own computer. Catalog assets are
generated locally, and personal collection data stays in local JSON files
instead of being sent to a hosted account or external database.

## Features

- Browse sets by series and region, with set completion statistics.
- Search the full card catalog and filter sets by name, number, rarity, type,
  category, language, or variant.
- View localized card details, available variants, scans, and Cardmarket price
  information.
- Track owned cards with quantities, languages, conditions, and collection
  value estimates.
- Maintain wanted lists, including strict language requirements.
- Organize cards into separate box and binder collections.
- Create a complete master-set wanted list from a binder template.
- Design binder pages with 2 × 2 or 3 × 3 layouts, drag-and-drop placement,
  locked pages, proxies, and custom illustrations.
- Generate binder layouts automatically with Auto Michi and export printable
  binder assets as PDF files.
- Add cards and images manually when an item is not available in the catalog.
- Export and restore personal collection data as a backup archive.
- Inspect catalog, metadata, and image completeness from the coverage page.

## How it works

The Vue and Quasar frontend reads its generated catalog from `frontend/data` and
cached artwork from `frontend/public/images`. The update pipeline creates these files
from the TCGdex card database, downloads available scans and set artwork, and
adds current EUR price-guide data from Cardmarket.

Personal collection, binder, and manual-card information is stored separately
in ignored local files under `frontend/data`. The Vite development and preview server
provides the local endpoints used for atomic saves, image uploads, and backup
imports or exports. Because of this, collection editing requires the local
server; a purely static deployment can browse the catalog but cannot persist
changes.

The generated catalog intentionally includes:

- International releases in English and French when a French release exists.
- Japanese releases in Japanese.
- Mainland Chinese releases in Simplified Chinese.

## Requirements

- Git
- Node.js (see `.nvmrc`) and npm
- An internet connection for catalog, image, and price updates

## Create the application data

Before starting the app for the first time, run the complete update pipeline
from the project root after `npm ci`:

```sh
npm run update
```

This single command fetches TCGdex, creates the catalog, refreshes Cardmarket
prices, downloads images, generates the coverage report, and validates the
application. Catalog updates are append-only by default. Every update retries
all missing card images, set logos, and symbols, including assets previously
reported unavailable. Existing downloaded images are reused.

The only optional modes are:

- `npm run update -- --prices`: refresh prices of existing cards and validate
  the application, without fetching TCGdex, changing the catalog, or processing images.
- `npm run update -- --reset`: rebuild the catalog from the latest TCGdex
  source, discard generated image and price caches, and download images again.
  Collection, binder, manual-image records, and manual image files are preserved.

The modes cannot be combined. All successful runs include application validation.
Each pipeline run overwrites `reports/update.log` with the combined output from
all stages, also shown in the terminal with periodic image progress updates.
`reports/images.jsonl` contains one JSON record per image request attempt:
timestamp, URL, destination, attempt number, elapsed time, outcome, HTTP error
status, and error details (including up to 2 KB of the error response body).
Both files are cleared at the start of each pipeline run. Running the image
updater directly also clears `reports/images.jsonl`. Cached images require no
request and are not listed in that file. Temporary network errors and selected
HTTP errors (including 429 and 503) get up to three attempts with backoff;
404s are reported as unavailable. Symbols try English, then the set's languages.

To recover missing images while keeping successful downloads, run:

```sh
npm run update:images
```

The standalone image updater uses a live progress bar in terminals. Set
`NO_COLOR=1` to disable colors.

## Run the application

Install all dependencies from the repository root and start the local server:

```sh
npm ci
npm run dev
```

For an existing installation, read [migration and rollback](docs/migration.md)
before starting. On a fresh checkout, install dependencies before creating data.
Open the address printed by Vite, normally <http://localhost:5173>.

For a production build and local preview:

```sh
npm run build
npm run preview
```

The repository follows [web_app_template](https://github.com/cesarombredane/web_app_template)
organization. See [architecture](ARCHITECTURE.md), [frontend usage](frontend/README.md),
[update details](docs/updates.md) and [development/verification](docs/contributing.md).
The editing workflow requires an approved plan before any file changes; see
[development instructions](AGENTS.md). The interface uses the template palette and
[frontend conventions](docs/frontend_conventions.md).

CI checks formatting, lint, types, unit tests, a synthetic production build and
isolated Chromium journeys.
It does not deploy, back up the installation or refresh real data. Run
`npm run build:fixture` for a production check without building the saved catalog.
Python is no longer required.

## Personal data

The main local files are:

```text
frontend/data/collection.json
frontend/data/binders.json
frontend/data/manual-images.json
frontend/public/images/manual/
```

These paths are ignored by Git. Use the **Export** action on the collection
dashboard to create a portable backup before moving the app or making large
changes.

## License and third-party content

Card Manager's original source code is released under the [MIT License](LICENSE).
You may use, copy, modify, distribute, sublicense, or sell the software subject
to the copyright and notice requirements in that license. The software is
provided without warranty.

The generated catalog is based on the
[TCGdex cards database](https://github.com/tcgdex/cards-database), which is also
published under the MIT License. Cardmarket pricing is retrieved from
Cardmarket's public price guide.

The MIT license for this repository applies only to the original project code
and does not grant rights to third-party names, logos, card artwork, scans, or
other intellectual property. Pokémon and Pokémon character names are
trademarks of Nintendo, Creatures Inc., and GAME FREAK inc. This project is an
independent collection tool and is not produced, endorsed, sponsored, or
affiliated with Nintendo, Creatures Inc., GAME FREAK inc., The Pokémon Company,
TCGdex, or Cardmarket.
