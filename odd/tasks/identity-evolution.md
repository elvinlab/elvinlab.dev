# Identity evolution: less "AI-looking", more authored

Status: in progress (started 2026-10-10). Branch: `develop` (project rule: work directly on `develop`).

## Objective

Visitors say the site (colors, type, motion, copy, layout) reads as AI-designed. Evolve the identity so it feels authored, while keeping the pixel signature the owner likes.

## Problem and evidence

Reviewed in a real browser (production, light and dark, desktop; home also mobile) plus source, detector and history (2026-10-10):

- Dark theme: near-black violet, star field, faint grid and cyan/violet nebula is the stock "AI product" look (`Banner.astro:104` grid, `BackgroundCanvas.astro`).
- The banner's right half is empty on every page; the WebGL effect says nothing about the content.
- Home stacks seven equal-weight rounded cards plus pills and four slogan pillars (`Home.astro`), so hierarchy is flat.
- Hero headline is a category label ("Full-stack engineer building with AI agents"). Copy tells: three-part taglines, slogan pillars.
- Space Grotesk is both display and body (`fonts.css:62`, detector `overused-font`).
- Not tells, keep: decision record (Context/Decision/Outcome), the drawn avatar, real captures in `/experiments`, note content.
- Origin: the v3 look came from an owner-approved Claude Design canvas (2026-09-28). No earlier owner complaint on originality is recorded.

## Decisions (owner, 2026-10-10)

- Scope: evolution, not a new visual world. Keep Pixelify, the pink cursor block and the decision record as signature.
- BRAND.md and DESIGN.md are editable (the previously "settled" palette and WebGL banner included). Edit them first, then the surfaces.
- Method: generate variants live in the browser (Impeccable `generate`), owner picks by seeing them.

## Constraints

White-label (semantic tokens only, no hex in components), `packages/core` stays presentation-only, WCAG AA both themes, reduced motion, 44 px targets, JS budget 30 KiB gzip, page-weight and LCP gates, Spanish default with `/en/`. Many unit and e2e tests pin styles (`type-scale`, `calm-layout`, `calm-pages`, `pixel-display`, `mobile-ux`, `background`). Touch-scoped verification per `CLAUDE.md`. Release to `main` only with explicit owner authorization.

## Tasks

Route per task: parent (Tier 3, design judgment); tests or docs may go to a worker. Planning heuristic about 400 changed lines per task.

- [x] T0 Note page: decision record moves into the banner to the right of the title from `md` up (owner picked this composition from live variant 2, for notes, not for home). Route: delegated writer (2+ non-trivial files), parent reviewed diff and rendered result at 1440 and 390 px. Evidence: typecheck, lint, vitest (notes, styles: 89 passed), e2e quick (calm-pages, reading-mode, notes-layout, no-horizontal-overflow: 62 passed, 1 skipped), `check:page-weight` all PASS (note html headroom as low as about 840 B on `vibe-coding-o-especificar-primero`). Not re-run: e2e at 390 and 768 projects, a11y, Lighthouse.
- [ ] T1 Hero banner (home): the three live variants (evidence headline, asymmetric record, log index) were shown on 2026-10-10 and NONE was accepted for the home; home is unchanged. Needs a new direction and a new round.
- [ ] T2 Home hierarchy: one dominant block, fewer equal cards, cut repeated slogan sections (pills, pillars). Live variants.
- [ ] T3 Dark theme surface and accent hierarchy; body/display type pairing (Space Grotesk is the detector hit).
- [ ] T4 Update `docs/BRAND.md`, `docs/DESIGN.md` (and English twins where they exist), changelog entry in `apps/web/src/content/changelog.json`, fix pinned tests.
- [ ] T5 Touch-scoped verification (`pnpm verify`), record in `odd/verification-ledger.md`, report skips as "not re-run".

## Authorized scope

Visual identity surfaces of `apps/web` and `packages/core` tokens, the two design docs, changelog and the tests that pin changed styles. Not authorized: push, release to `main`, deleting remote branches, new dependencies.

## Acceptance

- Owner accepts the chosen variants for T1 to T3 in the browser.
- No new JS over budget; typecheck, lint, touched unit tests and the e2e specs for touched pages pass.
- Docs match the shipped look; changelog entry present.

## Progress and evidence

- 2026-10-10: diagnosis done (browser captures, detector: 5 findings of which 1 false positive, history mapped). Plan created.

- 2026-10-10: live mode needed a manual fallback (the helper's scaffold matched the wrong file by generic classes) and a token refresh after a helper restart (`live-inject --port 8400`). `.impeccable/` is excluded locally in `.git/info/exclude`; the helper also created an untracked `apps/web/.gitignore` that is NOT part of the work.

- 2026-10-10 `5e6e250` feat(notes): decision record beside the note title (T0).
- 2026-10-10 `c0b2433` feat(home): new hero headline "Construyo con agentes de IA y escribo lo que sale mal." (owner picked option A of four) with its own i18n keys; desktop measure 24ch (two lines), phone hero 29rem; BRAND.md records it. Evidence: typecheck, lint, vitest (styles, i18n, content), e2e quick plus 360 px for calm-pages, mobile-ux, pixel-display, home-sections, type-scale, smoke.
- 2026-10-10 home hero avatar (owner picked "your avatar in the hero" to use the empty right half): figure at the right from `md`, centered over the sidebar column from `lg`, inside `[data-hero-content]`; sidebar card hides its photo from `md` while the banner is expanded and shows it again when collapsed; both ease in with `fade-in-up`. Route: delegated writer, parent fixed the smoke locator and restored the large card photo, reviewed renders at 1440 (expanded and collapsed) and 390. Evidence: typecheck, lint, e2e quick (145 passed) and 360 px (27 passed), `check:page-weight` all 26 pass (style margin on `/` is about 358 B), LCP element stays the h1 (dev-server measurement). Not re-run: a11y, Lighthouse, e2e at 390 and 768 projects.

- 2026-10-10 hero cleanup (T1 closed): removed the home kicker, turned the slogan pills off with `home.heroPills: false`, expanded banner `clamp(440px, 56vh, 520px)` (504 px at the test viewport, was 594), tests and docs updated. Evidence: typecheck, vitest (styles, config: 185 passed), e2e quick on calm-pages, home-sections, pixel-display, mobile-ux, smoke, performance, and 360 px on calm-pages, mobile-ux, smoke, home-sections. One intermittent failure of `calm-pages` "the note header keeps date and reading time" in a six-spec batch; it passed alone and in two reruns of the whole file. Not re-run: `check:page-weight` (the change only removes markup), a11y, Lighthouse.

- 2026-10-10 banner background (T3 background part): owner picked "lab paper" (option 1 of 3). Static CSS paper in `Banner.astro` (16 px minor and 80 px major grid, left ruler, three registration crosses, ink from `--color-text` at low alpha), stars and glows removed, owner default `background: { galaxy: false, cursorWaves: false }`; galaxy and waves stay in the picker. Route: delegated writer, parent reviewed renders (home dark, light, 390 dark). Evidence: typecheck, lint, vitest (web 368, core 37), e2e quick on six specs (106 passed, 1 skipped), 360 px on background, calm-pages, a11y (55 passed), `check:page-weight` 0 FAIL (style margin on `/` is 238 B), `docs:config` unchanged. The writer saw one reading-mode test fail once because it assumed the galaxy default; fixed. Not verified: contrast (lines about 5 and 10 percent alpha, behind all text), Lighthouse, e2e at 390 and 768, the other six screenshots.

- 2026-10-10 home hierarchy (T2): owner picked "menos cajas". Latest note, notebook index and Now lost their card chrome (dashed hairline plus `gap-10`/`pt-10`, not the planned 12, because `gap-12`/`pt-12` pushed 12 pages over the style budget), latest note title is `text-note-title` and turns primary on hover, pillars off with `home.pillars: false`. Route: delegated writer; parent reviewed `fewer-1440-dark`, `fewer-1440-light`, `fewer-390-dark`. Evidence: typecheck, lint, vitest (256 passed), e2e quick (156 passed, 1 failed, 1 skipped) plus 360 px (40 passed), `check:page-weight` passes (`/` 58307 of 58500 B style). The one failure was an axe `color-contrast` on `/contact/` dark (`hover:bg-button/90`) outside this task, intermittent (passed in two reruns). The hero avatar looked faint in the writer's full-page screenshots only because the capture restarted the fade; at a normal viewport its opacity is 1. Not verified: Lighthouse, e2e at 390 and 768, `fewer-390-light`. Review gate: RDD is disabled for this clone (`rdd_disabled`), so delivery is `disabled/unmanaged`.

## Open items

- The page-weight style budget on `/` has about 190 B of margin left; any new utility on the home needs `check:page-weight`.

- The navbar background button now shows its "off" icon (a circle with a slash) by default, which can read as "disabled". Decide whether to change that icon or the cycle order.

- The kicker "elvinlab / lab notes" also appears in the `/notes/` banner (not touched).
- T2 home hierarchy, T3 dark-theme background and body type pairing are not started. Owner has not decided on them.

## Next step

Ask the owner what to tackle next (nebula and grid background, slogan pills and kicker, or the card hierarchy of the home), then release only with explicit authorization.
