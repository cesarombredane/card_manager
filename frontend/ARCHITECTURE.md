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
owns export progress and errors. Shared confirmation and empty-state components
provide presentation; their parents retain domain decisions.

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

Collection saves retain the ordered delta queue and cross-tab synchronization.
Binder saves retain their ordered queue. Manual artwork is uploaded through actions
and committed only after a validated successful response. A failed load leaves the
module unready and preserves its previous in-memory data; persistence cannot replace
an unread file with empty defaults. Existing legacy normalization remains in the
load path. Stored keys, IDs, image URLs, archive entries and schema versions remain
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
verification path invokes the updater or writes installation data.

## Growing the application

Group related files within existing layers as features grow. Keep transport out of
presentation components and domain calculations independently testable. Keep each
editable workflow independent, following the [frontend conventions](../docs/frontend_conventions.md).
