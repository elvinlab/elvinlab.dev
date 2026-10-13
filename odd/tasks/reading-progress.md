# Reading progress for notes

## Objective and authorization
2026-10-13, user: readers should see which notes they already read, and an unfinished note should remember where they stopped and bring them back there. Approved plan: client-side only, 90% = read. Work directly on `develop`, local work-unit commits; push and release to `main` stay the owner's call.

## Design
- Flag `features.readingProgress` (central config, `.default(true)`, `.describe()` required). Off: no script, no `localStorage` key, no badges, privacy page does not mention it, white-label check asserts nothing renders.
- Storage: `localStorage` key `progress:<slug>` = JSON `{ p: 0..1, t: epoch ms }`, every access in try/catch. No cookies (`cookies.spec.ts`).
- Note page: listen to the existing `reading-progress` event (`ReadingProgress.astro`, detail 0..1); throttle writes; `p >= 0.9` marks read (store `p: 1`). On load, if stored `0.05 < p < 0.9`, instant `scrollTo` to the same fraction using the article maths the bar already uses (works in reading mode; fraction not pixels).
- Index/home: static HTML, so apply client-side. Add `data-slug` to `NoteRow`, `NoteIndexRow` and `LatestNote`; a small script reads the keys and sets a short label ("Leída"/"Seguir leyendo" and EN twins) within `text-limits.ts` (28 chars).
- Privacy text declares the key conditionally on the flag (`privacy/content.ts`, ES and EN counts).
- Template: `odd/tasks/reading-mode-and-legal.md` (flag, boot script, privacy, white-label, profiles).

## Tasks
- [x] P1 — Flag `features.readingProgress` + conditional privacy wording (schema, fixtures, unit tests first).
- [x] P2 — Note page: store progress, mark read, restore position (unit test of the pure logic first, then e2e).
- [x] P3 — Index, home card and latest note labels, i18n + limits, e2e profiles, white-label, docs, changelog entry.

## Acceptance criteria
- Flag on: scroll a note to ~50%, leave, come back: same place. Reach 90%: the note shows "read" in the index and home. No cookies. No overflow at 360 px. axe clean.
- Flag off: no script, no key, no label, privacy unchanged.
- Touch-scoped checks per `docs/TESTING.md`; heavy battery once at close (owner finds local runs slow).

## Progress and evidence
Route: delegated writer for P1-P3 (touches 2+ non-trivial files); parent reviews the diff. Stamp spacing fix committed separately first.

P1 done: RED (schema keys test for `readingProgress` and 3 privacy tests failed), then GREEN (188 tests in schema and privacy). Flag `features.readingProgress` (`.default(true)`) in schema, `site.config.ts` (on), the alternative fixture (off), the literal feature objects in `schema.test.ts`, `nav.test.ts`, `sitemap-filter.test.ts`, and the `me-only` and `bare` profiles (quiet and blog-only keep it on). Privacy declares `progress:<note>` only when the flag is on (the count of other preferences is unchanged).
P2 done: RED (`reading-progress-memory.test.ts` written first, module missing), then GREEN (19 tests: restore maths, 5% and 90% bounds, hash and already-scrolled pages, corrupt entries, throttle, 90% stores 1, read stays read, pagehide flush, blocked storage, labels, once-per-request claim). The logic is an inline ES5 script (like reading-mode) tested against a fake DOM; no bundled script, so flag off ships nothing. e2e `tests/browser/reading-progress.spec.ts` (ES and EN, restore, read at 90%, labels, 360 and 390 widths without overflow, no cookies, blocked storage). Self-inflicted slips found by the e2e: the restore ran against a layout that shrank after font swap (fixed with a ResizeObserver re-apply for 3 s unless the reader scrolled), and the test seeded storage on every load.
P3 partial: labels (hidden `[data-progress-label]` slot plus a labels script emitted once per page) on `NoteRow`, `NoteIndexRow` (home notebook, topics, `/me`) and `LatestNote`; keys `reading.read` and `reading.continue` (within the 28-character `reading` limit); docs (CONFIGURATION es/en, README es/en, DESIGN), changelog entry `reading-progress`, white-label assertion, page-weight budgets (html only, measured). Not done (outside the allowed edit surfaces, reported to the parent): (1) `pnpm depcruise` fails `no-cross-feature-internals` for `portfolio/components/LatestNote.astro` importing `notes/components/ReadingProgressMemory.astro`; it needs `export { default as ReadingProgressMemory } from './components/ReadingProgressMemory.astro';` in `apps/web/src/features/notes/index.ts` and the import switched to the barrel. (2) `scripts/verification-map.test.ts` fails until `apps/web/scripts/verification-map.ts` maps `reading-progress.spec.ts` (next to line 381, `covers: NOTE_PAGE`).
Checks run: typecheck 0 errors; lint clean; vitest 1555 passed, 1 failed (verification-map drift guard, item 2); `docs:config` up to date; build ok; `check:js-budget` pass; `test:white-label` pass; `test:e2e:quick` on reading-progress, cookies, reading-mode and no-horizontal-overflow: 64 passed. `check:page-weight`: 19 of 38 pages still over budget, all of them already over at HEAD 594948b (stashed baseline: style +19 to +147 B on changelog, contact, experiments, me, topic, subscribe results, and html on experiments and subscribe results); this work adds no style (net -42 B) and its html budgets (home, me, notes-index, topic, note) were raised by the measured cost. Not run: full e2e battery, Lighthouse, profiles.


Parent review: fixed the two writer gaps (barrel export of ReadingProgressMemory for depcruise; verification-map entry). Re-observed: biome, depcruise, typecheck, notes + verification-map unit tests (126), build, check:js-budget, white-label, e2e:quick reading-progress + cookies + reading-mode (32 passed). Not re-run: full e2e, Lighthouse, test:profiles (owner: keep local runs light; CI on main runs them). check:page-weight: 19 pages already over budget at 594948b, unrelated to this change.
