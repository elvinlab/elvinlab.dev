# Experiments: screenshot rail clarity and "Resultado" hierarchy

## Objective and authorization
2026-10-13, owner: "hagamos P1" from the impeccable critique of `/experiments/`. Local commits on `develop`; push and release stay the owner's call. Out of scope: the dark-mode panel notebook cue (P2), hover polish of thumbnails (P3), anything outside `/experiments/`, new data fields, replacing the owner's screenshots.

## Findings being addressed (verified by the parent on screenshots, 1280 px dark/light)
- The thumbnails of the screenshot rail dissolve into the card in dark mode (the fourth is almost invisible): no visible edge, inactive state conveyed by fade.
- In every piece, the three facts (Problema / Mi parte / Resultado) carry the same weight, although "Resultado" is the proof a recruiter wants.
- The screenshots are 16:10 captures of the owner's own site: they are not mis-cropped by the code, so the frame crop stays.

## Tasks
- [x] X12 — Rail thumbnails: a visible edge with at least 3:1 contrast against the card in both themes, inactive state no longer a fade (opacity at least 0.9), active state clearly stronger (2 px primary outline); targets at least 44 px high.
- [x] X13 — "Resultado" hierarchy: set off from the other two facts with a square 3 px primary rule on the left, label in the primary color, text in the full text color one size step larger; Problema and Mi parte keep the secondary tone. Works in solo (no image) and image variants, both locales, both themes, phones and desktop.

## Acceptance criteria
- Only `/experiments/` changes; home, `/me`, `/education/`, `/changelog/` look exactly as before.
- Tokens only, contrast at least 4.5:1 for text and 3:1 for component edges, no overflow at 360 and 390, axe clean in both themes, no new JS, no hard offset shadows, no ALL-CAPS labels.
- Touch-scoped checks per `docs/TESTING.md`; heavy battery once at close.

## Progress and evidence
Route: delegated writer; parent reviews the diff, re-runs checks and looks at screenshots.

### X12 + X13 (delegated writer, 2026-10-13, uncommitted)
- Files: `experiment-styles.ts` (+ test), `ExperimentPiece.astro` (one `data-result` attribute on the Result fact), new `tests/browser/experiments-images.spec.ts` (mapped in `verification-map.ts`), `docs/DESIGN.md` bullet, changelog `experiments-rail-and-result`, page-weight budget (experiments, changelog).
- Scope: every rule lives in the `/experiments/` page stylesheet (`.xp-thumb`, `.xp-facts [data-result]`); no shared component CSS touched.
- Design: thumbnail edge is `1px solid color-mix(text 55%, transparent)` (35% would not reach 3:1; 55% measured above 3:1 on the card and the page, both themes); no fade (opacity removed, was 0.85); checked thumbnail keeps the 2 px primary outline and gets a primary edge; hover darkens the edge only; the transition moved from opacity to border-color inside no-preference. Targets stay 50 px (wide) / 57 px or more (phones), 80 px width unchanged. Result fact: 3 px square primary left rule, 1rem padding, primary mono label, text in the text color at 1.0625rem.
- RED: `vitest run src/experiments-routes` 4 failed before the CSS; `test:e2e:quick tests/browser/experiments-images.spec.ts` 10 failed of 24 (edge contrast, fade/outline, Resultado style, solo variant, per page); targets, focus ring, overflow and axe passed on the old CSS.
- GREEN: vitest 18/18 in the folder, 1631/1631 in `web`; e2e experiments-images 24/24; `biome check .` clean; `typecheck` 0 errors; `build`, `check:js-budget`, `test:white-label`, `docs:config` pass; `check:page-weight` passes after raising `experiments` (style 65560 -> 65900, html 101050 -> 101400; measured 65599 / 101099) and `changelog` (html 120050 -> 120850; measured 120450); no other page type moved. Batch `test:e2e:quick` (experiments, experiments-buttons, experiments-images, no-horizontal-overflow, a11y, mobile-ux, home-sections, me-hero-tips, reduced-motion, calm-pages): 231 passed, 1 skipped, 0 failed.
- Gaps: the fixture has two pieces, both with images; the solo variant is exercised by removing the media of the first piece in the page (real CSS, not Astro-rendered). The rail contrast is asserted at 1280 px only; no screenshots reviewed, no Lighthouse, no full e2e battery.
