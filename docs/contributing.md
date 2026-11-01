# Contributing and verification

## Local work

Before editing, present a concrete plan with affected components and verification,
obtain explicit approval, and wait. Read-only investigation may establish scope.
Approval covers that plan; material scope changes need a revised approved plan.
See [development instructions](../AGENTS.md) for the lasting rules.

Keep changes focused and document contracts that change. Bug reports describe the
expected result, observed result, reproduction steps and environment. Feature
requests explain the need and acceptance criteria. No issue or pull request
template is required.

Before delivery, run the relevant commands from the frontend README. Contract or
configuration changes require broader verification.

## Test policy

Choose verification based on the behaviour changed and the consequence of a
regression. Do not add tests automatically for every change or to increase a test
count or coverage percentage.

| Test type  | Add or update when                                                                                                 | Keep out of scope                                                                      |
| ---------- | ------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------- |
| Unit       | Domain calculations, validation, data transformations, persistence contracts or meaningful failure handling change | Trivial getters, framework internals and assertions that repeat implementation details |
| End-to-end | A critical journey needs browser-level protection, such as creating, saving, restoring or deleting user data       | Every control, label, tooltip or cosmetic detail                                       |

For a bug fix, add a focused regression test when it protects meaningful behaviour
at a reasonable maintenance cost. Where practical, confirm that it fails for the
original bug and passes with the fix. Test observable outcomes and contracts rather
than private functions, component structure or incidental wording.

Keep only a small set of critical browser journeys. Prefer a unit test when it can
protect the same rule without browser integration. Use isolated data and avoid
dependence on personal files, external services or arbitrary delays.

For low-impact presentation changes, verify the affected screen manually instead
of adding automated tests for labels, tooltips, formatting or framework behaviour.
A cosmetic edit does not require a new unit or end-to-end test. Update an existing
test if the requested change intentionally alters behaviour it covers; do not
weaken or delete a test merely to make the suite pass.

Locally, run relevant existing tests and focused checks. Expand verification for
shared contracts, routing, persistence, dependencies, build changes or failures
that focused checks cannot resolve. Repeated full-suite runs need a reason, such
as new changes or unresolved failures. CI runs both suites as configured below.
Tests do not run automatically on save, development startup or build;
`npm run test:watch` explicitly enables unit-test watch mode.

## Delivery review

Before reporting a task complete:

1. Check the request's observable acceptance criteria against the final behaviour.
2. Review the final diff for accidental edits, unnecessary abstractions, unrelated
   formatting, changed dependencies and generated files. Keep only what the task
   needs, including necessary documentation and verification.
3. Check preservation of unrelated behaviour and compatibility of any affected
   data formats or APIs. Review architecture boundaries when responsibilities change.
4. Run the relevant checks and inspect their results. Check the affected UI in the
   browser when interactions or presentation change.
5. Report what changed, why, which checks ran and any checks that could not run or
   material limitations. Do not present untested behaviour as verified.

Prefer standard tools and repository patterns throughout the change. The smallest
complete solution should remain understandable through subsequent updates; avoid
both speculative infrastructure and shortcuts that leave the request incomplete.

## Verification storage boundary

Use `npm run build:fixture` and `npm run test:e2e` for isolated production checks.
They build a synthetic catalog into temporary storage and serve it through preview.
Unit tests use synthetic inputs and temporary directories. Never run update, reset,
price refresh, download or catalog generation as a verification shortcut. Do not
modify existing catalog files, personal JSON, image indexes or artwork. Installation
backups require an explicit request. Formatting from either workspace ignores local
data and public artwork.

## GitHub workflow

`.github/workflows/ci.yml` defines one workflow. On a push or pull request, GitHub
installs locked dependencies, checks formatting and types, runs tests, builds the
application and verifies Chromium journeys. Results appear as passing or failing
checks on GitHub.

The workflow does not edit code or deploy. It detects omissions and regressions.
New runs replace older concurrent runs on the same branch. Workflow permissions
are limited to repository read access. No secrets are required. Install from the root workspace lockfile; CI uses fixtures and never refreshes the live catalog or personal data.

Branch protection and required checks are configured in GitHub; the template files
do not create them. Private repositories use the account's Actions allowance.

## Documentation

Describe current behaviour. User-visible changes can be recorded in project
release notes according to its process; no changelog is generated or published
automatically. Link to the conventions instead of repeating coding rules in each
README.
