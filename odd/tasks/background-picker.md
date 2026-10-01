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

## Bugfix 2026-10-01 (post-deploy): Firefox lost the WebGL context after a few cycles

User reported the banner going blank/broken after clicking the picker "a couple of tries in," in production, on both desktop and (previously) mobile. Not reproducible in Chromium despite extensive attempts (sequential, rapid, combined with the theme toggle, light/dark, mobile viewport, `/me`, home). Reproduced by the user directly in Firefox, which logs the browser-level warning verbatim: `WebGL context was lost.`

**Root cause**: `BackgroundCanvas`'s rewrite (this same feature) made it legal to swap effects on one long-lived canvas — but `createGalaxy`/`createCursorWaves`/`runShader` still called `canvas.getContext('webgl2', ...)` fresh on every swap, and `destroy()` explicitly force-lost that context via `WEBGL_lose_context`. Opening a new WebGL2 context on the same canvas repeatedly, several times in a row, hits Firefox's (much stricter than Chromium's) concurrent-context limit, so the browser forcibly loses a context — sometimes the one currently in use — mid-cycle. `gl-runner.ts`'s own `onLost` handler then hides the canvas (`display: none`), which is correct behavior for a genuine loss but was being triggered by our own code's churn, not an external GPU event.

**Fix**: one `WebGL2RenderingContext` per canvas for its whole lifetime, reused across every effect swap; only the **program** (shaders + buffers) is recompiled per swap, never the context itself. The context is only ever actually lost once, on final page teardown (`astro:before-swap`/`pagehide`).
- `features/backgrounds/lib/contract.ts`: `Background` type now takes `(gl, canvas, palette)` instead of `(canvas, palette)` — it receives an already-open context rather than creating one.
- `features/backgrounds/lib/gl-runner.ts`: split out `createGlContext(canvas)`; `runShader(gl, canvas, palette, fragment)` now takes the context as a parameter, checks `gl.isContextLost()` up front, and its `destroy()` deletes only the program/buffer/shaders (`gl.deleteProgram`/`deleteBuffer`/`deleteShader`) — it no longer calls `loseContext()`.
- `features/backgrounds/lib/galaxy.ts` / `cursor-waves.ts`: pass the new `gl` parameter through to `runShader`.
- `features/backgrounds/components/BackgroundCanvas.astro`: opens one `gl` lazily on first need, reuses it across every `run(choice)` call, nulls it out if `webglcontextlost` ever fires for real (so the next swap recreates it), and only calls `loseContext()` in the component's own final `dispose()`.
- New regression test in `tests/browser/background.spec.ts`: cycles the picker 20 times, asserts zero console errors and the correct final state.

**Verified**: full check suite green (typecheck, lint, 313 unit tests, depcruise 0 violations, build, white-label, js-budget, full Playwright suite 141/141 incl. a11y). Manually stress-tested the fix in real Firefox (not just Chromium) against a local build — 20 rapid cycles, zero console messages, confirming the exact browser/error combination the user hit is resolved. Did not get a clean negative-control repro of the pre-fix bug in automation (Chromium's higher context limit didn't trigger it either, consistent with the user never seeing this in Chrome) — the root-cause mechanism and the fix's correctness were confirmed by code inspection and the matching error message, not by a failing-then-passing automated test.

## Next step

Commit, close issue #41, ship the Firefox WebGL-context fix as its own follow-up commit.
