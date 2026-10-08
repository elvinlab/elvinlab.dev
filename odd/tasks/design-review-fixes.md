# Feature: design review fixes (2026-10-08)

## Objective

Apply the highest-value, lowest-risk fixes from the 2026-10-08 page-by-page design review (design-taste-frontend skill, read against `docs/BRAND.md` and `docs/DESIGN.md`). The brand is settled; this is coherence, hierarchy and gaps only.

## Problem / why

Evidence from screenshots at 1280 and 390 px of home, notes, a note, experiments, contact, subscribe, changelog, privacy and `/me`:
- Experiments only shows frontend and tooling, so the full-stack story of `/me` has no proof (the subscription backend with D1, migrations and Workers API is real and unmentioned).
- Contact: the form fills the left half, the right half is empty, and the footer subscription band adds a second email form under the contact form.
- Notes index: the category shows twice (chip plus `#tag`) and 11 tags are listed for 3 notes.
- Footer: "Suscribirse" and "GitHub" almost touch (the social list keeps `-mx-3` on desktop).
- Home on phones: the author avatar fills the whole card width.

## Scope

D1 `apps/web/src/content/experiments.json` (entry `elvinlab-dev`: `contribution`, tags).
D2 contact: `apps/web/src/features/contact/components/ContactPage.astro`, `content.ts` (+ `content.test.ts`), `apps/web/src/shared/layout/subscribe-cta.ts` (+ test), `tests/browser/subscribe.spec.ts`.
D3 notes: `NoteRow.astro`, `NotesSidebar.astro`, `NotesIndex.astro`, a pure helper in `apps/web/src/features/notes/lib/` with its test, `tests/browser/notes-layout.spec.ts` if it pins the tags.
D4 `apps/web/src/shared/layout/Footer.astro`.
D5 `apps/web/src/features/portfolio/components/AuthorCard.astro`.
D6 changelog entry in `apps/web/src/content/changelog.json`.

## Not in scope (decisions that stay with the owner)

Home pills and pillars (BRAND.md must change first), one rule for page H1 fonts, home column gap, changelog day headline (set at release in `releases.json`), `/en/*`, privacy, terms, 404 and dark theme (not reviewed visually).

## Constraints

- No raw email in tracked files, no private repos, no invented experience: texts only claim what the code does (D1 database with migrations, Workers API, double opt-in subscription).
- Personal strings go through config or content, not hardcoded in shared components (white-label test).
- Boundaries (dependency-cruiser): `shared/` never imports `features/`; features are imported through their `index.ts`.
- Keep 44 px hit areas in the footer (`tests/browser/mobile-ux.spec.ts`).
- Light local verification (owner preference): touched scope only.
- Stays on `develop`; no push and no release without explicit authorization.

## Tasks

- [x] **D1** Experiments: `elvinlab-dev` contribution mentions D1 with migrations, Workers API, double opt-in subscription; tags add `d1` (displayed as "D1").
- [x] **D2** Contact: side panel "What to expect" on the right (stacks below the form on phones) and no footer subscription band on `/contact/` and `/en/contact/`.
- [x] **D3** (REOPENED 2026-10-08, see D7: the owner wanted tags clickable, hiding the tag list went against that) Notes: no category repeated as a tag chip; the tag list in the sidebar appears only from 6 notes.
- [x] **D4** Footer: even gap between internal and social links on desktop.
- [x] **D5** Home author card: small avatar below `lg`, unchanged from `lg`.
- [x] **D7** Clickable tags and categories as filters: chips link to `/notes/?tag=<tag>`, the notes index filters by that tag (combined with the search box) with a visible "Tag: #x, clear filter" notice; the sidebar tag list is visible again (revert of the six-notes rule); note page chips and breadcrumb category link too.
- [x] **D6** Changelog entry, tracker evidence, commits.

## Route record

Mapping: one read-only explorer (evidence above the inline budget). Writing: one bounded writer (D1 to D5 touch more than two non-trivial files), parent reviews the full diff and reruns the checks. Delegation through herdr and opencode was skipped on purpose: a native subagent with an exact spec is cheaper here and the spec contains design decisions.

## Authorized scope

D1 to D6 on `develop`, local work-unit commits only. Authorization: owner message "implementa lo mejor que veas para mi web" (2026-10-08), after the review that listed these items.

## Acceptance criteria

- Experiments page text and tags render in ES and EN without exceeding schema limits.
- `/contact/` and `/en/contact/` show no footer subscription band and show the side panel; `/notes/` shows no repeated category tag and no tag list with 3 notes.
- `tests/browser/subscribe.spec.ts` expectations updated to the new behavior; unit tests written first (RED) for the band rule and the notes helper.
- typecheck, biome, depcruise, unit tests of the touched scope, build, page-weight and the listed e2e specs pass.

## Progress and evidence

2026-10-08, local on `develop`, not pushed.
Writer (one bounded subagent) did D1 to D5; the parent reviewed the whole diff, then fixed three things: the `d1` tag was 4th and the experiment card shows only 3 tags (reordered to astro, cloudflare, d1, typescript), indentation of `ContactPage.astro`, and a long comment. The writer's RED was observed for `showSubscribeCta('/contact/')`, `content.aside` and `note-tags` before implementing.
Checks run by the parent (spot check, touched scope only): biome on `apps/web/src` and `tests` (399 files, clean), typecheck 0 errors, vitest on shared/layout, contact, notes and portfolio (26 files, 305 tests pass), e2e at 1280 px on contact, subscribe, notes-layout, experiments and mobile-ux (139 passed). The writer also reported depcruise clean, build, js-budget and page-weight PASS, and 186 e2e passed in its wider set; its one failure, a `/contact/` axe contrast check on `.hover:bg-button/90`, passed 4 of 4 alone (the same intermittent check seen twice before under parallel load; page logic unchanged, cause not investigated).
Visual check by screenshot (1280 px and 390 px): contact has the "What to expect" card and no footer band; notes rows show `agentes-ia` only once and the tag card is gone with 3 notes; the home author avatar is 96 px on phones; footer links evenly spaced.
Not re-run: Lighthouse (no new heavy assets; `/en/me/` margin from the previous feature still thin), 3-viewport e2e, `/en/*` pages visually, dark theme.
Docs: `docs/BRAND.md` says the subscription band also hides on `/contact/`.
Left out on purpose (owner decisions): home pills and pillars (BRAND.md first), one rule for page H1 fonts, home column gap, changelog day headline for 2026-10-08 (set in `releases.json` at release).

## D7 evidence (2026-10-08)

One bounded writer (RED observed: 9 failed, 2 passed before the helpers existed), parent review of the full diff, one parent addition (the per-year note count follows the visible rows, with its own e2e). Parent checks: vitest on notes and shared (40 files, 400 tests pass), typecheck 0 errors, biome clean, e2e at 1280 px on notes-tag-filter, notes-layout and subscribe (84 passed); the writer also ran build, js-budget, page-weight, depcruise and a wider e2e set (140 passed) with the intermittent `/en/contact/` axe contrast check failing once and not recurring. With the real notes (preview): clicking `#herdr` leaves 1 of 3 notes, `?tag=agentes-ia` leaves 2, "Quitar filtro" returns to 3. The URL value is written with `textContent` (tested with markup in the tag). Tag links are not localized because the index exists only at `/notes/`. Not done: highlighting the active tag in the sidebar, localized `/en/notes/` index, static per-tag pages (not needed for filtering, and `?tag=` pages are not meant to be indexed separately).

## Correction log

- 2026-10-08, owner: "las etiquetas y los tags yo queria hacerlas clickeables tipo busquedas". My review item 6 (noise) was my opinion, not a request; D3 hid the tag list and was wrong for the owner's intent. D7 reverts the hiding and adds the filter. The category de-duplication on a row stays (the category chip already filters the same notes).

## Next step

Owner review; release only on explicit authorization together with the `/me` full-stack work (`odd/tasks/me-fullstack-narrative.md`); run `pnpm changelog:audit` and a real Lighthouse on `/en/me/` first.
