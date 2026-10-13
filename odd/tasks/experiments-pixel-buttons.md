# Experiments: pixel-art buttons (design critique pass)

## Objective and authorization
2026-10-13, owner: after the impeccable critique of `/experiments/` (20/28), take the first area only: give the buttons and links of `/experiments/` the same pixel-art identity already shipped on `/education/` (notched corners, stepped motion, focus that survives the notch) and fix the action row that breaks badly on phones. Local commits on `develop`; push and release stay the owner's call. Out of scope this pass: screenshot crops and the weight of "Resultado" (P1), the dark-mode panel / notebook cue (P2), hover polish beyond the buttons (P3), anything outside `/experiments/`.

## Findings being addressed
- P1 `.xp-btn` / `.xp-link` are a smooth-radius filled pill with a pixel arrow stuck on it; hover is only `opacity: .9`.
- P2 at 390 px the action row wraps raggedly and leaves "Código" orphaned under "Leer el caso" and "Ver sitio".
- Consistency: `/education/` and `/experiments/` use two visual dialects.

## Tasks
- [x] X10 — `/experiments/` primary button and secondary links: notched corners, stepped hover/active/focus, pixel arrow that nudges with `steps(2, end)`, all motion inside `prefers-reduced-motion: no-preference`; focus ring not clipped by the notch.
- [x] X11 — Mobile action row: full-width primary, the two secondary links side by side below it, no orphan; 44 px targets; no overflow at 360 and 390.

## Acceptance criteria
- Only `/experiments/` changes; home, `/me`, `/education/`, `/changelog/` look exactly as before.
- No hard offset shadows, no blinking, no Press Start 2P, tokens only, contrast >= 4.5:1, targets >= 44 px, reduced motion shows the states without motion.
- Touch-scoped checks per `docs/TESTING.md`; heavy battery once at close.

## Progress and evidence
Route: delegated writer; parent reviews the diff, re-runs checks and looks at screenshots.

### X10 + X11 (delegated writer, 2026-10-13, uncommitted)
- Route: delegated writer, one pass; parent reviews. Files: `experiment-styles.ts` (+ test), `tests/browser/experiments-buttons.spec.ts` (new, mapped in `verification-map.ts`), `docs/DESIGN.md` bullet, changelog `experiments-pixel-buttons`, page-weight budget (experiments, changelog).
- Scope: everything is under `.xp-btn` / `.xp-link` / `.xp-arrow`, emitted only by the `/experiments/` page stylesheet; `--xp-notch` is written once on `.xp-page`. No shared component CSS touched.
- RED: `vitest run src/experiments-routes` 6 failed before the CSS; `test:e2e:quick tests/browser/experiments-buttons.spec.ts` with the old CSS 8 failed (44 px + notch, phone row, hover nudge/darken, reduced motion; focus and axe passed on the old CSS).
- GREEN: vitest 13/13 in the folder, 1626/1626 in `web`; e2e experiments-buttons 20/20; `typecheck` 0 errors; `build`, `check:js-budget`, `test:white-label` pass; `check:page-weight` passes after raising `experiments` (style 63900 -> 65560, html 99350 -> 101050; measured 65260 / 100736) and `changelog` (html 119550 -> 120050; measured 119636); no other page type moved (no theme-variable leak).
- Batch `test:e2e:quick` (experiments, experiments-buttons, no-horizontal-overflow, a11y, mobile-ux, home-sections, me-hero-tips, reduced-motion, calm-pages): 206 passed, 1 skipped, 1 failed: `home-sections.spec.ts:249` (390 px sidebar cards; the marks card is `display:none` at read time, a race with the stubbed counter). It passes alone (20/20) and in the batch without the new spec; in batches that include the new spec it failed 3 of 4 times. Not proven unrelated: investigate before release. a11y also failed once in a loaded batch and passed alone and on rerun.
- Gaps: the fixture build drops every case note, so no `.xp-btn` renders; the spec injects the real primary markup into the first actions row, so the primary is exercised with the real CSS but not as rendered by Astro. `biome check .` fails only on untracked `.impeccable/config.json` (not part of this work). `stamp-corner.css` and `page-stamps.spec.ts` show as modified in the tree but are not from this work. Arrow nudge is diagonal (2 px, 2 px) as specified. No Lighthouse, no full e2e battery, no screenshots reviewed yet.
