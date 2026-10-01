# Browser smoke checks

Run production-page checks locally before changing layout or content routing:

```bash
mise exec -- pnpm exec playwright install chromium
mise exec -- pnpm test:e2e
```

Playwright builds a temporary copy of the app and core, adds synthetic Spanish/English notes,
and serves it with Astro preview. It checks home, notes, note detail, contact pages and the bilingual 404 at
360, 768 and 1280 pixels. A running server is never reused. Port 4322 must be available.

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
which both PR previews and branch deploys require.

## Playwright contact form island

The e2e suite covers the contact form island with a stubbed Turnstile script and the real Action
(no bindings, so it answers service unavailable). The fixture build sets a stub site key.
