# Experiments: hover feedback on the screenshot rail and frame (critique P3)

## Objective and authorization
2026-10-13, owner: "vamos por P3" of the impeccable critique of `/experiments/`. Hover feedback on the screenshot rail thumbnails and on the media frame is too subtle (the frame brackets only change color, the thumbnail hover is almost the same as rest). Local commits on `develop`; push and release stay the owner's call. Out of scope: anything outside `/experiments/`, the buttons (done in X10), the rail edge and the Resultado hierarchy (done in X12/X13).

## Design
Same stepped pixel language as `/education/` (notch, `steps(2, end)`), nothing smooth, nothing looping:
- Rail thumbnail hover and focus-visible: the edge turns to the primary color, the thumbnail lifts 1 px in `steps(2, end)`; the active thumbnail keeps its 2 px primary outline and is not affected by the lift.
- Media frame hover and focus-within: the four square-capped corner brackets grow their arms by about 4 px in `steps(2, end)` and turn primary; no layout shift (brackets are outside the flow), the clipped zoom behavior stays as it is.
- Everything inside `@media (prefers-reduced-motion: no-preference)`; with reduced motion the states are still visible by color only. Pointer-hover rules also exist for `:focus-visible` so keyboard users get the same feedback.

## Tasks
- [x] X16 — Thumbnail hover/focus feedback (edge, lift) with unit style tests and e2e on computed styles.
- [x] X17 — Frame hover/focus-within bracket growth with tests; visual review of hover states in dark and light.

## Acceptance criteria
- Only `/experiments/` changes; home, `/me`, `/education/`, `/changelog/` look exactly as before.
- No layout shift on hover (bounding boxes identical), no new JS, no hard offset shadows, tokens only, contrast of component edges at least 3:1 in both themes, reduced motion computed durations at most 0.001 s.
- The writer takes hover screenshots and looks at them; the parent reviews them again.

## Progress and evidence
Route: delegated writer; parent reviews the diff, re-runs checks and looks at screenshots.

### X16 + X17 (delegated writer, 2026-10-13, uncommitted)
- Files: `experiment-styles.ts` (+ unit tests), new `tests/browser/experiments-hover.spec.ts` (mapped in `verification-map.ts`), `docs/DESIGN.md`, `changelog.json` (`experiments-hover-feedback`), `page-weight-budget.json`.
- Scope: every rule is in the `/experiments/` page stylesheet (`.xp-thumb`, `.xp-shot`); home, `/me` and case pages share none of those classes, so nothing outside changed.
- Thumbnails: hover (`@media (hover: hover)`) and `:focus-visible` of the radio turn the edge primary; inside `prefers-reduced-motion: no-preference` the thumbnail lifts 1 px with `transition: border-color / transform 150ms steps(2, end)`. The checked rule carries `transform: none` (higher specificity than hover) and the focus lift uses `:not(:checked)`, so the active thumbnail stays put and keeps the outline and the cyan ring.
- Frame: brackets use `--xp-arm` (14 px at rest) on `.xp-shot`; hover (`.xp-shot:hover`, so a thumbnail hover no longer tints the frame) and `.xp-media:focus-within` turn them primary and set `--xp-arm: 18px` in no-preference only, with `background-size 150ms steps(2, end)` on `::after` and `color` moved from 250 ms ease-out to `steps(2, end)`. Zoom unchanged. With reduced motion only the color changes.
- RED: unit tests (4 of the 6 new failed before the CSS) and `experiments-hover.spec.ts` (12 of 18 failed on the old CSS; the layout and 360/390 specs also failed for a test-side reason, a late layout settle of about 8 px, fixed by waiting for fonts and visible images before reading the rest geometry). GREEN: 18 of 18.
- Checks: biome clean; typecheck 0 errors; depcruise clean; vitest 141 files / 1646 tests; web build ok; js-budget pass; `check:page-weight` initially failed only `experiments` (+838 B style, +926 B html) and `changelog` (+389 B html), budgets raised with dated reasons, then all 42 pages pass; white-label ok; docs:config up to date; e2e quick (experiments x5, no-horizontal-overflow, a11y, mobile-ux, home-sections, me-hero-tips, reduced-motion, calm-pages): 273 passed, 1 skipped.
- Visual review (preview build, 1280x900 dark and light, hover of a non-active thumbnail and of the frame after 400 ms, one reduce shot, 390 px rail): the primary edge and the grown violet brackets read clearly in both themes; the reduce shot keeps the primary edge and primary brackets at the resting arm length; the 390 px rail still fits four thumbnails. No visual fix was needed.
- Gaps: no Lighthouse, no full e2e battery (not requested); the lift is 1 px by design so on thumbnails the main cue is the primary edge.
- Next step: parent review of the diff and screenshots, then commit.
