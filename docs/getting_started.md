# Getting started

Use the Node version in `.nvmrc` and Git. From the repository root run `npm ci`.
On an existing installation, migrate ignored saved files before starting the
server; see [migration](migration.md). On a fresh installation, `npm run update`
creates the complete catalog and cached artwork. Updates require internet access.

Start with `npm run dev`, then open the printed loopback address. Use collection
Export to create a portable ZIP backup. Stop the server before moving installations.
Do not commit personal data, caches or backup archives.

For a production build served locally use `npm run build` and `npm run preview`.
Preview provides the same persistence API as development. A static file host only
supports catalog browsing.
