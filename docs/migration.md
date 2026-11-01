# Template migration

This project was adapted to `cesarombredane/web_app_template` at commit
`896f90627f37407d1480e0c9ed5ee344a6d32a1f`. The template supplies organization,
development rules and verification tooling. Card Manager retains its catalog,
local persistence API, URLs, stored identifiers and file formats.

## Existing installations

Stop development/preview servers before moving an installation so that an old
process cannot save to `app/` after the migration. Move the entire `app/` folder
to `frontend/`, including ignored data and images. A Git checkout alone does not
move ignored files. Preserve the original files while checking the moved
installation. Do not regenerate the catalog to migrate personal data.

Personal paths become `frontend/data/collection.json`, `binders.json`,
`manual-images.json` and `frontend/public/images/manual/`. Their contents and
public image URLs do not change. Cached card/set artwork moves with `public/`;
`tcgdex_data/` stays at the root. Existing exported ZIP archives remain compatible.

The update entry point is `npm run update`, with the same `--prices` and `--reset`
modes. Python is no longer required. The catalog updater also stages personal
files before an overwrite publication, protecting standalone `--overwrite` and
recovering an interrupted publication from `data.previous` when `data` is absent.

## Verification and rollback

For code-only alignment of an installation already using `frontend/`, leave all
existing catalog, personal JSON, image indexes and artwork in place. Do not make
an installation backup or run any update, reset, download, price-refresh or catalog
generation command as part of this migration. Verify with synthetic fixtures and
temporary storage, using the commands in [contributing](contributing.md).

The TypeScript updater is protected by the Python-generated synthetic fixture in
`tests/fixtures/expected_catalog.json`, plus focused network, retry, cache and reset
fixtures. These tests do not claim a live update or full artwork download was run.

For a code-only rollback, stop the local server and restore the previous code while
retaining the existing data paths and files. If moving an older `app/` installation,
follow the path instructions above and retain its original files. Any installation
backup or data-moving operation needs its own explicit authorization.

## Final template alignment

Collection and dashboard editing workflows have independent components. Personal
JSON keeps its existing identifiers, schema versions and paths. Legacy manual
cards missing optional historical fields receive in-memory defaults before use;
invalid field types are rejected. Entry variant changes pass through Vuex
mutations, and frontend unit tests participate in type checking.

Agent verification uses lint, formatting, type checks, synthetic unit tests and
`npm run build:fixture`. End-to-end verification is user-run: execute
`npm run test:e2e` from the root. It uses temporary data. Review collection creation,
manual-card editing (including variant changes), transfers, bulk language edits,
Pokédex settings, binder assets and import/export confirmation before signing off
on the interactive migration. Agents record user-reported results and leave this
verification pending until the user provides them; agents do not run it themselves.

## Development performance follow-up

Personal collection, binder and manual-image datasets now publish as frozen
snapshots. Vuex strict checking remains enabled in development, while draft edits
and startup reconciliation run outside reactive state and publish once. Unchanged
Pokédex records keep their timestamps. Stored JSON formats and persistence paths
are unchanged.

After restarting `npm run dev`, check the initial load, several F5 reloads, typing
in filters, collection quantity edits, Pokédex reconciliation, and binder slot
moves. Confirm saves survive another refresh. The implementation has synthetic
unit/performance verification; actual browser responsiveness is user-verified.
Agents do not run browser automation or end-to-end tests. The optional user-run
regression command remains `npm run test:e2e`.
