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
- [ ] N6 — Top-12 tags plus a native disclosure for the rest, with unit tests for the selection helper and e2e for the count, the disclosure and the active-tag case.

## Acceptance criteria
- Only the `/notes/` index sidebar changes (the same sidebar component on topic/tag pages? then scope by prop/wrapper and keep their look); no new JS; tokens only; no hard offset shadows; no ALL-CAPS labels; no new theme-variable leak or global utility (`check:page-weight` fails only on `notes-index` and `changelog` if at all); contrast at least 4.5:1; targets at least 44 px; no overflow at 360 and 390; axe clean in both themes; tag filtering behaves exactly as before.
- The writer takes screenshots (desktop and phone, dark and light, closed and open, with an active tag outside the top 12) and looks at them; the parent reviews them again.

## Progress and evidence
Route: delegated writer; parent reviews the diff, re-runs checks and looks at screenshots.
