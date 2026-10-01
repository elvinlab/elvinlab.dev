# Feature: visitor background picker (#41)

## Objective

Let each visitor choose the banner background effect (galaxy / cursor-waves / off) and remember it, the same way the theme toggle works — layered on top of the owner default in `site.config.ts`.

## Problem / why

GitHub issue #41, explicitly frozen by the 2026-09-30 plan decision ("Freeze until launch: decorative and tooling work... #41 background picker"). User explicitly chose to break the freeze for this feature in this session (same pattern as the changelog feature earlier).

## Process note

This feature doc was created mid-implementation, not before the first write as ODD normally requires — exploration (via `codegraph_explore`) flowed directly into coding without a pause to create the tracker first. Caught and corrected before commit; documenting the gap here rather than silently backfilling a clean-looking history.

## Scope decisions

- Tier 3 (the issue's own label: "Complex. Claude Code (Tier 3) does this and reviews.") — done inline, no opencode delegation.
- Architecture constraint found during exploration: `shared/layout/Navbar.astro` cannot import from `features/backgrounds/` (the `shared-below-features` depcruise rule forbids `shared/` → `features/`). Resolved by splitting the work across the layer that actually owns each piece:
  - Pure preference logic (`BackgroundChoice`, `BACKGROUND_STORAGE_KEY`, `resolveBackgroundChoice`, `nextBackgroundChoice`, `ownerDefaultChoice`) → `shared/lib/background-preference.ts` (shared layer, importable by both the feature and the layout).
  - The picker control (`BackgroundPicker.astro`) → `shared/ui/`, mirroring where `ThemeToggle.astro` already lives — not `features/backgrounds/components/` as a literal reading of the issue's file list would suggest, because `Navbar.astro` needs to import it directly.
  - `BackgroundCanvas.astro` (features/backgrounds) rewritten to always mount one canvas (not one per owner-enabled effect) and react live to a `background-change` custom event, so the visitor can pick an effect the owner didn't default to.
- `localStorage` key is unprefixed (`'background'`, matching `THEME_STORAGE_KEY`'s bare `'theme'`) — an earlier `'elvinlab:background'` draft failed `pnpm test:white-label` (the owner's handle leaking into the key name) and was corrected before commit.
- 'off' hides the canvas (`display: none`) so the banner's CSS starfield fallback shows through, per the issue's "CSS starfield remains" requirement — an early implementation left the canvas visible-but-blank instead, caught by a new Playwright test before commit, not shipped.

## Tasks

- [x] **BG1** — `shared/lib/background-preference.ts` + test: pure choice-resolution logic. Strict TDD: RED observed (`Cannot find module`), then GREEN, 7/7 tests.
- [x] **BG2** — Rewrite `features/backgrounds/components/BackgroundCanvas.astro`: single always-mounted canvas, resolves initial choice from storage/owner-default, listens for `background-change` to swap the running effect in place (existing `BackgroundHandle` destroy/create contract, unchanged).
- [x] **BG3** — New `shared/ui/BackgroundPicker.astro`: button cycling the 3 states, persists to `localStorage`, dispatches `background-change`. i18n keys `background.switch` (ES/EN) added.
- [x] **BG4** — Wire into `shared/layout/Navbar.astro`, next to `ThemeToggle`.
- [x] **BG5** — New Playwright tests in `tests/browser/background.spec.ts`: cycling applies live (no reload) and persists across reload. Existing coarse-pointer/fine-pointer tests in the same file re-verified unaffected by the `BackgroundCanvas` rewrite.
- [x] **BG6** — Full verification sweep (see below) + fix the two real bugs the sweep caught (white-label leak, 'off' not hiding the canvas) before commit.

## Authorized scope

BG1-BG6 only, matching the issue's acceptance criteria. No changes to `ThemeToggle.astro`, `gl-runner.ts`, `galaxy.ts`, or `cursor-waves.ts` (effect internals untouched — only how an effect is selected and swapped changed).

## Acceptance criteria (from issue #41)

- [x] A small control near the theme toggle cycles galaxy → waves → off; choice persisted in `localStorage`.
- [x] Applies at runtime without reload (verified: `tests/browser/background.spec.ts`).
- [x] Owner default in `site.config.ts` is the fallback when the visitor has no preference (`resolveBackgroundChoice`).
- [x] Respects `prefers-reduced-motion` and existing perf guards (same `reduced`/`coarsePointer`/`WebGL2RenderingContext` gate as before, now gating the whole swap-listener setup too); 'off' fully stops the GPU work and hides the canvas, CSS starfield remains.
- [x] axe clean (full `pnpm test:e2e` run, including `tests/browser/a11y.spec.ts`, 138/138 passed); a11y label via `aria-label` (`background.switch`), same pattern as `ThemeToggle`.

## TDD mode

Strict (project default). `background-preference.ts` is the pure-logic unit: RED observed before GREEN. `BackgroundCanvas.astro`/`BackgroundPicker.astro` are DOM/Astro components verified functionally via Playwright, not unit-tested (no pure logic to isolate beyond what's already covered).

## Checks run / evidence

- `mise exec -- pnpm typecheck` — 0 errors (170 files).
- `mise exec -- pnpm lint` — clean after `pnpm lint:fix` resolved import/formatting order.
- `mise exec -- pnpm test` — 313/313 (40 files; +7 new in `background-preference.test.ts`).
- `mise exec -- pnpm depcruise` — clean, 146 modules / 342 deps, 0 violations (confirms the shared-vs-feature split above is architecturally correct, not just working).
- `mise exec -- pnpm --filter web build` — succeeds; confirmed in built HTML: `data-background-toggle` button and `data-background` canvas both carry the correct `data-owner-galaxy`/`data-owner-waves` attributes from `site.config`.
- `mise exec -- pnpm check:js-budget` — all pages still PASS; added ~0.6 KiB gzip per page for the picker script, nowhere near the 30 KiB budget.
- `mise exec -- pnpm test:white-label` — **failed once** (`owner strings leaked into the build: /elvin/i`, from the first `'elvinlab:background'` storage-key draft), fixed to the unprefixed `'background'`, passes now.
- `mise exec -- pnpm test:e2e` (full Playwright suite incl. `a11y.spec.ts`) — **failed once** (3 new test failures: the first `background.spec.ts` draft didn't account for the suite's global `reducedMotion: 'reduce'` default, same trap the pre-existing coarse/fine-pointer tests in that file already work around with an explicit `browser.newContext({ reducedMotion: 'no-preference' })` — fixed to match that pattern), 138/138 passed after the fix. That same full run is also what caught the 'off'-doesn't-hide-canvas bug (test assertion `not.toBeVisible()` failed against the pre-fix implementation).

Not committed yet — pending explicit go-ahead.

## Next step

Commit, close issue #41.
