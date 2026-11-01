# Frontend conventions

These conventions define the rules for Vue, TypeScript, Quasar and Vuex. Preserve
behaviour, contracts and side-effect order when applying them.

## Language and naming

Use English for all project content: interface text, documentation, comments,
examples, tool messages, communication, identifiers and filenames. Applications
built from this template are English-only.

Use English `snake_case` for internal identifiers and filenames. Types use
`Pascal_Snake_Case`, or a simple name such as `Preferences`. Preserve external APIs
(`modelValue`, `getItem`, `createStore`), required tool names and `App.vue`. Import
component aliases in PascalCase for kebab-case resolution in Vue templates.

## Vue block order and indentation

Place `<template>` before `<script setup lang="ts">`, followed by `<style>` when
needed. ESLint enforces this with `vue/block-order`. Do not create an unused block.

Indent all script content by two spaces, without tab characters. Nested blocks add
two spaces per level. Prettier uses `vueIndentScriptAndStyle: true`, `tabWidth: 2`
and `useTabs: false`; this option also indents any style blocks. ESLint checks
scripts with `vue/script-indent` and `baseIndent: 1`. Conditional and logical
expressions use Prettier indentation exclusively because the two tools otherwise
require conflicting indentation. CI still checks all formatting with Prettier.

## Templates

- Put nested controls and their closing tags on separate indented lines. Keep short
  text-only elements on one line when readable.
- Separate major form sections, separators, card actions and dialogs with blank
  lines. Use short, descriptive comments when helpful.
- Group attributes logically. Do not require one attribute per line or a fixed
  maximum line length. Prettier wraps lines using an indicative width of 100.
- Prefer Quasar utility classes. Add component styles only when existing classes
  do not cover the required behaviour.
- Align dialog actions with `q-space`, without the `align` prop.
- Give action buttons, including dialog actions, tooltips explaining their purpose
  with a 1000 ms delay. Controls generated directly in the DOM can use an
  appropriate `title` attribute.
- Do not duplicate a field's general tooltip on its `prepend` or `append` controls.
  Controls in `before` or `after` slots can have their own tooltip.
- Do not add tooltips to selector or menu option rows. Separate confirmation or
  removal actions can have tooltips.
- For `q-btn-dropdown`, place its general tooltip in the `label` slot, outside the
  menu contents.
- Preserve accessible names, keyboard focus and visible essential explanations.
  A tooltip does not replace a label or error message.

## Imports

Use the following group comments, in this order, only when a group is present:

```ts
// import hooks
import { computed, ref } from 'vue';

// import components
import ConfirmDialog from '../components/common/confirm_dialog.vue';

// import utils
import { use_store } from '../store';

// import types
import type { Preferences } from '../models/preferences';
```

Vue, Vuex, Quasar and Vue Router initialisation APIs belong to the `hooks` group.
Keep asynchronous component declarations with the component group.

Within each group, sort declarations from longest to shortest source line. For a
multiline declaration, use its longest line; preserve existing order for equal
lengths. Keep associated comments and directives attached to their declaration.

Side-effect imports controlling stylesheet precedence are an exception: keep them
together in their functional order under `// import styles`, before other groups,
with a comment explaining that order.

## Script sections

Organise setup code in this order, omitting unused sections:

```ts
/* hooks */
// defineProps, defineEmits and hook calls.

/* const vars */
// Non-reactive constants.

/* reactive vars */
// Explicitly typed ref and reactive values.

/* computed vars */
// Explicitly typed computed values.

/* functions */
// Named functions.

/* watchers */
// Watchers and lifecycle registrations.
```

Add a small named section when necessary for types or initialisation. TypeScript
modules use the same import groups; setup sections apply to components and
composables rather than imposing that structure on tests.

Preserve eager initialisation and registration order: do not move a constant or
computed value after its first use to satisfy visual ordering. Put each
declaration on its own line. Separate distinct functions and computed declarations
with a blank line. Expand props, events, multi-property objects and long callbacks.

Keep one blank line before each section, compatible with automatic Prettier
formatting. Use one formatter for these files.

## Types and expressions

- Explicitly type every `ref`, `reactive` and `computed`, including booleans and
  inferable values. Use the actual domain type, never `any`.
- Keep request and response types with their existing domain model. Draft types
  used by a single component stay in that component.
- Avoid `unknown` annotations for known domain values. Unvalidated external input
  can be `unknown`, such as after `JSON.parse`, until its structure is checked.
  This preserves storage and import validation without unjustified assertions.
- Break long conditions at logical operators and substantial method chains at
  method calls.
- Use a block body for functions performing several actions, with one action per
  line. Prefer `computed` for derived values and watchers for necessary effects.
- Clean up timers, listeners, subscriptions and object URLs on destruction.

## Updates and promises

For asynchronous updates, separate success, error and cleanup using
`.then(...).catch(...).finally(...)`. Name a used result `res` and a used error
`err`. Name an unused parameter `_`, or omit it. Always write
`.finally(() => { ... })` without a result argument.

```ts
save_changes()
  .then((res) => {
    apply_response(res);
  })
  .catch((err) => {
    report_error(err);
  })
  .finally(() => {
    saving.value = false;
  });
```

Leave `.catch()` parameters unannotated and validate their shape before reading
properties. Keep `async` / `await` for sequences that need it, such as `nextTick`,
form validation and browser test steps. Before removing `async`, check the Promise
contract expected by callers. Move common cleanup to `finally` only when its order
remains equivalent; independently launched requests keep their own cleanup.

Synchronous `localStorage` operations use `try` / `catch`. Do not artificially
convert them to promises.

## Responsibilities and editable sections

Vuex mutations are synchronous; actions handle shared updates. For administration
APIs, keep calls and response conversion in dedicated actions without adding a
generic request dispatcher beside the store. Services encapsulate storage or
low-level transport access; presentation components do not perform it directly.

Each editable section owns its draft, validation, edit/cancel/save functions,
confirmation, notifications and watchers. Do not combine those workflows into a
generic composable or form that makes sections dependent on one another. A
presentation component such as `confirm_dialog` remains reusable: its parent owns
the domain decision and supplies its text. Backend validation and authorisation
remain authoritative when a backend exists.

## Large collections

- Reuse shared reactive option lists and indexes. For a known identifier, prefer
  direct access; copy a shared list before sorting it.
- Build a reactive `Set` once for repeated membership checks. Avoid `filter`
  operations containing `some` or `includes` over large lists.
- Use a computed `Map` for repeated lookups in grids, searches and bulk edits.
  Preserve ordering, duplicates, identifier types and multiple matches.
- Build indexes from already authorised data. Preserve access filtering while
  optimising lookups.
- Share expensive indexes between recursive items instead of rebuilding them for
  each row. Watch only fields relevant to the selector.
- Keep caches reactive and scoped to their input context. Do not reuse data from
  another session. A single lookup in a small list does not automatically need an
  index.
- Virtualise large menus; a height limit does not reduce rendered rows. Check
  additions, removals, edits, ordering and duplicates with representative volumes,
  then verify navigation and selection in the browser.

## Verification

Prettier handles formatting on save and in CI. ESLint checks automated conventions,
including Vue block order, script indentation and explicit reactive types.
Review import grouping and sorting, section responsibilities and callback names
manually. Use the [test policy and delivery review](contributing.md) to choose tests
and assess completion; new automated tests are not required for every edit.
Run the relevant frontend README commands and verify changed controls in the
browser. Apply conventions to affected files without reformatting unrelated
application components.
