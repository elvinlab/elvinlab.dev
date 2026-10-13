# Experiments: screenshot rail clarity and "Resultado" hierarchy

## Objective and authorization
2026-10-13, owner: "hagamos P1" from the impeccable critique of `/experiments/`. Local commits on `develop`; push and release stay the owner's call. Out of scope: the dark-mode panel notebook cue (P2), hover polish of thumbnails (P3), anything outside `/experiments/`, new data fields, replacing the owner's screenshots.

## Findings being addressed (verified by the parent on screenshots, 1280 px dark/light)
- The thumbnails of the screenshot rail dissolve into the card in dark mode (the fourth is almost invisible): no visible edge, inactive state conveyed by fade.
- In every piece, the three facts (Problema / Mi parte / Resultado) carry the same weight, although "Resultado" is the proof a recruiter wants.
- The screenshots are 16:10 captures of the owner's own site: they are not mis-cropped by the code, so the frame crop stays.

## Tasks
- [ ] X12 — Rail thumbnails: a visible edge with at least 3:1 contrast against the card in both themes, inactive state no longer a fade (opacity at least 0.9), active state clearly stronger (2 px primary outline); targets at least 44 px high.
- [ ] X13 — "Resultado" hierarchy: set off from the other two facts with a square 3 px primary rule on the left, label in the primary color, text in the full text color one size step larger; Problema and Mi parte keep the secondary tone. Works in solo (no image) and image variants, both locales, both themes, phones and desktop.

## Acceptance criteria
- Only `/experiments/` changes; home, `/me`, `/education/`, `/changelog/` look exactly as before.
- Tokens only, contrast at least 4.5:1 for text and 3:1 for component edges, no overflow at 360 and 390, axe clean in both themes, no new JS, no hard offset shadows, no ALL-CAPS labels.
- Touch-scoped checks per `docs/TESTING.md`; heavy battery once at close.

## Progress and evidence
Route: delegated writer; parent reviews the diff, re-runs checks and looks at screenshots.
