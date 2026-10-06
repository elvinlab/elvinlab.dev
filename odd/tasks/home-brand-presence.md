# Feature: brand icon next to the wordmark, and a footprint card on the home

## Objective
Owner, 2026-10-05: the cursor blocks next to the brand (nav and footer) used to blink and stole the visitor's focus, so they were made static (docs/BRAND.md says so on purpose), but now they feel odd. And the footprint should also exist on the home, with presence but not invasive. Out of scope for now (owner did not select them): smaller type sizes, a collapsible decision record.

## Decisions
- Brand icon: a small static icon beside the wordmark in the navbar and the footer, reusing the favicon mark (the violet rounded square with a cyan `>` and a pink block), so it is the existing identity and no new asset. No loop animation; a subtle gesture only on hover or focus (a few degrees of tilt and a slight scale), none under `prefers-reduced-motion`. `docs/BRAND.md` is updated first (brand rule).
- Home footprint: one compact card, not a floating element and not in the hero. It sits in the sidebar column on desktop and, because the sidebar stacks after the content on a phone, near the end of the page there. Its own counter (slug `home`), the same store, animation, cap, privacy tooltip and fail-closed behavior as the notes. Configurable like the other home sections through the existing `home` block of `site.config.ts` (a `marks` key, on in both appearance presets) and only when `features.marks` is on.
- Server: the slug catalog accepts the published notes plus the site page keys (today only `home`). The table `note_footprints` keeps its name (the database is already migrated; renaming it would need a new remote migration): its `slug` column holds a note slug or a page key, recorded in ADR 0013.
- Page weight: the notes taught that a few hundred bytes can move the Lighthouse LCP gate; the home is at about 2213 ms of 2500. The marks CSS is only emitted on a page that renders a footprint instance.

## Authorized scope
Local implementation on `develop`. No remote operation, no push, no release. One writer at a time.

## Tasks
- [x] H1 Brand icon (97a69d8; final design: the favicon terminal, 32 px nav / 16 px footer, heart only on the footprint button): `docs/BRAND.md`, navbar and footer markup, tests (icon present and decorative, same link name, 44 px tap height kept, no overflow at 360 px, no animation at rest, hover gesture, reduced motion).
- [x] H2 Server (04bd3a5): catalog accepts `home` (unit tests), ADR 0013 and recipe note.
- [x] H3 Home card (04bd3a5): `home.marks` flag, a card variant of `MarkSection`, strings ES and EN, privacy page wording ("each note and the home page"), e2e (visible, tap, shared behavior, hidden when unavailable, axe in both themes, tooltip).
- [x] H4 Verification with `pnpm verify` (plan, then only what it lists, without Lighthouse), then one Lighthouse run by the parent comparing the home, the contact pages and the notes with the baseline in the ledger.

## Acceptance
The brand shows an icon next to the wordmark on every page at 360, 768 and 1280 px in both themes without layout shift and without movement at rest. The home shows the footprint card, counts separately from the notes, and nothing breaks when the store is unavailable. Home and notes Lighthouse LCP stay under the 2500 ms budget with the margin recorded in the ledger.

## Progress
Created 2026-10-05. Done the same day:
- Footprint text smaller (de2f638): button 14 -> 13 px, title 16 -> 15 px; the tooltip stays at the 13 px floor.
- Footprint icon and animation in 8-bit style (356d412): pink pixel heart, stepped stamp, square ring.
- Favicon redone as a pixel Linux terminal (7bb7af9), without the saturated violet; the same terminal sits next to the wordmark (97a69d8).
- Home footprint card (04bd3a5): slug `home` through the catalog (`PAGE_KEYS`), `home.marks` flag, privacy wording for notes and home.
- Heartbeat (hover, focus, once when first seen; never loops) and two fixes it exposed: the stamp being overridden by the hover beat, and the first-visit nudge cut short by the heart's animationend.
- The WebGL background e2e now mocks the marks Action (the home reads its counter and the fixture has no database).

## Verification evidence
- Full stack `pnpm verify --all --run --record` green on 2026-10-05 (344 s): lint, typecheck, depcruise, docs:config, unit, build, JS budget, white-label, dev cold start, e2e 1280 px (20 specs), e2e 3 viewports (11 specs), Lighthouse 6 URLs. It seeded `odd/verification-state.json` (46 checks).
- Lighthouse LCP after the heartbeat: home 2265-2295 ms, note 2263-2286 ms (budget 2500; margin about 215 ms).
- MARKS_CSS is about 3330 bytes; its guard is `< 3350`.

## Not done (owner did not select them)
Smaller type scale and less text on screen (collapsed decision record on mobile, shorter latest-note card on the home).
