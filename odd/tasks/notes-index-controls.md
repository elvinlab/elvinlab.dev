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
- [x] N3 — Read and in-progress marks (glyph plus text, primary color), no layout shift.
- [x] N4 — Pixel stepped chips and search on the index.
- [x] N5 — Result count with live region and a useful empty state with a clear button.

## Acceptance criteria
- Only `/notes/` changes (topic/tag pages, home, `/me`, `/education/`, `/experiments/`, `/changelog/`, note pages look exactly as before; check which components are shared and scope the new look to the index).
- Tokens only, no hard offset shadows, no ALL-CAPS labels, no gradients, motion only with no-preference, contrast at least 4.5:1 for text and 3:1 for component edges, no overflow at 360 and 390, axe clean in both themes, search and tag filtering behave exactly as before.
- The writer takes screenshots (desktop and phone, dark and light, with stored read/in-progress states, a query with results and an empty one) and looks at them; the parent reviews them again.
- Touch-scoped checks per `docs/TESTING.md`; heavy battery once at close.

## Progress and evidence
Route: delegated writer; parent reviews the diff, re-runs checks and looks at screenshots.

### Writer report (2026-10-13)
Route: delegated writer; not committed, the parent reviews and commits.

RED: `notes-index.test.ts` (style rules) 5 of 6 failed before the CSS; `tests/browser/notes-index-controls.spec.ts` 13 failed and 7 passed on the old code (marks, notch, focus, steps, count, empty state, clear button; the passing ones were the 1280 no-shift check, the no-overflow and the "stays on the index" checks). `results-count.test.ts` was written together with its helper, so it was green at once (pure function, no separate RED). GREEN afterwards: 35 passed (controls plus path) after one fix, see below.

Implementation:
- N3: CSS only, in a new `notes-index-marks.css`, inlined by `NotesIndex` only while `features.readingProgress` is on (the white-label check rejects any `data-progress-label` text with the flag off; first attempt kept it in `notes-index.css` and failed that check). `.ni-num::after` is the glyph (14 x 10 check polygon of 2 px cells for `read`, a 10 px square with `path(evenodd)` half-fill for `continue`), shown through `:has([data-progress-label][data-state=...])`. The label leaves the meta line (absolute, under the number, `pointer-events: none`, primary color), so nothing wraps or moves. Labels script untouched.
- N4: `.ni-page` wrapper (content and sidebar) defines `--ni-notch` once; `.ni-chip` (rows, Topics strip, sidebar) paints a notched `::before` so its `::after` hit area and focus ring survive (mobile-ux probes `a.rounded-pill.bg-chip`, kept); `.ni-input`, `.ni-btn`, `.ni-link` are clipped and drop the notch on `:focus-visible`; hover tint and 1 px nudge with `steps(2, end)` only inside `prefers-reduced-motion: no-preference`. The shared `Chip` was not touched (a `ni-chip` class is passed in).
- N5: `lib/results-count.ts` (`resultsLabel`), i18n keys `notes.results.one|other`, `notes.empty.query`, `notes.empty.hint` (ES+EN); `NotesFilter` gets `total`, a `data-notes-count` live region (`aria-live=polite`, `aria-atomic`) updated in the existing `apply()`; `NotesIndex` empty state is a `data-notes-empty` block (title, typed query, hint, `data-notes-clear` button) whose click clears the search and any `?tag=` (`history.replaceState`), re-applies and focuses the search. Matching and URL state are otherwise unchanged.
- Docs and weight: DESIGN.md bullet, changelog `notes-index-controls`, `verification-map.ts`, `page-weight-budget.json` (notes-index style 60475 -> 63350, measured 63050; changelog html 122150 -> 122950, measured 122517). NOTES.md and NOTES.en.md do not describe these controls, so they are unchanged.

Existing spec changed: `notes-index-path.spec.ts` "the continue label stays on the meta line" became "sits in the number column" (the label is deliberately lifted out of the meta line to avoid layout shift).
Fix after a failing check: the count first wrapped under the search on phones and pushed the first title to 736 px (ceiling 720); the filter row now wraps with the count beside the search (label `flex-basis: 12rem`), back to the old height.

Visual review (production build on preview port 4331, dark and light, 1280 and 390, reduced and no-preference motion, stored read and in-progress, query `ci`, empty `zzzzqq`, hover on a chip and on the empty button, 3x crop of a row): check and half marker sit beside the number, label in the primary color under it ("Seguir / leyendo" wraps in two lines in the 64 px column), notched chips visible at 3x, hover tint plus nudge on a chip, empty state with query, hint and notched button, no overflow. Nothing else needed changing; the native (x) inside the search input is unchanged.

Checks (observed): biome check . clean; typecheck 0 errors; depcruise no violations; vitest 143 files, 1659 tests passed; `pnpm --filter web build` ok; check:js-budget all pass; check:page-weight 42 of 42 within budget; test:white-label pass; docs:config up to date; e2e quick on the 15 requested specs: 248 passed, 1 skipped.
Gaps: no 360/768 projects beyond the dedicated 360 and 390 overflow tests, no Lighthouse, no full e2e battery; no custom clear button inside the search (native cancel stays); `/en/notes/` has no index in the fixture so EN strings are only covered by i18n parity.
