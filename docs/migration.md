# Template migration

This project was adapted to `cesarombredane/web_app_template` at commit
`896f90627f37407d1480e0c9ed5ee344a6d32a1f`. The template supplies organization,
development rules and verification tooling. Card Manager retains its catalog,
local persistence API, URLs, stored identifiers and file formats.

## Existing installations

Stop development/preview servers before moving an installation so that an old
process cannot save to `app/` after the migration. Move the entire `app/` folder
to `frontend/`, including ignored data and images. A Git checkout alone does not
move ignored files. Keep the old installation or an independent backup until
checksums and application behavior have been verified. Do not regenerate the
catalog to migrate personal data.

Personal paths become `frontend/data/collection.json`, `binders.json`,
`manual-images.json` and `frontend/public/images/manual/`. Their contents and
public image URLs do not change. Cached card/set artwork moves with `public/`;
`tcgdex_data/` stays at the root. Existing exported ZIP archives remain compatible.

The update entry point is `npm run update`, with the same `--prices` and `--reset`
modes. Python is no longer required. The catalog updater also stages personal
files before an overwrite publication, protecting standalone `--overwrite` and
recovering an interrupted publication from `data.previous` when `data` is absent.

## Verification and rollback

Before migrating, save a SHA-256 inventory of catalog files, all images, the
source cache and reports, and copy the complete installation outside the checkout.
After the move, compare original `app/` paths with `frontend/` paths. Check file
counts and content hashes, including ignored files. Never include personal data
or a backup archive in a commit.

The migration's full catalog comparison used the same local TCGdex snapshot with
prices disabled in both implementations: all 418 JSON files matched after removing
only the coverage generation timestamp. Synthetic Python-generated fixtures in
`tests/fixtures/expected_catalog.json` make this comparison repeatable in CI.
Network, retries, cache fallback and reset behavior have separate fixture tests.
This comparison does not claim a live full image re-download was performed.

For rollback, stop the server, retain a copy of any newer personal data, and restore
the pre-migration code and folders from the backup. Restore data and code together;
never run the old server against a partially moved installation.
