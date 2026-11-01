# Frontend instructions

Read `README.md`, `ARCHITECTURE.md` and `../docs/frontend_conventions.md` before
editing Vue or TypeScript. Follow `../docs/design_system.md` for the interface.
Use English for all project content, including comments, documentation and UI text.

- Order Vue blocks as `<template>`, `<script>`, then `<style>` when needed. Use
  Composition API and `<script setup lang="ts">`.
- Indent script content by two spaces. Follow the documented import groups,
  longest-line-first sorting and setup sections. Preserve side effects and style
  import order.
- Explicitly type every `ref`, `reactive` and `computed`. Use concrete domain types
  and validate external data before use.
- Separate success, error and cleanup in asynchronous updates with
  `then` / `catch` / `finally` according to the conventions; preserve required sequencing.
- Keep each editable section independent, with its own workflow in its component.
- Give actions tooltips with a 1000 ms delay; follow field and menu exceptions.
  Align dialog actions with `q-space`.
- Prefer standard Vue, Quasar, Vuex and Vue Router APIs and existing project
  patterns. Avoid custom wrappers where the framework already covers the need.
- Make the smallest complete change requested; keep unrelated cleanup separate.
- Follow [architecture growth rules](ARCHITECTURE.md#growing-the-application) as
  features grow, rather than expanding a single component or store indefinitely.
- Keep presentation components independent of persistence.
- Keep shared state in Vuex modules and local state in components.
- Prefer Quasar utility classes and semantic colours over scattered values.
- Preserve accessible names, keyboard navigation, visible focus and mobile layouts.
- Never put secrets in `VITE_*`, shipped JavaScript or examples.
- Update both `package.json` and `package-lock.json` when dependencies change.
- Apply the [test policy](../docs/contributing.md#test-policy): add tests for
  meaningful risks, not automatically for every edit or UI detail.
- After Vue or TypeScript changes, run lint, typecheck and relevant existing tests.
- After style, route or interaction changes, provide browser verification steps
  for the user. Follow the root instructions prohibiting agent-run end-to-end
  tests and equivalent browser automation.
- After dependency or bundling changes, run build and relevant tests.
- Before delivery, review the final diff and acceptance criteria using the
  [delivery review](../docs/contributing.md#delivery-review).
- Do not edit generated `dist/`, `node_modules/`, reports or test results.
