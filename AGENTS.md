# Development instructions

## Project and language

Use English for all communication, documentation, code comments, identifiers,
filenames, UI text, examples and tool messages. Applications built from this
template are English-only.

Read `README.md` before changing commands or contracts. Read `ARCHITECTURE.md` for
shared changes, then the documentation and instructions of the affected component.
Use English `snake_case` for internal identifiers and filenames. Preserve external
API names, required tool filenames and PascalCase component import aliases, such
as `modelValue`, `App.vue` and `package-lock.json`.

## Clarification and plan approval

Ask the user for clarification when information needed to build the requested
change is missing or ambiguous. Resolve questions that affect scope, behaviour or
acceptance criteria before implementing the dependent work. Read-only investigation
may happen first to make questions and proposals concrete.

Read-only investigation may establish the scope. Before editing any files, prepare a plan describing the proposed changes, affected
files or components, and planned verification. Present the plan to the user, ask
for explicit approval and wait for that approval before making edits. A request
to implement a feature or fix is not, by itself, approval of a plan that has not
yet been presented.

Approval covers the described scope; do not request the same approval again when
it has already been given in the conversation. If the scope materially changes,
submit a revised plan and obtain approval before editing outside the approved
scope.

## Scope

Make the smallest complete change that satisfies the request and its observable
acceptance criteria. Include necessary error handling, contract updates,
documentation and verification, but avoid unrelated refactoring, renaming,
formatting, dependency upgrades or speculative features. Address the actual cause
rather than hiding a symptom. Preserve existing behaviour outside the request.

Prefer standard language features, documented framework APIs and established
repository patterns. Reuse existing capabilities before adding dependencies,
wrappers or custom infrastructure. Introduce an abstraction only for a concrete
need; do not build extension points for hypothetical future requirements.

Do not commit, push, publish or deploy without an explicit request. Do not modify
user data or external services outside the authorised scope. Keep secrets out of
the repository.

## Rule priorities

Within the authorised task, prioritise correctness, user data protection and
security, then maintainability and clear contracts, then cosmetic preferences.
Follow the configured conventions, but do not distort behaviour or introduce
unnecessary complexity merely to satisfy a stylistic preference. Resolve conflicts
explicitly; do not silently disable checks or weaken tests to make a change pass.

## Documentation

READMEs describe installation, features and usage; architecture documents explain
responsibilities and contracts; AGENTS files contain lasting development rules;
`docs/` contains procedures. Link to detailed rules instead of duplicating them.
Describe current behaviour and check the implementation when it disagrees with
the documentation. Update documents affected by behaviour changes.
Track tasks in `TODO.md` using the format explained at the top of that file. Do
not put issue references in architecture or usage documentation.

## Data and dependencies

Separate user data, examples and generated artefacts. Preserve original files.
Validate external inputs at runtime: TypeScript does not validate JSON. Check
readers and writers before changing a stored format or API. Do not require a
backend for applications that can run in the browser. Keep dependencies limited;
update the lockfile and documentation when dependencies or prerequisites change.

## Verification

Run the relevant focused checks; expand them when shared contracts or build
configuration change. Test behaviour, errors and contracts without adding tests
that simply repeat the implementation. Use the [test policy](docs/contributing.md#test-policy)
to decide whether to add unit or end-to-end tests. New tests are not required for
every change. CI checks the code; it does not deploy it.

Before delivery, follow the [delivery review](docs/contributing.md#delivery-review):
review the final diff, verify acceptance criteria and preservation of unrelated
behaviour, and report the checks performed and their actual limitations. Never
claim a check passed without running it. A green pipeline does not replace a
review of architecture and behaviour.

## Current verification boundary

Use synthetic fixtures and temporary storage for automated verification. Do not
run update, reset, download, price-refresh or catalog-generation commands as a
verification shortcut. Do not modify existing catalog files, personal JSON, image
indexes or artwork. Installation backups require an explicit request.
