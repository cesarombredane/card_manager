# Frontend architecture

`main.ts` loads local icons, Quasar styles and application styles in that order,
enables dark mode, registers domain modules and installs the router and typed Vuex
store. `App.vue` renders `layouts/main_layout.vue`. The layout provides the shared
header, navigation and keyboard skip link. `app_config.ts` holds public application
identity. Routes load pages lazily and use `BASE_URL`; existing history URLs and
route parameter names remain compatible. Unknown URLs show the not-found page.

## Responsibilities

Views coordinate routes and domain values. Each binder editing component owns its
own draft, validation, save/cancel workflow and feedback: setup, settings, automatic
layout, individual asset creation/editing and bulk image uploads. The PDF button
owns export progress and errors. Collection workflows live in `components/collection`: entry editing, transfers,
bulk language edits, Pokédex options, folder creation/settings, template creation,
folder deletion, and personal-data import/export. Each component owns its drafts,
validation, progress and feedback. Route views select context and clear selection
after a successful bulk edit or transfer. Shared confirmation and empty-state
components provide presentation; their parents retain domain decisions.

`models/` defines domain contracts. Services load the catalog and transport requests
to the local personal-data API. `personal_validation.ts` checks untrusted personal
JSON before it enters state or is imported/written by the local server. Pure
utilities handle sorting, localization, image processing, layout calculations and
PDF exports. `styles/quasar_variables.sass` supplies the template palette;
`theme.scss` and `app.scss` supply shared tokens, surfaces and accessible focus.
Binder geometry lives in `styles/binder.scss` and keeps its existing physical sizes.

## Shared state and persistence

`store/core.ts` creates the typed Vuex store with strict mode in development.
Navigation/filter state stays at the root. Namespaced collection, binders and
manual-images modules own personal data, readiness and errors. Synchronous named
mutations apply domain edits; actions load and persist them. Compatibility facades
expose computed reads and route edits through mutations. `commit_result.ts` preserves
existing synchronous return values such as a newly created folder or proxy.

Personal datasets are immutable snapshots, published through their Vuex module's
`data` property. `store/immutable_data.ts` marks each snapshot raw and recursively
freezes its JSON records. Vuex strict mode remains enabled in development and
checks module/root assignments; frozen records reject nested writes in every
build. This avoids its synchronous deep watcher traversing thousands of records
for each field change or unrelated filter update.

Collection and binder mutations prepare a writable `structuredClone` draft, run
the existing domain operations, then publish once. Nested operations share that
draft and request one save. Failed edits discard the draft and propagate their
error after Vuex finishes its mutation bookkeeping. Loads reconcile before
publication. Unchanged Pokédex requirements retain their timestamps. Queries must
read the current module snapshot, and consumers derive values with computed reads;
do not cache a mutable reference to an earlier dataset or modify returned records.

Collection saves retain the ordered delta queue and cross-tab synchronization.
The queue holds immutable before/after snapshots without cloning the entire
reactive collection for each save; an explicit flush without a new snapshot does
not enqueue an empty operation.
Binder saves retain their ordered queue. Manual artwork is uploaded through actions
and committed only after a validated successful response. A failed load leaves the
module unready and preserves its previous in-memory data; persistence cannot replace
an unread file with empty defaults. Existing legacy normalization remains in the
load path; missing legacy manual-card fields receive safe in-memory defaults
without rewriting the original file. Manual-card variant edits run inside the
collection mutation before entry matching and queued persistence. Stored keys, IDs, image URLs, archive entries and schema versions remain
compatibility contracts.

`server/personal_data.ts` provides the same local middleware in development and
preview. Normal operation uses the frontend directory. `CARD_MANAGER_TEST_ROOT`
redirects personal storage for isolated tests. No personal JSON is imported into
the browser bundle. Normal catalog imports retain their existing relative paths.

## Isolated verification

`scripts/fixture_build.ts` creates a temporary catalog from the checked-in synthetic
fixture and builds production assets there, without copying installation artwork.
`CARD_MANAGER_FIXTURE_ROOT` redirects catalog imports, build output and personal
middleware to that temporary directory. Playwright serves that production bundle
through Vite preview and removes the temporary directory when stopped. Neither
verification path invokes the updater or writes installation data. Frontend unit
tests are included in type checking. Agents do not run browser or end-to-end
verification; those checks are user-run or run by CI.

## Growing the application

Group related files within existing layers as features grow. Keep transport out of
presentation components and domain calculations independently testable. Keep each
editable workflow independent, following the [frontend conventions](../docs/frontend_conventions.md).
