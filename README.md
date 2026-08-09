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

The Vue and Quasar frontend reads its generated catalog from `app/data` and
cached artwork from `app/public/images`. The update pipeline creates these files
from the TCGdex card database, downloads available scans and set artwork, and
adds current EUR price-guide data from Cardmarket.

Personal collection, binder, and manual-card information is stored separately
in ignored local files under `app/data`. The Vite development and preview server
provides the local endpoints used for atomic saves, image uploads, and backup
imports or exports. Because of this, collection editing requires the local
server; a purely static deployment can browse the catalog but cannot persist
changes.

The generated catalog intentionally includes:

- International releases in English and French when a French release exists.
- Japanese releases in Japanese.
- Mainland Chinese releases in Simplified Chinese.

## Requirements

- Python 3.10 or newer
- Git
- Node.js and npm
- An internet connection for catalog, image, and price updates

## Create the application data

Before starting the app for the first time, run the complete update pipeline
from the project root:

```sh
python3 update_data.py
```

This single command fetches TCGdex, creates the catalog, refreshes Cardmarket
prices, downloads images, generates the coverage report, and validates the
application. Updates are append-only by default. Use
`python3 update_data.py --help` to see overwrite and optional skip controls.
Personal collection, binder, and manual-image data are preserved during
overwrite updates.

## Run the application

Install the frontend dependencies and start the local development server:

```sh
cd app
npm install
npm run dev
```

Open the address printed by Vite, normally <http://localhost:5173>.

For a production build and local preview:

```sh
cd app
npm run build
npm run preview
```

## Personal data

The main local files are:

```text
app/data/collection.json
app/data/binders.json
app/data/manual-images.json
app/public/images/manual/
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
