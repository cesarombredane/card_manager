# Architecture

Card Manager is a local-first Vue 3/Quasar application using Vue Router and Vuex.
It reads a generated JSON catalog and cached images. Local development and preview
servers provide filesystem persistence; a static build supports browsing but cannot
save personal data.

## Responsibilities

| Location                                      | Responsibility                                                    |
| --------------------------------------------- | ----------------------------------------------------------------- |
| `frontend/src/layouts`, `views`, `components` | Layout, route orchestration and reusable presentation             |
| `frontend/src/models`                         | Catalog and domain contracts                                      |
| `frontend/src/store`                          | Vuex navigation/filter state and domain collection/binder state   |
| `frontend/src/services`                       | Catalog access and local persistence transport                    |
| `frontend/src/utils`                          | Sorting, mapping, binder planning and PDF calculations            |
| `frontend/server`                             | Local collection, binder, image and backup endpoints              |
| `scripts` and `update_data.ts`                | Source checkout, normalization, prices, cached images and reports |

## Data flow and contracts

The browser loads catalog data through Vite JSON imports. Domain stores coordinate
personal changes with `/api/collection`, `/api/collection/operations`, `/api/binders`
and `/api/manual-images`. `/api/personal-data/export` and `/import` implement the
existing ZIP backup contract. Development and preview register the same handlers.

The update pipeline fetches the persistent sparse TCGdex checkout, builds in a
staging directory, validates set names, publishes the catalog, refreshes prices,
reuses/downloads images, writes coverage and typechecks the frontend. Append mode
retains existing records and only adds unknown IDs. Prices and images have explicit
refresh stages. `--prices` skips catalog/source/image/coverage stages; `--reset`
rebuilds generated assets while preserving personal files and manual uploads.

Stored JSON keys, IDs, language codes, routes, API payloads and image URLs are
compatibility contracts. Renaming an internal file must not rename those values.
TypeScript data literals are interpreted with the compiler AST, never executed.
Runtime checks validate interpreted shapes and external price guides.

## Storage and publication

`frontend/data` contains versioned catalog files and three ignored personal files.
`frontend/public/images` holds ignored card/set/manual images and the existing
missing-asset index. `tcgdex_data` and `reports` remain ignored root caches.
Writes use temporary files and renames. Catalog publication retains a previous
folder until staging is published; personal bytes are copied into staging first.
Do not run updates concurrently with another update or personal-data edits.

See [frontend architecture](frontend/ARCHITECTURE.md), [update behavior](docs/updates.md)
and [migration/rollback](docs/migration.md).
