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

## Next step

Ask the owner for a new direction for the home hero and the dark-theme background (nebula and grid), then T2 and T3.
