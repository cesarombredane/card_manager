# Frontend architecture

`main.ts` loads icons, Quasar styles and theme tokens in order, enables dark mode,
and installs the router and Vuex store. `App.vue` renders `layouts/main_layout.vue`.
Existing history routing and route parameters remain compatible.

Views coordinate interactions. Components receive domain values and emit user
intent. `models/catalog.ts` defines catalog contracts. Services load the catalog
and communicate with the local personal-data API. Pure utilities handle sorting,
localization, Pokémon binder requirements, layout calculations and PDF exports.

The root Vuex store retains navigation/filter state. `store/modules/collection`,
`binders` and `manual_images` retain the existing reactive domain facades, load/save
queues and cross-tab collection synchronization. Their public methods and ordering
are preserved to avoid changing persistence behavior during migration. A separate
conversion of those facades to Vuex actions would require its own compatibility
review; do not silently replace them with a different state library.

`server/personal_data.ts` provides the same middleware in development and preview.
Its root can be injected for isolated verification. `CARD_MANAGER_TEST_ROOT` is
reserved for tests and redirects personal JSON and manual image writes to a
temporary frontend folder. Normal operation uses this frontend directory.

Data schema versions, IDs, endpoint paths, backup ZIP entry names, validation,
atomic writes and rollback behavior remain stable. Personal JSON is not eagerly
imported into the frontend bundle. Catalog imports preserve their existing paths
relative to `src/services`.

## Growing the application

As features grow, group related files within layers. Keep transport out of
presentation components, keep domain calculations independently testable and retain
existing contracts. UI palettes live in `styles/quasar_variables.sass`; theme tokens
reuse that source while retaining Card Manager's existing colors.
