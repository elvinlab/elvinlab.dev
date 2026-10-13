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
- [ ] B1 — Opaque bar with a hairline edge in both themes; hide-on-scroll, sticky, safe-area and the banner overlap keep working.
- [ ] B2 — Pixel active-link marker in the desktop row and the mobile menu; `aria-current` untouched.

## Acceptance criteria
- Every page keeps its layout (the navbar box and the offsets are unchanged: 72 px bar, banner `-mt-18`); only the bar surface and the active marker change.
- Tokens only, no hard offset shadows, no new theme-variable leak or global utility growth (the navbar is on every page: `check:page-weight` must show a style delta of at most a few hundred bytes per page type, uniform across types; report the exact deltas; raise a budget only for the measured need plus about 150 B with a dated reason), no new JS, no ALL-CAPS labels.
- Contrast of the active text and marker at least 4.5:1 and 3:1; axe clean in both themes, menu closed and open; no overflow at 320, 360, 390.
- The writer takes screenshots (dark and light; 1280 and 390; each page type with its own banner behind: home, notes, education, experiments; after scrolling down and up) and looks at them; the parent reviews them again.

## Progress and evidence
Route: delegated writer; parent reviews the diff, re-runs checks and looks at screenshots.
