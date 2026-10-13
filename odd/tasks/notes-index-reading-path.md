# Notes index: a reading path (critique P1 x2)

## Objective and authorization
2026-10-13, owner chose "camino de lectura", only the index `/notes/`, one area per commit, after the impeccable critique of `/notes/` (22/36, Aceptable). Local commits on `develop`; push and release stay the owner's call. Out of scope: read/continue label restyle (P2), pixel controls and result count (P2), featured newest row with the decision-record excerpt (P2), the sidebar tag cloud (P3), topic and tag pages (`/notes/tag/...`) and every page other than `/notes/` (and its `/en/notes/` twin).

## Findings being addressed (A = design review, B = measurements)
- Each row stacks title, a 2-line description and up to 6 chips, and the chips weigh as much as the text; the date and reading time sit in a small right column, so the title is not the first thing the eye lands on.
- "Empieza aquí" (a curated block that repeats notes that are also in the list) pushes the real list down: the first note title sits 846 px from the top at 1280 and 1154 px at 390 (measured on the dev build with 13 rows; production has 9 notes, so use the e2e/production numbers).
- Verified by the parent: the dev-only drafts (`content/drafts`) are not in production and are not part of this finding.

## Design
- Row chips: the category chip plus at most 2 tag chips per row; the rest stay searchable (`data-search`, `data-tags` unchanged) and reachable from the sidebar and the topic pages; no change to which chip links where.
- Row meta: the date and the reading time on one mono muted line directly under the title (separate spans with spacing, never joined by a middle dot or an em dash), the language badge and the read/continue label keep working (labels still come from `ReadingProgressMemory`); the right-hand meta column disappears (two-column grid: number and content), the margin rule and the ruled line between rows (`notes-index.css`) stay.
- "Empieza aquí": a compact strip: one line of heading and the curated notes as title-only links with their numbers (no excerpts), wrapping on phones; it keeps its `assertStartHere` guard, its landmark/heading semantics and its keyboard order.
- Target: the first note row title moves up by at least 200 px at both 1280 and 390 compared with today (measure before and after on the same build) and the full row stays whole-row clickable; no row exceeds 3 chips.

## Tasks
- [ ] N1 — Row: at most 3 chips, mono meta line under the title, single content column; whole-row link, search filtering, tag filtering, reading-progress labels and focus order unchanged.
- [ ] N2 — "Empieza aquí" as a compact strip; the list starts at least 200 px higher at 1280 and 390.

## Acceptance criteria
- Only `/notes/` and `/en/notes/` change (rows are shared with topic/tag pages? then scope the change to the index, e.g. a prop or a wrapper class); home, `/me`, `/education/`, `/experiments/`, `/changelog/`, note pages look exactly as before.
- Tokens only, no hard offset shadows, no ALL-CAPS labels, no new JS, no new theme-variable leak (`check:page-weight` fails only on `notes-index` and `changelog` if at all), contrast at least 4.5:1, targets at least 44 px, no overflow at 360 and 390, axe clean in both themes.
- The writer takes screenshots (desktop and phone, dark and light) and looks at them; the parent reviews them again.
- Touch-scoped checks per `docs/TESTING.md`; heavy battery once at close.

## Progress and evidence
Route: delegated writer; parent reviews the diff, re-runs checks and looks at screenshots.
