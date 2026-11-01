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
