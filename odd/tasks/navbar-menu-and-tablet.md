# Navbar: mobile menu look and the 768 to 1023 px range (critique P3)

## Objective and authorization
2026-10-13, owner: "todos los P2 y todos los P3" of the impeccable critique of the navbar. P2 items are done in `eebc851` (toggle states) and in the bar/marker pass (`odd/tasks/navbar-bar-and-active.md`). This pass takes the two remaining P3 items. Local commits on `develop`; push and release stay the owner's call. Start only after the bar/marker pass is committed: both touch `Navbar.astro` and `global.css`.

## Findings being addressed
- Mobile menu: after the accessibility pass the menu moves focus in, makes the page inert and shows an X, but the panel is still a plain rounded card with six rows, no scrim (the dimmed page is not signalled) and no stepped open motion, unlike the pixel language of `/education/`, `/experiments/` and `/notes/`.
- 768 to 1023 px: the wordmark text next to the logo is visually hidden (`md:sr-only lg:not-sr-only`) because six links, the language code and two toggles do not fit 736 px with the wordmark; the logo link is 40 x 44 px (under 44 px wide) and reads as an unlabelled tile. Also the background picker is hidden in that range (documented behaviour for coarse pointers and reduced motion; with a fine pointer it only appears from 1024 px).

## Design
- Menu panel: stepped notched corners (the notch recipe of the pixel pages, defined once as a custom property on the navbar), the same hairline edge as the bar, rows with the active marker of the bar pass; opening and closing are a stepped dissolve (`steps(3, end)`, about 160 ms) inside `prefers-reduced-motion: no-preference`, instant otherwise; a scrim over the inert page (the token page color at about 60 percent) that closes the menu on click, no blur, no animation under reduced motion; keep: focus to the first link, Escape returns focus to the toggle, `inert` behind, X glyph.
- 768 to 1023 px: show the wordmark as early as the layout allows by tightening the horizontal padding and gaps of the links in that range (measure the lowest width at which the wordmark fits at 72 px height without wrapping; use it as the breakpoint instead of `lg` if it is lower than 1024), and make the logo link at least 44 x 44 px wherever the wordmark is hidden; never wrap, never overflow at 768; keep the picker rule as it is.

## Tasks
- [ ] C1 — Menu panel notched, stepped open/close, scrim; all focus/inert/Escape behaviour intact.
- [ ] C2 — Wordmark visible from the lowest workable width (at most 1023 px), logo target 44 x 44 px where the wordmark is hidden, no wrap or overflow from 768 up.

## Acceptance criteria
- Desktop (1024 px and up) and phones with the menu closed look unchanged except where stated; the bar and active marker from the previous pass stay as they are.
- Tokens only, no hard offset shadows, no new theme-variable leak or global utility growth (the navbar is on every page: `check:page-weight` style/html delta uniform across page types and small; report the exact deltas), no new JS beyond a few lines in the existing menu script, no ALL-CAPS labels.
- Tests first; axe clean in both themes with the menu closed and open; no overflow at 320, 360, 390, 768; reduced motion shows the states without motion.
- The writer takes screenshots (768, 820, 900, 1023, 1280 and 390; dark and light; menu open with the scrim) and looks at them; the parent reviews them again.

## Progress and evidence
Route: delegated writer after the bar/marker pass lands; parent reviews the diff, re-runs checks and looks at screenshots.
