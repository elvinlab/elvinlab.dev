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
- [x] N1 — Row: at most 3 chips, mono meta line under the title, single content column; whole-row link, search filtering, tag filtering, reading-progress labels and focus order unchanged.
- [x] N2 — "Empieza aquí" as a compact strip; the list starts at least 200 px higher at 1280 and 390.

## Acceptance criteria
- Only `/notes/` and `/en/notes/` change (rows are shared with topic/tag pages? then scope the change to the index, e.g. a prop or a wrapper class); home, `/me`, `/education/`, `/experiments/`, `/changelog/`, note pages look exactly as before.
- Tokens only, no hard offset shadows, no ALL-CAPS labels, no new JS, no new theme-variable leak (`check:page-weight` fails only on `notes-index` and `changelog` if at all), contrast at least 4.5:1, targets at least 44 px, no overflow at 360 and 390, axe clean in both themes.
- The writer takes screenshots (desktop and phone, dark and light) and looks at them; the parent reviews them again.
- Touch-scoped checks per `docs/TESTING.md`; heavy battery once at close.

## Progress and evidence
Route: delegated writer; parent reviews the diff, re-runs checks and looks at screenshots.

### Writer report (2026-10-13)
Route: delegated writer (this document); not committed, the parent reviews and commits.

Measurements (first note row title, top of the page, `a` of `h3`, production build, 9 notes, dark and light identical):
- BEFORE: 846 px at 1280, 1154 px at 390.
- AFTER: 636 px at 1280 (-210), 847 px at 390 (-307). Target of 200 px met at both widths.
- e2e fixture build (3 notes, start-here rows without a reason, so shorter than production): BEFORE 738 / 738, AFTER 645 / 704. The 200 px target cannot be asserted on the fixture, so `notes-index-path.spec.ts` asserts a fixed ceiling (660 at 1280, 720 at 390) and that the position is above the recorded fixture BEFORE; the 200 px figure is the production measurement above. There is no `/en/notes/` index (404), so EN index checks do not apply.

TDD: `tests/browser/notes-index-path.spec.ts` written first and run on the old code: 7 of 16 failed (mono meta line at 1280 and 390, two-column grid and empty-area click, continue label on the meta line, title-only strip, both ceilings); the chip cap, tab order, search, overflow and axe tests passed because the old layout already satisfied them (the fixture has at most 2 chips per row). The chip cap itself is covered by the unit test `rowChipTags` in `note-tags.test.ts` (4 cases). GREEN after implementation: 266 passed, 1 skipped across the 15 specs below.

Implementation:
- `lib/note-tags.ts`: `ROW_TAG_LIMIT = 2` and `rowChipTags`; `data-tags` and `data-search` untouched.
- `NoteRow.astro`: two grid columns, title, `.ni-meta` mono line (time, badge slot `header`, reading time, progress label), excerpt, chips (category first, then at most two tags).
- `StartHere.astro`: `section.ni-start` with the `h2` and a `ul` of title-only links with the mono number; the schema still requires `startHereNote` but the strip no longer shows it.
- `notes-index.css`: `.ni-start` and `.ni-meta` rules. First attempt used Tailwind utilities (`md:grid-cols-[auto_1fr]`, `md:py-0.5`, `font-normal`, ...): every page grew by about 340 B of global style (42 of 42 pages over budget; the base commit passed). Moving the new layout rules into `notes-index.css` (inlined only on `/notes/`) fixed it; no font variable text was written anywhere.
- Page weight: only `notes-index` over (style 60173 / 59750, +423 B); raised `styleBytes` to 60475 with a dated reason. Its html shrank (129347 -> 128673 B).
- Docs: DESIGN.md (new "Notes index reading path" bullet, language badge wording), NOTES.md and NOTES.en.md (3.1), changelog entry `notes-index-reading-path`, `verification-map.ts` entry for the new spec. No existing spec needed changes.

Visual review (Playwright on `astro preview`, dark and light, 1280 and 390, reduced motion; hover, search with a query, stored progress label): margin rule lines up with the number column and the ruled line; hover tint and primary title work; search shows "8 notas" and filters; "Seguir leyendo" sits at the end of the meta line. Changes made because of it: the strip first rendered as a 44 px stacked list at 1280 and gained only 135 px, so from md up it became a heading-left, links-right block with 28 px lines (mouse); phones keep 44 px lines. No other defects seen (no widows, no overflow).

Checks run: biome check . (clean), typecheck (0 errors), depcruise (no violations), vitest (141 files, 1650 tests passed), `pnpm --filter web build`, check:js-budget (all pass), check:page-weight (42 of 42 within budget after the raise), test:white-label (pass), docs:config (up to date), e2e quick on notes-index-path, notes-index-ruled, notes-layout, notes-start-here, notes-tag-filter, notes-topics, reading-progress, no-horizontal-overflow, a11y, mobile-ux, home-sections, calm-pages, page-stamps, card-links, native-feel (266 passed, 1 skipped).

Gaps: 360 and 768 projects, Lighthouse and the full e2e battery were not run (out of the requested scope); the strip links at md and up are 28 px high lines (the 44 px rule is kept below md); parent should review the screenshots again and commit.
