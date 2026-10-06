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
- [ ] H1 Brand icon: `docs/BRAND.md`, navbar and footer markup, tests (icon present and decorative, same link name, 44 px tap height kept, no overflow at 360 px, no animation at rest, hover gesture, reduced motion).
- [ ] H2 Server: catalog accepts `home` (unit tests), ADR 0013 and recipe note.
- [ ] H3 Home card: `home.marks` flag, a card variant of `MarkSection`, strings ES and EN, privacy page wording ("each note and the home page"), e2e (visible, tap, shared behavior, hidden when unavailable, axe in both themes, tooltip).
- [ ] H4 Verification with `pnpm verify` (plan, then only what it lists, without Lighthouse), then one Lighthouse run by the parent comparing the home, the contact pages and the notes with the baseline in the ledger.

## Acceptance
The brand shows an icon next to the wordmark on every page at 360, 768 and 1280 px in both themes without layout shift and without movement at rest. The home shows the footprint card, counts separately from the notes, and nothing breaks when the store is unavailable. Home and notes Lighthouse LCP stay under the 2500 ms budget with the margin recorded in the ledger.

## Progress
Created 2026-10-05.
