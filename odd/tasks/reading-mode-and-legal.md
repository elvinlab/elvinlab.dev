# Reading mode for notes and legal pages

## Objective and authorization
On 2026-10-01 the user asked for (1) a reading mode for notes, on mobile and desktop, with less noise, (2) policy and privacy pages so the site is not penalized, and then to release everything together to `main` with nothing left pending. They added that the reading mode activation must be a toggle in the central config. Local commits on `feat/reading-mode-and-legal`, push to `develop`, then the release to `main` under the repo's direct-push flow.

## Evidence (390 px phone, real build, before)
The article starts at 538 px: site notice, navbar, a 360 px banner with the grid and a live WebGL canvas, and a card inside a card. The page is 9.5k px tall; body text is already 18 px with a good line height. The noise is the chrome around the text, not the typography.

## Design
- Flag `features.readingMode` (central config, required like the other flags). Off: no toggle, no floating exit, no boot script, no `localStorage` key, and the privacy page does not mention it.
- On: a toggle button at the top of every note (`aria-pressed`, constant label) and a floating exit button shown only while reading. State lives in `localStorage` (`reading-mode`), applied by an inline script in `<head>` before first paint as `html[data-reading]`, only on note pages.
- Reading mode (CSS only): hides the site notice, the banner grid/stars/glow and the canvas, turns the banner into a compact header, hides the sidebar, flattens the article card, uses one column (about 760 px on desktop, wider gutters on phones) and 19 px text with a taller line height. Keeps title, body, decision record, comments, prev/next, the reading-progress bar and the navbar (it already hides on scroll).
- Legal: a Terms page (ES/EN) with only verifiable statements (content license shown on every note, comments through giscus/GitHub, links and no-warranty notice, contact via `/contact`), linked from the footer next to Privacy; cookie wording only if Cloudflare's documentation states it. No legal advice (PLAN.md).
- White-label: the alternative fixture config turns the flag off and the white-label check asserts nothing of the feature renders.

## Tasks
- [x] R1 — Flag `features.readingMode` + conditional privacy wording (schema, fixtures, tests first).
- [x] R2 — Reading mode UI (e2e spec already written and RED), white-label inert assertion, `docs/DESIGN.md`.
- [ ] L1 — Terms page ES/EN, footer link, sitemap, verified wording for cookies/analytics.
- [ ] R3 — Changelog, full suites, release to `main`, verify production.

## Acceptance criteria
- With the flag on: toggle works on ES and EN notes, persists, exits two ways, removes the listed noise, no axe violations in both themes, no overflow at 360 px, wider text column on a phone; other pages never show the mode.
- With the flag off (white-label fixture): no toggle, no script, no `reading-mode` string in the HTML.
- Terms and privacy are linked from every page footer, indexed in the sitemap and accurate to what the site does.
- Full suites green and production serves the release.

## Progress and evidence
R1 done: RED (flag missing in schema, privacy wording), then GREEN; flag `features.readingMode` added to schema, `site.config.ts` (on), the alternative white-label fixture (off) and every test fixture; privacy lists the preference (five) only when the flag is on.
R2 done: RED (e2e spec written first: 51 tests across 360/768/1280, ES/EN, axe in both themes, plus two WebGL pause tests and the boot-script and controls-script unit tests), then GREEN (51 e2e, 33 notes unit tests), stable over repeated runs. Visual check on the real build: on a 390 px phone the note text starts at 380 px (was 538 px), no banner effects, 19 px text and 20 px gutters; desktop is a centered 720 px column. Self-inflicted slips caught by checks: an assertion measured styles at once despite the site's global transitions (now waits), a wrong expectation that the desktop column gets wider (it is narrower on purpose), an over-escaped regex in the white-label check (now validated against a flag-on page), and a bundled script/CSS that shipped with the flag off (now inline and emitted only when on). Measured cost with the flag on: note pages JS 9.13 to 9.67 KiB gzip, CSS about 0.7 KiB gzip only on notes; with the flag off nothing ships (white-label asserts it). Lighthouse is verified in the final run before the release.
Next step: L1 (Terms page + footer + cookie wording verified against Cloudflare docs).

Engram mirror: `odd/reading-mode-legal/tasks`.
