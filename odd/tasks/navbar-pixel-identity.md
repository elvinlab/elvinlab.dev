# Navbar: pixel identity for the controls (critique P1, identity pass)

## Objective and authorization
2026-10-13, owner: "sí, dale" to the pending pixel identity pass of the navbar (critique of the navbar, 23/36), including the pixel glyph icons chosen earlier. Local commits on `develop`; push and release stay the owner's call. The accessibility pass (`eebc851`), the bar surface and marker (`52d55af`) and the menu panel and tablet range (`be651a0`) are done and must keep working.

## Finding
Every navbar control uses the same soft rounded tint on hover, a `scale-96` press and a circular focus ring, and the three icons (theme, background picker, menu) are stock stroke icons, while `/education/`, `/experiments/` and `/notes/` already use notched stepped corners, `steps()` motion and pixel glyphs. The navbar is the first thing every visitor touches and the last surface in a different dialect.

## Design
- Controls in scope: the six links, the language code button, the theme toggle, the background picker, the menu toggle and the brand link (the wordmark stays).
- Hover and focus-visible background: a notched stepped fill (the notch recipe of the pixel pages, one custom property on the navbar) drawn on a pseudo-element layer so the element itself is never clipped; the focus ring is a square 2 px primary outline with offset (no radius, not clipped by the notch); the tint uses the existing hover token.
- Press: replace `scale-96` by a 1 px nudge down in `steps(2, end)`; hover may nudge nothing (color only) to keep the bar calm.
- Motion: only `steps(2, end)` about 150 ms, only inside `@media (prefers-reduced-motion: no-preference)`; under reduced motion the states are visible by color and outline only.
- Icons: replace the three stroke icons by pixel glyphs on a small grid (about 12 x 12 units, 1 unit squares, `shape-rendering="crispEdges"`, `fill="currentColor"`, `aria-hidden`, one `<path>` of squares each like the glyphs of `/education/`): theme toggle (sun and moon, keep the current show-the-target logic), background picker (its three modes: sparkle, waves, grid), menu toggle (hamburger and the X glyph of the open state). The icons keep their sizes and the 44 px targets. Pink remains the accent: icons use `currentColor`, no new colors.
- The brand mark keeps its tilt-on-hover (stopped under reduced motion).

## Tasks
- [x] P1 — Notched stepped hover/focus layer and square focus ring on all navbar controls, stepped press.
- [x] P2 — Pixel glyph icons for theme, picker (3 modes) and menu (hamburger and X).

## Acceptance criteria
- Layout unchanged: 72 px single-row bar, link positions, the tablet breakpoint (780 px), the phone bar and the menu behaviour; only the control states and the three icons change.
- Tokens only, no hard offset shadows, no new theme-variable leak or global utility growth: the navbar is on every page (already about 3 KB of HTML per page from the earlier passes), so `check:page-weight` deltas must be uniform and as small as possible (removing the old hover/press/radius utilities from the markup should offset most of the new CSS); report the exact per-type deltas; raise a budget only for the measured need plus about 150 B with a dated reason; no new JS beyond a few lines if an icon swap needs it (prefer CSS-only swaps via existing state attributes).
- Contrast of icons at least 3:1 and of text at least 4.5:1; targets at least 44 px; axe clean in both themes, menu closed and open; no overflow at 320, 360, 390, 768; reduced motion shows the states without motion.
- The writer takes screenshots (dark and light; 1280, 820 and 390; hover, focus-visible, pressed and each icon state; 3x crops of the icons) and looks at them; the parent reviews them again.

## Progress and evidence
Route: delegated writer; parent reviews the diff, re-runs checks and looks at screenshots.

### Writer evidence (2026-10-13)
- RED: new `tests/browser/navbar-pixel.spec.ts` (44 tests) failed 30 on the base (no fill layer, scale press, stroke icons) with the 14 layout/axe/overflow tests green; new `navbar-pixel.test.ts` failed 5 of 7. GREEN after the change: 44 of 44 e2e at 1280, 7 of 7 unit.
- Controls: one rule set in `global.css` on `[data-navbar] nav :is(a, button)`: `::before` fill (hover token, `clip-path: var(--nav-notch)`, z-index -1, opacity 0 -> 1 on `:focus-visible` and on `:hover` inside `@media (hover: hover)`), the control itself never clipped; ring is the existing global 2 px primary outline with 2 px offset, square because `rounded-control` is gone from the markup; press is `translateY(1px)`; one transition (`150ms steps(2, end)`) only under `prefers-reduced-motion: no-preference`. Removed `rounded-control`, `hover:bg-card-hover`, `active:scale-96`, `transition-colors duration-150` from the links, language code, toggles, picker and brand.
- Icons: 10 x 10 grid shown at 20 px (2 px per unit; the brief said about 12, but 12 units at 20 px gives 1.67 px cells and uneven crisp edges), one `<path>` of merged unit rectangles per glyph (menu toggle: two paths), `fill="currentColor"`, `shape-rendering="crispEdges"`, `aria-hidden`, same `data-icon` names and swap code. Glyphs: moon, sun (core, 8 rays), sparkle (four-point star), waves (two stepped waves), grid (3 x 3 cells), bars, X.
- Page weight (build vs base build): style +571 B on every one of the 12 page types, html -963 B on every type (uniform, so no leak; removed classes and shorter paths offset the inlined CSS). Style budgets raised for all 12 types by overshoot plus about 150 B with a dated reason; html budgets untouched (the new changelog entry fits). `check:page-weight` 42 of 42 within budget; `check:js-budget` pass; no JS added.
- Checks: biome clean, typecheck 0 errors, depcruise clean, web vitest 1684 passed (147 files), `test:white-label` pass, `docs:config` up to date. `test:e2e:quick` on 24 specs (the allowed list plus the listed content specs that exist): 538 passed, 3 skipped, 2 failed on the first run (both fixed below, re-run green: native-feel and navbar-pixel 51 passed). `test:e2e` (3 viewports) navbar-a11y, navbar-menu, navbar-pixel, mobile-ux, no-horizontal-overflow: 188 passed, 382 skipped (specs pinned to 1280). Not run: Lighthouse, full battery.
- Existing specs changed: `native-feel.spec.ts` "tappable controls show pressed feedback" asserted `scale !== none` on the navbar controls, which no longer scale; it now accepts a scale or a transform and polls (the nudge is stepped, so the first frame is still `none`). My new spec had one flaky read (outline width 3px mid-transition: the global reduced-motion reset leaves a 1e-05s transition on all properties), fixed by polling.
- Visual review (dark and light at 1280, 820, 390; rest, hover, press, Tab focus on every control; 3x icon crops; phone menu open): states read clearly, notch visible on the fill, ring square and uncut; icons legible at 20 px. Changed after the review: the sparkle gained a 6-wide step between spike and body so it reads as a star and not a plus. Gaps: the 4 px notch is subtle on the dark theme (the hover token is a soft tint); sun rays are single dots (small but readable); Safari/Firefox not exercised; the parent should re-look at the screenshots.
- Layout: bar 72 px, every box at 1280, 820, 390 equal to the values recorded from the base build (pinned in the spec for the owner config).
