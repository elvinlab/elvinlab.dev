# Notes index: read marks and pixel controls (critique P2)

## Objective and authorization
2026-10-13, owner: "vamos por P2" of the impeccable critique of `/notes/` (after the reading path pass, commit 79de224). Local commits on `develop`; push and release stay the owner's call. Out of scope: the featured newest row with the decision-record excerpt, the sidebar tag cloud cap (P3), topic and tag pages (`/notes/tag/...`) and every page other than `/notes/`.

## Findings being addressed
- "Leída" and "Seguir leyendo" are 13 px muted text at the end of the meta line, so a reader misses them; "Leída" is a status and "Seguir leyendo" an action, with the same look.
- The index controls (row chips, the topics strip, search field, sidebar chips) are rounded stock pills next to the pixel stepped controls of `/education/` and `/experiments/`.
- No result count and a plain empty state: the search shows a sentence only, with no suggestion or way out.

## Design
- Read marks: a read note shows a pixel check glyph (CSS or inline SVG, `aria-hidden`, crisp edges) next to its number and its label in the primary color with a check; a note in progress shows a half-filled pixel marker and the "Seguir leyendo" label in the primary color; never color alone (glyph plus text). The labels script stays, no new JS beyond what the label script already does, no layout shift when it fills in.
- Pixel controls on `/notes/` only: stepped notched corners (the `clip-path` notch recipe of `/education/` and `/experiments/`, defined once as a custom property on the index wrapper) on chips (rows, topics strip, sidebar), the search field and its clear button; hover/focus-visible with `steps(2, end)` motion inside `prefers-reduced-motion: no-preference`; focus ring not clipped (drop the notch on `:focus-visible` or put the notch on a wrapper); targets as the existing mobile-ux rules require.
- Result count and empty state: a visible count ("13 notas", "3 notas", "1 nota") next to the search that updates as the filter changes and is announced politely (`aria-live="polite"` region), and an empty state with the typed query, a short suggestion and a button that clears the filter and returns focus to the search field.

## Tasks
- [ ] N3 — Read and in-progress marks (glyph plus text, primary color), no layout shift.
- [ ] N4 — Pixel stepped chips and search on the index.
- [ ] N5 — Result count with live region and a useful empty state with a clear button.

## Acceptance criteria
- Only `/notes/` changes (topic/tag pages, home, `/me`, `/education/`, `/experiments/`, `/changelog/`, note pages look exactly as before; check which components are shared and scope the new look to the index).
- Tokens only, no hard offset shadows, no ALL-CAPS labels, no gradients, motion only with no-preference, contrast at least 4.5:1 for text and 3:1 for component edges, no overflow at 360 and 390, axe clean in both themes, search and tag filtering behave exactly as before.
- The writer takes screenshots (desktop and phone, dark and light, with stored read/in-progress states, a query with results and an empty one) and looks at them; the parent reviews them again.
- Touch-scoped checks per `docs/TESTING.md`; heavy battery once at close.

## Progress and evidence
Route: delegated writer; parent reviews the diff, re-runs checks and looks at screenshots.
