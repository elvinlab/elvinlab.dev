# Browser smoke checks

Run production-page checks locally before changing layout or content routing:

```bash
mise exec -- pnpm exec playwright install chromium
mise exec -- pnpm test:e2e
```

Playwright builds a temporary copy of the app and core, adds synthetic Spanish/English notes,
and serves it with Astro preview. It checks home, notes, note detail, contact pages and the bilingual 404 at
360, 768 and 1280 pixels. A running server is never reused. Port 4322 must be available.

For a faster loop while iterating, `mise exec -- pnpm test:e2e:quick` runs the same checks at 1280
pixels only, and a spec path narrows it further (`pnpm test:e2e:quick tests/browser/smoke.spec.ts`).
Each run pays about 9 seconds of fixed cost (workspace copy, build, preview). Run the full
`pnpm test:e2e` (all three viewports) once before closing a change. Workers default to half of the
available cores, so the full suite takes about 73 seconds on a 12-core machine (107 seconds at 2 workers).

Fixtures live in `tests/fixtures/notes`, outside publishable content. Drafts, secrets and existing
build output are excluded from the temporary copy; source configuration and tokens are never edited.
External installed packages are reused through links, while `@elvinlab/core` resolves to the copied core.
Normal completion and handled termination remove the temporary workspace.

Failures leave an HTML report in `playwright-report/` and traces in `test-results/` (both ignored).
Run `mise exec -- pnpm exec playwright show-report` to inspect results. Unit checks remain
`mise exec -- pnpm test`; the fixture harness is tested with Vitest.

A negative control removes a heading in the browser and verifies that the smoke assertion rejects
the damaged document. Source files are not changed. Astro preview uses `--ignore-lock` to remain
in the foreground under coding agents, so Playwright owns its lifetime.

## Quality budgets and CI

Run the same gates as CI from the repository root:

```bash
mise exec -- pnpm check:js-budget
mise exec -- pnpm exec playwright install chromium  # one-time local browser setup
mise exec -- pnpm test:e2e
mise exec -- pnpm test:white-label
mise exec -- pnpm test:lighthouse
```

The JavaScript budget checks every production-built HTML page, including inline scripts, local
transitive imports, and island modules (`component-url`/`renderer-url`) and their imports, at no more than 30 KiB gzip. Lighthouse uses a separate temporary production
build with synthetic English and Spanish note fixtures, emulates mobile, and checks all four
categories at 95 or higher plus LCP < 2500 ms, CLS < 0.1 and TBT < 200 ms. Three runs are
aggregated pessimistically so one bad run cannot be hidden by a better one.

Lighthouse reports are written locally to `.lighthouseci/` (ignored by Git); the configuration
does not upload them. CI runs every browser, white-label and performance gate in the `checks` job,
which the deploy job requires.

### The note-page LCP gate is sensitive to a few bytes

Lighthouse measures a fixture served by `astro preview`, which does **not** compress responses, under
simulated slow 4G (about 1.6 Mbps, 150 ms round trip). The note page is about 98 KB of HTML, of which
about 52 KB is inline CSS (the whole site stylesheet is inlined in every page), and it sits right at a
TCP slow-start round-trip boundary: a few hundred more bytes cost one extra round trip, about 150 ms,
and the LCP budget is 2500 ms with only about 90 ms to spare.

Measured on 2026-10-02 on `/notes/smoke-es/` (worst of three runs; same machine, same fixture):

| Commit | HTML / inline CSS | FCP | LCP |
|---|---|---|---|
| `3c83905` (before the Now card) | 98 287 / 52 423 bytes | 1812 ms | 2434 ms |
| `f6bb257` (Now card with four new `not-first:` variant utilities) | 98 624 / 52 760 bytes | 1962 ms | **2586 ms (gate fails)** |
| `14fa586` (same card reusing utilities the site already has) | 98 330 / 52 466 bytes | 1812 ms | 2413 ms |

Adding 337 bytes of CSS failed the gate, and the card was visually identical. The check that passed on
the previous release (`8c7968a`) had only about 64 ms of margin. What to do:

- **Never relax the budget** to land a change. Find what grew.
- **Prefer utility classes the site already uses.** Each new utility or variant (`not-first:`,
  `md:`, arbitrary values) adds a rule to the stylesheet that every page inlines. Reuse existing
  classes or `class:list` conditions.
- **Measure before and after** a change that touches shared markup or CSS: build, then compare the
  note page, for example
  `wc -c apps/web/dist/client/notes/<slug>/index.html` (HTML) and the length of its `<style>` blocks.
  A growth of a few hundred bytes is worth a Lighthouse run on that page alone (a copy of
  `lighthouserc.json` with a single `url` and `numberOfRuns: 3`).
- **To find the commit that regressed**, run that single-page Lighthouse at a few commits
  (`git checkout --detach <commit>`, run, `git checkout develop`). Do not run it in the background:
  the fixture server dies with its parent process and every run is then skipped.
- The first run after a checkout can fail with "Chrome prevented page load with an interstitial" when
  the fixture server is slow to start; run it again before trusting a number.

Headroom added on 2026-10-02: the three variable fonts are now declared in `apps/web/src/styles/fonts.css`
with the latin and latin-ext subsets only. The `@fontsource-variable` packages declare every alphabet
(Cyrillic, Greek, Vietnamese), about 4.4 KB of `@font-face` rules per page, one of them inlined as base64.
The note page went from 98 667 to 94 286 bytes of HTML (48 379 of inline CSS) and its worst LCP in the
gate is 2436 ms, with about 4 KB of room before the next round-trip boundary. Keep that room for real
features: check the page size before and after any change to shared CSS or markup.

Follow-up: the margin is thin, so the next additions to shared CSS can break the gate again. Cutting the
inline stylesheet is the durable fix (tracked as a GitHub issue).

## Playwright contact form island

The e2e suite covers the contact form island with a stubbed Turnstile script and the real Action
(no bindings, so it answers service unavailable). The fixture build sets a stub site key.
