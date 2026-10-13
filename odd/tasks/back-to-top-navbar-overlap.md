# Back to top overlapping the navbar (2026-10-13)

## Cause
Release verification: `back-to-top.spec.ts` "never covers a control at the bottom of <url> at 360 px" failed on `/` and `/notes/smoke-es/` (`8 px above the bottom: expected [] received ["button "]`). The button lifts above the footer (`liftAboveFooter`). Education added a footer link, so at 360 px the footer grew to 615 px; at "bottom minus 8 px" the lift (607 px) put the button at top 22 to 66 px, over the navbar's menu button (revealed by the small scroll up, 72 px tall).

## Fix
- `shared/layout/back-to-top.ts`: pure `fitsBelowBar` (top of the lifted button >= bar height + 8 px). `BUTTON_SIZE_PX`, `BAR_GAP_PX` exported.
- `shared/ui/BackToTop.astro`: same scroll handler reads `[data-navbar]` `offsetHeight`; `render()` shows the button only when the gesture wants it and it fits (otherwise `inert`, `aria-hidden`, no `data-shown`). Reading-mode base offset is now a number shared by the fit check and `--btt-base`.
- `styles/global.css`: footer compaction at <= 389 px only (paddings, row gaps, band padding): 360 px footer 615 -> 534.5 px (about -80 px), 390 px unchanged (594.5 px).
- `docs/DESIGN.md` bullet, changelog entry `back-to-top-clear-of-navbar`, page-weight budget raised (below).

## Evidence
- RED: unit tests for `fitsBelowBar` failed before the implementation; with the old BackToTop.astro, `pnpm test:e2e:quick tests/browser/back-to-top.spec.ts tests/browser/back-to-top-bar.spec.ts` gave 7 failed, 27 passed (the two original 360 px cases plus the new bar spec at 360x740 and 320x568).
- GREEN: same command 34 passed after the fix.
- biome check, typecheck, depcruise, `vitest run` (147 files, 1690 tests), `web build`, `check:js-budget`, `test:white-label`, `docs:config` all green.
- e2e quick over back-to-top, back-to-top-bar, mobile-ux, native-feel, reading-mode, navbar-*, no-horizontal-overflow, a11y, home-sections, smoke: 343 passed, 2 skipped. `pnpm test:e2e` for the two back-to-top specs: 34 passed (the specs skip every project but chromium-1280 and set their own viewports).
- Page weight: uniform +226 B style on every page type (+138 B on terms), changelog html +757 B. Budgets raised: styleBytes +376 on every type, changelog htmlBytes +1160, each with a dated `why`. After: all 42 pages within budget.
- Visual check (build + preview, dark and light, 360x740 and 390x844 at bottom minus 8 px): button sits below the bar, footer still reads as the same footer. Temp script deleted.

## Gaps
- `env(safe-area-inset-bottom)` is not part of the fit calculation (0 on ordinary screens).
- 320x568: the footer (562 px) leaves no room, so the button stays hidden at the bottom of long pages by design.
- About 52 px of document below the footer at 360 px is unexplained (outside this task's surface).
- Lighthouse and the full e2e battery were not run.
