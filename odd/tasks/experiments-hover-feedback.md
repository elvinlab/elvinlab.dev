# Experiments: hover feedback on the screenshot rail and frame (critique P3)

## Objective and authorization
2026-10-13, owner: "vamos por P3" of the impeccable critique of `/experiments/`. Hover feedback on the screenshot rail thumbnails and on the media frame is too subtle (the frame brackets only change color, the thumbnail hover is almost the same as rest). Local commits on `develop`; push and release stay the owner's call. Out of scope: anything outside `/experiments/`, the buttons (done in X10), the rail edge and the Resultado hierarchy (done in X12/X13).

## Design
Same stepped pixel language as `/education/` (notch, `steps(2, end)`), nothing smooth, nothing looping:
- Rail thumbnail hover and focus-visible: the edge turns to the primary color, the thumbnail lifts 1 px in `steps(2, end)`; the active thumbnail keeps its 2 px primary outline and is not affected by the lift.
- Media frame hover and focus-within: the four square-capped corner brackets grow their arms by about 4 px in `steps(2, end)` and turn primary; no layout shift (brackets are outside the flow), the clipped zoom behavior stays as it is.
- Everything inside `@media (prefers-reduced-motion: no-preference)`; with reduced motion the states are still visible by color only. Pointer-hover rules also exist for `:focus-visible` so keyboard users get the same feedback.

## Tasks
- [ ] X16 — Thumbnail hover/focus feedback (edge, lift) with unit style tests and e2e on computed styles.
- [ ] X17 — Frame hover/focus-within bracket growth with tests; visual review of hover states in dark and light.

## Acceptance criteria
- Only `/experiments/` changes; home, `/me`, `/education/`, `/changelog/` look exactly as before.
- No layout shift on hover (bounding boxes identical), no new JS, no hard offset shadows, tokens only, contrast of component edges at least 3:1 in both themes, reduced motion computed durations at most 0.001 s.
- The writer takes hover screenshots and looks at them; the parent reviews them again.

## Progress and evidence
Route: delegated writer; parent reviews the diff, re-runs checks and looks at screenshots.
