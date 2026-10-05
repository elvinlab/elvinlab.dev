# Feature: marks ("huellas"), an anonymous "I was here" button on every note

## Objective
Readers can leave a footprint on a note with one tap, no account and no comment. Taps accumulate in a per-note counter stored in Cloudflare D1. The feature is on from day one on elvinlab.dev, visible without scrolling on phone and desktop, and its animation is chosen from the central config.

## Decisions (owner, 2026-10-05)
- Storage: Cloudflare D1, behind a `MarkStore` port so Turso could be added later as another adapter. Turso was considered (free plan: 100 databases, 5 GB, 500 M rows read and 10 M rows written per month; D1 free: 5 M reads and 100 k writes per day, 5 GB): D1 wins here for one vendor and one account, no extra secret, no extra processor in the privacy page, atomic `UPDATE ... SET total = total + n`.
- No IP is stored or hashed. IPs are personal data; the abuse brake is the Workers rate limiter binding, keyed by IP only inside the limiter (same as contact).
- As many footprints as the visitor wants, claps style: each tap adds 1, the client batches taps (about 700 ms) into one request, a soft cap per browser and note (`marks.maxPerVisitor`, default 50) kept in `localStorage`; after the cap the stamp still animates but adds nothing.
- Animation and limits come from the central config: `features.marks` (on) and a `marks` block `{ animation: 'stamp' | 'burst' | 'pulse' | 'none', maxPerVisitor, showCountFrom }`. Every preset obeys `prefers-reduced-motion`.
- Visible from the first screen, not hidden at the end: one button in the note header (inline, under the title, near the date and reading time) and a second invitation at the end of the article; both share one counter and one state. Inline, not floating: the site is calm and a fixed bottom element covers text, the language hint and the reading-mode exit and can hide keyboard focus.
- The count is shown only from `marks.showCountFrom` (default 5) footprints; before that the text invites the reader to be among the first.

## Authorized scope
Local implementation on `develop`: code, tests, docs, changelog. NOT authorized: creating the D1 database, applying migrations, adding the `d1_databases` binding with a real id, or any Cloudflare operation; pushing; releasing. Those need explicit owner authorization (destination, operation, credential). The code must fail closed: with no `MARKS_DB` binding the buttons do not render a broken UI.

## Design
- `features/marks/`: `ports.ts` (`MarkStore`, `MarkLimiter`, note catalog), `marks.ts` (pure rules: slug must be a published note, taps per request 1 to 10, rate limit), `bindings.ts` (zod, `MARKS_DB` D1 and `MARKS_RATE_LIMITER`, separate from the contact bindings so `env-vars.test.ts` is untouched), `adapters/d1.ts` (+ `migrations/0001_marks.sql`: table `marks(slug TEXT PRIMARY KEY, total INTEGER NOT NULL DEFAULT 0)`, upsert with `RETURNING total`), `runtime.ts`, `index.ts`; Astro Actions `marks.get` and `marks.leave` in `actions/index.ts` (Origin check, `cloudflare:workers` env, SERVICE_UNAVAILABLE when unconfigured, like contact).
- Client: Preact island `MarkButton` (client:load in the header, client:visible at the end) over a small shared store; scoped CSS keyed by `data-animation`.
- Config: `features.marks` required boolean like the other flags (so `site.config.ts`, `tests/fixtures/site.config.alt.ts`, `schema.test.ts`, `nav.test.ts`, `sitemap-filter.test.ts` and the generated docs change) plus `marks: z.object({...}).default({})` and a resolved export from `shared/config/index.ts`.

## Tasks (each closes with a commit; route: delegated direct, one writer at a time)
- [ ] M1 Config: schema, `site.config.ts` (marks on, animation stamp), white-label fixture (off), tests, `pnpm docs:config`.
- [ ] M2 Domain and server: ports, rules, bindings, D1 adapter with a real-SQL test (`node:sqlite`), migration, runtime, actions, `MARKS_RATE_LIMITER` in `wrangler.jsonc` (no D1 binding yet).
- [ ] M3 UI: store, island, animations, i18n ES/EN, NotePage integration (header and end), e2e with mocked actions (visible without scrolling at 360, 768 and 1280 px, tap, batch, cap, two buttons in sync, reduced motion, axe), js-budget.
- [ ] M4 Privacy page (ES and EN, conditional on the flag), ADR 0013, `docs/CONFIGURATION*.md` recipe (create D1, binding, migration), `docs/DESIGN.md`, changelog, white-label check.
- [ ] M5 Closing battery (typecheck, lint, unit, depcruise, docs:config, build, js-budget, white-label, cold start, full e2e, Lighthouse); report; ask for the Cloudflare authorization.

## Acceptance
Both buttons visible on the first screen of a note at 360, 768 and 1280 px; a tap animates and increments; batching, cap and fail-closed behavior covered by tests; no IP stored; privacy page truthful; every check green; the owner's D1 step documented.

## Progress
Created 2026-10-05 after mapping (explorer): patterns for flags, actions, bindings, privacy, tests and dependency-cruiser read. Nothing implemented yet.
