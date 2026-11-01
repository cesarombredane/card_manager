# Card Manager frontend

Vue 3, Quasar, Vue Router and Vuex, built with Vite. Install dependencies once
from the repository root with `npm ci`; the root workspace lockfile covers the
frontend and TypeScript updater.

From the repository root:

```sh
npm run dev
npm run build
npm run preview
```

Development uses port 5173; preview prints its address. Both provide local JSON
save, manual-image and backup endpoints. Static hosting cannot persist collection
changes. The default host is loopback.

Verification commands are `npm run lint`, `npm run format:check`,
`npm run typecheck`, `npm test`, `npm run build` and `npm run test:e2e` at the root.
Install Chromium once with `npx playwright install chromium`. Browser tests start
a dedicated server with temporary personal storage; they do not use saved user data.

See [architecture](ARCHITECTURE.md), [frontend conventions](../docs/frontend_conventions.md)
and [contributing](../docs/contributing.md). Existing domain facade names and
serialized keys are compatibility boundaries; new internal files use `snake_case`.
