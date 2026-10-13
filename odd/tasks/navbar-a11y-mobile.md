# Navbar: accessibility and phone fixes (critique, first pass)

## Objective and authorization
2026-10-13, owner chose "Accesibilidad y móvil" first after the impeccable critique of the navbar (23/36, Aceptable); the pixel identity pass (notched hover/focus, stepped motion, active marker, opaque bar with edge, pixel glyph icons) is a separate later pass. Local commits on `develop`; push and release stay the owner's call. The navbar is on every page: every change must keep all pages visually unchanged except where stated.

## Findings being addressed (verified by the parent unless noted)
- The skip link "Saltar al contenido" targets `#main`, but the navbar is rendered inside `<main id="main">` (`BaseLayout.astro`), so the link lands on a region that already contains the navbar and does not bypass it (WCAG 2.4.1). Also the banner landmark of the navbar sits inside `main`.
- At 360 px the bar wraps to two rows (72 px to 88 px) and the menu button falls under the logo (confirmed by screenshot); at 390 px it fits.
- The theme toggle and the background picker (a three-state cycle button) have a static name and no state (`aria-pressed` or a state in the name), so the state is not announced; the picker is also silently hidden under reduced motion, coarse pointers and between 768 and 1023 px (documented behaviour: do not change, just do not break it).
- Mobile menu: focus stays on the toggle when it opens, nothing behind is inert, and the open state uses the same hamburger icon (measured by detector B, not re-verified by the parent).

## Tasks
- [ ] A1 — Skip link: the target is the content after the navbar. Preferred: render the sticky chrome (navbar) before `<main id="main">` instead of inside it, keeping the sticky behaviour, the hide-on-scroll, the banner `-mt-18` offset and the stacking order; fallback only if that breaks something: a wrapper with `id="main"` around the content that follows the navbar.
- [ ] A2 — 360 px (and down to 320 px): the bar stays on one row at 72 px with the menu button next to the logo (tighter gaps/padding or smaller wordmark gap below a breakpoint; no change from 390 px up).
- [ ] A3 — State of the theme toggle and the background picker announced to assistive tech (stable name plus `aria-pressed` for the theme toggle, name or live text with the current mode for the picker), using i18n keys ES/EN within text limits; no visual change.
- [ ] A4 — Mobile menu: focus moves to the first menu link when it opens, Escape closes and returns focus to the toggle (already works), `inert` (or equivalent) on the page content behind while open and removed on close, the toggle shows a close glyph (an X) while open instead of the hamburger (reuse the current icon style; the pixel glyphs come in the next pass).

## Acceptance criteria
- All pages look the same at 390 px and up, desktop unchanged; hide-on-scroll, sticky behaviour, active-link marking, theme toggle, language switch and the background picker behave as before.
- Tokens only, no hard offset shadows, no new global utilities that grow every page (the navbar is on every page, so `check:page-weight` must show at most a few bytes of change per page type: report the exact deltas; raise a budget only for the measured need with a dated reason), no new JS beyond a few lines in the existing navbar script, no new dependency.
- Tests first (unit/e2e), axe clean in both themes, no overflow at 320, 360, 390.
- The writer takes screenshots (320, 360, 390, 768, 1280; dark and light; menu closed and open) and looks at them; the parent reviews them again.

## Progress and evidence
Route: delegated writer; parent reviews the diff, re-runs checks and looks at screenshots.
