# Browser smoke checks

Run production-page checks locally before changing layout or content routing:

```bash
mise exec -- pnpm exec playwright install chromium
mise exec -- pnpm test:e2e
```

Playwright builds a temporary copy of the app and core, adds synthetic Spanish/English notes,
and serves it with Astro preview. It checks home, notes, note detail and the bilingual 404 at
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

Accessibility, first-paint theme, white-label and performance gates follow in T17.2–T17.3.
