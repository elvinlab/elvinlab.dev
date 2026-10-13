# Experiments: pixel-art buttons (design critique pass)

## Objective and authorization
2026-10-13, owner: after the impeccable critique of `/experiments/` (20/28), take the first area only: give the buttons and links of `/experiments/` the same pixel-art identity already shipped on `/education/` (notched corners, stepped motion, focus that survives the notch) and fix the action row that breaks badly on phones. Local commits on `develop`; push and release stay the owner's call. Out of scope this pass: screenshot crops and the weight of "Resultado" (P1), the dark-mode panel / notebook cue (P2), hover polish beyond the buttons (P3), anything outside `/experiments/`.

## Findings being addressed
- P1 `.xp-btn` / `.xp-link` are a smooth-radius filled pill with a pixel arrow stuck on it; hover is only `opacity: .9`.
- P2 at 390 px the action row wraps raggedly and leaves "Código" orphaned under "Leer el caso" and "Ver sitio".
- Consistency: `/education/` and `/experiments/` use two visual dialects.

## Tasks
- [ ] X10 — `/experiments/` primary button and secondary links: notched corners, stepped hover/active/focus, pixel arrow that nudges with `steps(2, end)`, all motion inside `prefers-reduced-motion: no-preference`; focus ring not clipped by the notch.
- [ ] X11 — Mobile action row: full-width primary, the two secondary links side by side below it, no orphan; 44 px targets; no overflow at 360 and 390.

## Acceptance criteria
- Only `/experiments/` changes; home, `/me`, `/education/`, `/changelog/` look exactly as before.
- No hard offset shadows, no blinking, no Press Start 2P, tokens only, contrast >= 4.5:1, targets >= 44 px, reduced motion shows the states without motion.
- Touch-scoped checks per `docs/TESTING.md`; heavy battery once at close.

## Progress and evidence
Route: delegated writer; parent reviews the diff, re-runs checks and looks at screenshots.
