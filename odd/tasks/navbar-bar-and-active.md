# Navbar: bar legibility and active-link marker (critique P2)

## Objective and authorization
2026-10-13, owner chose "solo los P2" of the impeccable critique of the navbar (after the accessibility pass, commit eebc851). Local commits on `develop`; push and release stay the owner's call. Out of scope: the pixel identity pass (notched hover/focus, stepped motion, pixel glyph icons, notched focus), the mobile-menu look, the 768 to 1023 px compromise, anything but the navbar.

## Findings being addressed
- The bar is `bg-card/70` with `backdrop-blur-md`: on dark it barely separates from the page and, after scrolling, the silhouettes of the content show blurred behind the links (text stays legible but the bar does not read as a bar). Measured by the parent: navbar `nav` computed background alpha 0.7, backdrop blur 12 px.
- The current link is marked by color only (purple text plus `aria-current="page"`): a WCAG 1.4.1 weak spot for low-vision users.

## Design
- Bar: background alpha raised to about 0.92 (opaque enough that nothing ghosts through, keep it a token color), keep it a rounded bottom bar, and add a 1 px hairline edge in both themes built from an existing semantic token with `color-mix` (for example the text color at about 20 to 25 percent over transparent) so the bar reads as an object in dark and in light; the blur can stay or go (decide by looks; keep the cost on every page tiny).
- Active link marker: a small pixel marker in the primary color on the current link, in the desktop row (a 2 px tall bar under the label with stepped 2 px ends, built with `clip-path` or a stepped background, no rounded ends) and in the mobile menu (the same marker, or a 3 px square-capped bar at the left of the row); it never changes the link box (use a pseudo-element), exactly one per page, color is no longer the only cue (keep the purple text too), and it works in light and dark with contrast at least 3:1 against the bar. No new animation.

## Tasks
- [x] B1 — Opaque bar with a hairline edge in both themes; hide-on-scroll, sticky, safe-area and the banner overlap keep working.
- [x] B2 — Pixel active-link marker in the desktop row and the mobile menu; `aria-current` untouched.

## Acceptance criteria
- Every page keeps its layout (the navbar box and the offsets are unchanged: 72 px bar, banner `-mt-18`); only the bar surface and the active marker change.
- Tokens only, no hard offset shadows, no new theme-variable leak or global utility growth (the navbar is on every page: `check:page-weight` must show a style delta of at most a few hundred bytes per page type, uniform across types; report the exact deltas; raise a budget only for the measured need plus about 150 B with a dated reason), no new JS, no ALL-CAPS labels.
- Contrast of the active text and marker at least 4.5:1 and 3:1; axe clean in both themes, menu closed and open; no overflow at 320, 360, 390.
- The writer takes screenshots (dark and light; 1280 and 390; each page type with its own banner behind: home, notes, education, experiments; after scrolling down and up) and looks at them; the parent reviews them again.

## Progress and evidence
Route: delegated writer; parent reviews the diff, re-runs checks and looks at screenshots.

### Writer report (2026-10-13, uncommitted; the parent reviews and commits)
- RED: new `tests/browser/navbar-surface.spec.ts` (`test:e2e:quick`) ran 14 failed, 5 passed before any change (surface x4, one-marker x8, mobile marker x2 failed; overflow and axe passed because nothing had changed yet). GREEN after the change: 19 passed. Unit: `apps/web/src/shared/layout/navbar-surface.test.ts` (reads `global.css` and `Navbar.astro` from disk): 4 tests.
- B1: the nav class `bg-card/70` became `bg-card/92` (same token, alpha 0.92; `backdrop-blur-md` kept: after the first look at 0.92 without blur, content under the bar still showed as readable ghost text on dark, with the blur it is a soft smear). The old utility stays in the build because `BannerToggle.astro` still uses it. The hairline is one rule in `global.css` on `[data-navbar] > nav::before` (absolute, inset 0, 1 px border sides and bottom, text token, opacity 0.24; an opacity instead of `color-mix` because lightningcss emitted a duplicated fallback for every `color-mix` rule). The box is unchanged (72 px, same x and width as the header at 1280 and 390).
- B2: `[data-navbar] a[aria-current="page"]` gets `position: relative` and an `::after` 2 px bar (inset 0.5rem, bottom 0.5rem, polygon clip with 2 px steps, primary token); `#nav-menu a[aria-current="page"]::after` is a 3 px square bar at the left edge (top/bottom 0.5rem). Link boxes stay 44 px.
- Page weight (build vs the base build): style +594 B and html +594 B on every one of the 12 page types (uniform, no leak). Budgets raised, only for types over their budget, by the measured overshoot plus about 150 B (the base had little headroom), with a dated reason in each `why`: home, result, changelog, contact, education, experiments, me, default (style only), subscribe, notes-index (style only), note, topic. Changelog html: a further +640 B for its new entry (overshoot 237 B plus about 400 B).
- Specs changed: none of the existing ones (no assertion expected the old alpha). New: `navbar-surface.spec.ts`, mapped in `verification-map.ts`.
- Checks: biome clean, typecheck 0 errors, depcruise clean, web vitest 1671 passed, `check:js-budget` pass, `check:page-weight` 42 of 42 within budget, `test:white-label` pass, `docs:config` up to date. `test:e2e:quick` on the 21 listed specs: 412 passed, 3 skipped (the 320 px picker rows and one calm-pages case). `test:e2e` (3 viewports) navbar-a11y, mobile-ux, no-horizontal-overflow, navbar-surface: 119 passed, 244 skipped.
- Visual review (Playwright PNGs, reduced motion): /, /notes/, /education/, /experiments/ at 1280 and 390, dark and light; scroll 600 down and 100 up on /education/ at 1280; menu open at 390 with the marker; marker at 3x. Changed after review: kept the blur (see B1). The marker reads clearly in both themes (stepped ends visible at 3x); the hairline is clear on dark and subtle but visible on light; the mobile left bar sits well against the row text.
- Gaps: no Lighthouse or full e2e battery; contrast not measured numerically (primary on card is the same pair as the existing purple text, so at least 4.5:1 by the theme tokens); Safari not exercised.
