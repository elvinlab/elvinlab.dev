# Notes index: shorter tag cloud in the sidebar (critique P3)

## Objective and authorization
2026-10-13, owner: "creo que había P3" of the impeccable critique of `/notes/`. Local commits on `develop`; push and release stay the owner's call. Out of scope: the featured newest row (P2, not chosen), topic and tag pages, every page other than the `/notes/` index.

## Finding
The sidebar tag cloud lists about 30 chips (`Etiquetas`), taller than the list on desktop, sticky from `lg` and a second scroll length on phones; it duplicates the chips of the rows.

## Design (parent decision, owner may overrule)
- Show the 12 most used tags (count descending, then alphabetical; reuse the existing ordering helper if one exists) and put the rest in a native `<details>` with a visible summary "Ver todas las etiquetas (N)" / EN twin, no JavaScript. Chips keep the pixel notched look of the index (N4) and the same links (topic page or filter).
- The summary is a 44 px target with a visible disclosure marker (pixel chevron like `/education/`), keyboard operable, accessible name with the count; when a tag filter is active and its tag is not among the 12, the `<details>` starts open so the active tag stays visible.
- The Categorías and Temas blocks are untouched.

## Tasks
- [x] N6 — Top-12 tags plus a native disclosure for the rest, with unit tests for the selection helper and e2e for the count, the disclosure and the active-tag case.

## Acceptance criteria
- Only the `/notes/` index sidebar changes (the same sidebar component on topic/tag pages? then scope by prop/wrapper and keep their look); no new JS; tokens only; no hard offset shadows; no ALL-CAPS labels; no new theme-variable leak or global utility (`check:page-weight` fails only on `notes-index` and `changelog` if at all); contrast at least 4.5:1; targets at least 44 px; no overflow at 360 and 390; axe clean in both themes; tag filtering behaves exactly as before.
- The writer takes screenshots (desktop and phone, dark and light, closed and open, with an active tag outside the top 12) and looks at them; the parent reviews them again.

## Progress and evidence
Route: delegated writer; parent reviews the diff, re-runs checks and looks at screenshots.

### Writer report (2026-10-13)
Route: delegated writer; not committed, the parent reviews and commits.

RED: `notes-index.test.ts` 2 new style tests failed before the CSS (summary rule, chevron and motion), green after. `top-tags.test.ts` was written together with `top-tags.ts` (pure function, no separate RED). The e2e fixture has only 2 tags, so its "at most 12 chips" and "no `<details>`" checks pass on the old code too (no RED possible) and the disclosure tests skip there ("the fixture has 12 tags or fewer").

Implementation:
- `lib/top-tags.ts` (`topTags`, `SIDEBAR_TAG_LIMIT = 12`): count once per note, order by count descending then alphabetical, returns `top` and `rest`. `NotesIndex` uses it instead of the recency-ordered unique list; `NotesSidebar` takes `moreTags` and renders `<details class="ni-more" data-notes-more>` right after the chips only when there are hidden tags.
- i18n `notes.sidebar.tags.more`: "Ver más etiquetas ({count})" / "More tags ({count})", N = hidden tags (deviation from the literal "Ver todas las etiquetas (N)": the block lists only the hidden tags, so "all" with the hidden count would mislead).
- CSS in `notes-index.css` only (summary 44 px, primary color, no underline, pixel chevron polygon of `/education/`, rotate(90deg) when open, hover tint with the notch, focus ring unclipped, `steps(2, end)` inside no-preference).
- Active tag: the static page cannot read `?tag=`, so the existing filter script in `NotesFilter.astro` got about 5 lines that set `open` when the active tag is a link inside `[data-notes-more]` (deviation from "renders open": no new script file, no new JS bundle).
- Docs: DESIGN.md bullet, changelog `notes-sidebar-tags`, `verification-map.ts`, budget `notes-index` style 63350 -> 64500 (measured 64199).

Visual review (production build on port 4337, real content: 9 notes, 27 tags, 12 shown plus 15 inside): dark and light, 1280 and 390, reduced motion, closed, open by Enter, and `?tag=flujo-de-trabajo` (hidden tag, opens by itself); summary 44 px, no overflow, chevron visible, focus ring whole. Nothing needed changing after the review. Axe by hand on the production build: no violations in both themes, closed and open.

Checks (observed): biome clean; typecheck 0 errors; depcruise clean; vitest 144 files, 1667 tests passed; build ok; check:js-budget pass; check:page-weight 42 of 42 within budget (after the notes-index raise); test:white-label pass; docs:config up to date; e2e quick on 12 specs: 223 passed, 6 skipped (the disclosure tests, no fixture content with 13 tags).
Gaps: the disclosure behavior has no automated e2e coverage in CI until a fixture note carries 13+ distinct tags (`tests/fixtures/notes/` is outside this writer's surface); no Lighthouse, no full e2e battery, no 360 px visual check of the open state beyond the overflow test.
