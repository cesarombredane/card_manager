# Catalog update pipeline

Run from the repository root after `npm ci`:

```sh
npm run update
npm run update -- --prices
npm run update -- --reset
npm run update:images
npm run update:images -- --set-only
```

The default mode updates the sparse TCGdex checkout, generates an append-only
catalog, refreshes Cardmarket prices, downloads missing images, generates coverage
and typechecks the frontend. `--prices` only updates prices of existing cards and
validates the frontend. `--reset` uses overwrite generation, removes generated
card/set image caches and the price cache, then refreshes prices/images/coverage.
The two modes cannot be combined. Personal JSON and manual images survive reset.

All original standalone options remain available through
`node --import tsx scripts/<script>.ts`. `update_tcgdex_data.ts` accepts
`--overwrite`, `--preserve-images`, `--preserve-prices`.
`report_coverage.ts` accepts `--data PATH` and `--output PATH`; its default is
`frontend/data`. `fetch_tcgdex.ts` creates or updates the checkout without replacing
a non-Git folder. Git remains a prerequisite; Python does not.

Catalog normalization preserves language restrictions, variant/product identities,
Pokémon names/forms and mappings, ordering, regional data and the existing JSON
schema. Existing image and price references can be preserved by standalone modes.
Price downloads fall back to the cached price guide on failure. Holo-price fallback
uses standard columns only when all dedicated holo values are absent.

Images reuse WebP caches. Missing-image records never suppress retries in later
runs. Each request receives up to three attempts for network/timeouts and HTTP
408, 429, 500, 502, 503 and 504, waiting one and two seconds between attempts.
404s are unavailable without retry; set symbols try English then localized URLs.
Only valid WebP responses are published. Eight workers bound concurrency.

Every pipeline run overwrites `reports/update.log` and `reports/images.jsonl`.
The transcript combines stage stdout/stderr. JSONL includes timestamps, URLs,
destinations, attempts, elapsed seconds, outcomes, HTTP status and errors with up
to 2 KB of response details. Existing cached assets generate no request records.
Standalone image updates clear their image log too. `NO_COLOR` disables colors.
Terminal progress is live; redirected progress emits periodic plain lines.

A stage failure stops the pipeline with its exit code. SIGINT returns 130 and
preserves personal data. Timings and timestamps vary across runs; JavaScript errors
retain their native messages. See [migration](migration.md) for recovery and rollback.
