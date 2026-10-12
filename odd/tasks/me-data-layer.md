# Feature: `/me` raw-data layer ("from data to screen")

## Objective

Give `/me` one memorable gesture that expresses the site's "del dato a la pantalla" thread: a collapsed block that shows the page's own data as raw `field / type / value` rows, generated from the site configuration. The home stays as it is.

## Problem / why

A reviewer called the site template-like and forgettable; a third-party redesign (`elvinlab-astro`, reviewed locally 2026-10-12) answered with a hidden "database" layer behind every block. Owner decision 2026-10-12: take the idea only to `/me`, where the full-stack narrative already lives (`odd/tasks/me-fullstack-narrative.md`), as shape 2 of the explored options: a native `<details>`, no JS, no animation, rendered from config.

## Scope

- New `apps/web/src/features/me/lib/data-rows.ts` (+ `data-rows.test.ts`): pure builder of `{ field, type, value }` rows from `site.identity`, `site.me.headline` and `site.me.stack`; types inferred (`text`, `int`, `text[]`).
- New `apps/web/src/features/me/components/MeDataLayer.astro`: `<details>` with a `min-h-11` summary and a monospace row list, no JS.
- `MeSidebar.astro` (or `MePage.astro`): render the block next to the layered stack.
- `apps/web/src/shared/i18n/index.ts`: ES and EN keys for the summary and the column labels.
- `apps/web/scripts/page-weight-budget.json`: conscious, recorded raise for the `me` page type (style and html) with an updated `why`.
- Docs first (brand-first rule): `docs/DESIGN.md` (`/me` section), `docs/PORTFOLIO.md` and `docs/PORTFOLIO.en.md`; `docs/TESTING.md` only if the budget text changes.
- e2e spec `tests/browser/me-data-layer.spec.ts`.
- Changelog entry in `apps/web/src/content/changelog.json`.

## Constraints

- White-label: every row value comes from config, never a literal; the white-label check must stay green. Generic field names only.
- No JS, no animation (so nothing for `prefers-reduced-motion` to stop), 44 px summary, collapsed by default, printable decision left to DESIGN.md.
- `/me/` has 0 B style margin and about 32-49 B html margin: the raise must be minimal, measured, and written down.
- Do not touch the Lighthouse CLS issue #124 area (hero, fonts); the block sits below the fold in the sidebar/body.
- Touch-scoped verification (CLAUDE.md); owner prefers light local checks. Stays on `develop`; no push or release without explicit authorization.
- No Engram mirror of this file (project CLAUDE.md overrides the global protocol).

## Tasks

- [x] **D1** Docs first: `DESIGN.md` `/me` section, `PORTFOLIO.md` + English twin. Route: delegated writer (3 docs, with D2 to D4).
- [x] **D2** Row builder with unit test, RED first. Route: delegated writer.
- [x] **D3** `MeDataLayer.astro`, i18n ES/EN, placement in `/me`. Route: delegated writer.
- [x] **D4** Page-weight budget raise with its `why`, e2e spec, changelog entry. Route: delegated writer.
- [x] **D5** Parent review of the full diff, verification run, commit. Route: inline.

Route declaration: delegated writer for D1 to D4 (writer trigger: 5+ non-trivial files across code, docs, tests and config); parent reviews and verifies (D5).

## Authorized scope

D1 to D5 on `develop`, local commits only. Push and release stay the owner's decision.

## Acceptance criteria

- `/me/` and `/en/me/` show a collapsed "raw data" block built from config; opening it lists `field / type / value` rows in the active locale.
- No owner literal in the component or the builder; `pnpm test:white-label` passes.
- Summary target is at least 44 px; the block is keyboard operable (native `<details>`).
- `pnpm check:page-weight` and `pnpm check:js-budget` pass; the new `me` budget numbers and their reason are recorded in the JSON and the docs.
- Unit test for the builder, `/me` e2e (new spec, `a11y`, `mobile-ux`, `no-horizontal-overflow`) pass.

## Progress and evidence

- 2026-10-12: feature opened. Prior work unit committed separately: `c00dde5` feat(home) name and role above the headline on phones.
- D1 (2026-10-12): documented in `docs/DESIGN.md` (/me bullet), `docs/PORTFOLIO.md` and `docs/PORTFOLIO.en.md`; Biome not applicable to Markdown.
- D2 (2026-10-12): `data-rows.test.ts` RED (module missing, file failed to load), then `data-rows.ts` GREEN (6 tests); `vitest run src/features/me`: 19 passed; typecheck clean.
- D3 (2026-10-12): `MeDataLayer.astro` mounted in `MeSidebar.astro` under the stack card, ES/EN keys `me.data.summary` and `me.data.cols`; dropped `break-words` because it was the only new utility and cost 38 B of shared CSS; depcruise clean, white-label green, js-budget green.
- D4 (2026-10-12): `me` html budget 119700 -> 122900 (measured 122854 on `/me/`; `/en/me/` 122392), style unchanged at 55712; `check:page-weight` all 38 pages within budget. Changelog entry `me-raw-data-layer`. e2e (me-data-layer, a11y, mobile-ux, no-horizontal-overflow, wide specs): 117 passed, 142 skipped by design.

- D5 (2026-10-12): parent read the component and builder (no owner literal, native details, no aria-hidden). Re-ran on the final build, because the writer's earlier runs predated its last edits: build, `check:page-weight` (38 pages within budget), `check:js-budget` (no FAIL), `test:white-label` green, e2e me-data-layer + a11y + mobile-ux + no-horizontal-overflow 117 passed, 142 skipped by design. Not run: Lighthouse (`/me/` CLS issue #124 untouched, block is below the fold) and the full e2e battery.
- Honest limit: a collapsed block in the sidebar is a detail for curious visitors, not a first-screen identity gesture; owner asked on 2026-10-12 to extend the idea site-wide, which becomes its own feature (brand and motion decision pending).

## Next step

Open the site-wide visual and motion feature (BRAND.md and DESIGN.md first) once the owner decides between stepped `steps(4)` motion and eased motion.
