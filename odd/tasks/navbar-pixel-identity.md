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
- [ ] P1 — Notched stepped hover/focus layer and square focus ring on all navbar controls, stepped press.
- [ ] P2 — Pixel glyph icons for theme, picker (3 modes) and menu (hamburger and X).

## Acceptance criteria
- Layout unchanged: 72 px single-row bar, link positions, the tablet breakpoint (780 px), the phone bar and the menu behaviour; only the control states and the three icons change.
- Tokens only, no hard offset shadows, no new theme-variable leak or global utility growth: the navbar is on every page (already about 3 KB of HTML per page from the earlier passes), so `check:page-weight` deltas must be uniform and as small as possible (removing the old hover/press/radius utilities from the markup should offset most of the new CSS); report the exact per-type deltas; raise a budget only for the measured need plus about 150 B with a dated reason; no new JS beyond a few lines if an icon swap needs it (prefer CSS-only swaps via existing state attributes).
- Contrast of icons at least 3:1 and of text at least 4.5:1; targets at least 44 px; axe clean in both themes, menu closed and open; no overflow at 320, 360, 390, 768; reduced motion shows the states without motion.
- The writer takes screenshots (dark and light; 1280, 820 and 390; hover, focus-visible, pressed and each icon state; 3x crops of the icons) and looks at them; the parent reviews them again.

## Progress and evidence
Route: delegated writer; parent reviews the diff, re-runs checks and looks at screenshots.
