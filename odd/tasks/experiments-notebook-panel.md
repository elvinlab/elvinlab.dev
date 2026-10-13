# Experiments: notebook cue on the piece panel (critique P2)

## Objective and authorization
2026-10-13, owner chose "no box + number" for P2 of the impeccable critique of `/experiments/`: in dark mode the text panel of each piece is an identical dark card, so the lab-notebook identity (design v3) does not show. Local commits on `develop`; push and release stay the owner's call. Out of scope: P3 hover polish, screenshot content, anything outside `/experiments/`, the compact tier and `/me`.

## Design (decided with the owner)
- Drop the card box of the piece panel (no fill, no radius): the text sits directly on the page like the home main column and `/notes/` ("fewer boxes", decided 2026-10-10), separated by space and the dashed hairline between pieces.
- Add a mono entry label "Experimento 001" / "Experiment 001", the counterpart of "Nota 003" on notes (number in the pink accent, the one accent), above the status pill. The number is stable: the 1-based position of the experiment in publication-date order (oldest = 001, id as tie-break), never the position in the current sort or page. Document it in `docs/PORTFOLIO.md` and `docs/PORTFOLIO.en.md`.
- Keep Problema / Mi parte / Resultado (with the hierarchy of X13), the chips and the actions (X10/X11) as they are.

## Tasks
- [ ] X14 — Stable experiment number: pure function with a unit test (oldest = 001, tie-break by id, same value in every sort and page, three-digit padding), i18n label ES/EN within text limits.
- [ ] X15 — Boxless panel with the numbered label: both image-left and image-right variants, solo (no image) variant, both locales, both themes, phones and desktop; text contrast at least 4.5:1 on the page background in both themes; no overflow at 360 and 390.

## Acceptance criteria
- Only `/experiments/` changes; home, `/me`, `/education/`, `/changelog/` look exactly as before.
- Tokens only, no hard offset shadows, no ALL-CAPS labels, no new JS, no gradients or glows.
- The writer looks at screenshots (desktop and phone, dark and light) and the parent reviews them again.
- Touch-scoped checks per `docs/TESTING.md`; heavy battery once at close.

## Progress and evidence
Route: delegated writer; parent reviews the diff, re-runs checks and looks at screenshots.
