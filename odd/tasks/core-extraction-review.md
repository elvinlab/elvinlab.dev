# Feature: review the whole repository and decide what belongs in `@elvinlab/core`

Status: **not started** (recorded 2026-10-06 at the owner's request, to be done later). Read-only review first; no code moves until the owner approves the verdict list.
Tier: 3 (architecture, cross-module). Suggested route: one read-only explorer per area, then the parent writes the verdict report; moves, if approved, are separate tasks.

## Objective

Go through the whole repository and decide, component by component, what should live in `@elvinlab/core` (shared design base that will move to its own repo so others can build blogs and landings with this style), what stays in the app (`apps/web`), and what should be left alone for now.

## Why

`CLAUDE.md` and `docs/CONVENTIONS.md` say: "Born in the project, moved to `core` when repeated. Do not design `core` ahead of need." The site now has a set of pieces that are already repeated or clearly reusable (tooltip, section heading, chips, cards, icons, pixel details, gallery, pagination, compact lists) and `core` today only holds `i18n`, `themes` and `tokens`. The owner wants one deliberate pass instead of drifting.

## Rules to apply (from the repo)

- `core` is **presentation-only**: no `fetch`, no persistence, no site config reads; data in through props, events out.
- Components read **semantic tokens only**, never raw colors; they must work in every theme and both locales without app imports.
- Atomic design applies **only** in `core` and `shared/ui`; hexagonal ports/adapters only where infrastructure exists (`contact`, `marks`, `subscribe`).
- White-label by configuration and content (ADR 0004): nothing owner-specific in a component.
- JavaScript budget (<= 30 KiB gzip per page) and the LCP byte margin (see `docs/TESTING.md`): moving code must not change what a page ships; beware that Astro bundles the CSS of everything a barrel re-exports (learned in X2).
- Do not extract by guess: a piece moves when it is repeated in at least two places (or two apps would need it) and its API is stable.

## Method

1. Inventory: `apps/web/src/shared/ui/*`, `shared/layout/*`, every `features/*/components/*`, `shared/lib/*`, plus what lives in `packages/core/src`. Use CodeGraph for call sites and counts of usages.
2. For each item record: where it is used (pages/features), whether it reads config/i18n/site data, whether it has side effects or network, size (HTML/CSS/JS bytes it ships), test coverage, and whether it depends on app-only modules.
3. Verdict per item with a one-line reason: **core now**, **core later (trigger: when X repeats)**, **app (feature-specific)**, **shared/ui (stay app-level)**, or **delete (dead)**.
4. For each "core now": the target path in `packages/core`, the props/events contract, what must be injected instead of imported (i18n strings, links, config), the migration steps, and the verification needed (depcruise boundaries, bundle size, screenshots, white-label).
5. Report in `odd/tasks/core-extraction-review.md` (this file) and mirror it in Engram under `odd/core-extraction-review/tasks`; ask the owner to approve the list before any move.

## Candidates already noticed (starting point, not a verdict)

`InfoTip`, `SocialIcon` (pixel/stroke icon set), `SectionHeading`, `Chip`, `Card`, `ExternalHint`, `BackToTop`, `ThemeToggle`, `BackgroundPicker`, `LanguageHint`, `BrandMark`; the experiments page parts (exhibition piece, CSS-only gallery, compact card, pagination nav) and the `/me` rows; the pixel details documented in `docs/BRAND.md`; `shared/lib/localized.ts`; image helpers (`experiment-image`, `avatar`); `docs/adr/0015-images-live-in-the-repository.md` for how images are handled.

## Acceptance

- A written verdict for every item of the inventory, with reasons and triggers, approved by the owner.
- Each approved "core now" item has a migration task with its checks; nothing is moved in the review task itself.
- Boundaries (`pnpm depcruise`), JS budget, white-label build and the Lighthouse gates still pass for any approved move.

## Progress

- 2026-10-06: recorded, not started. GitHub issue not created (creating one is a remote operation that needs the owner's authorization: destination, operation, credential).

## Next step

Owner decides when to run it; suggested after the Experiments release and the Education page, so the repeated patterns are visible.

## Verdicts (reviewed 2026-10-16, read-only)

Rules applied: presentation-only, semantic tokens only, no fetch/persistence/config reads, repeated in >=2 places, white-label safe. Nothing moved.

### core now (move, with a migration task each)

| Item | Reason |
| --- | --- |
| `shared/ui/Card.astro` (19 uses) | Pure card shell; repeated everywhere. |
| `shared/ui/Chip.astro` (8) | Pure tag/status chip. |
| `shared/ui/SocialIcon.astro` (8) | The pixel/stroke icon set; name in, SVG out. |
| `shared/ui/SectionHeading.astro` (5) | Pure accent-bar heading. |
| `shared/ui/PageHeader.astro` (12) | Pure header (title/description/stamp/icon via props). |
| `shared/ui/InfoTip.astro` (3) | Pure tooltip (text via prop). |
| `shared/ui/Stamp.astro` (2) | Pure stamp (slot text, tone prop). |
| `shared/lib/localized.ts` | The localized text contract (`{ es, en }` or string). |
| `shared/lib/listing.ts` | Pure pagination/sort/grouping. |
| `shared/lib/minify-css.ts` | Pure CSS minifier. |
| `shared/lib/inline-mark.ts` | Pure `[[marked]]` split. |

### core later (trigger: when it repeats or is decoupled)

| Item | Trigger / reason |
| --- | --- |
| `shared/ui/Ink.astro` (home + note fixtures) | One production use (home hero); core when a second page or a published note uses it. |
| `shared/ui/ExternalHint.astro` (14) | Reads i18n (`link.newTab`) and site.url; core when the hint text and origin are injected. |
| `shared/ui/BackToTop.astro` (2) | Inline scroll script + i18n label; core when label/easing are injected and the script is bundled. |
| `shared/ui/ThemeToggle.astro` (2) | Reads the theme tokens + boot script; core when themes are injected (the boot script already is in core). |
| `shared/ui/BrandMark.astro` (2) | The replaceable pixel wordmark; core later once a fork overrides the mark via config/assets. |

### shared/ui (stay app-level)

| Item | Reason |
| --- | --- |
| `shared/ui/BackgroundPicker.astro` (3) | Reads background config + WebGL script (side effects). |
| `shared/ui/LanguageHint.astro` (1) | Site language suggestion (i18n + suggest-locale). |
| `shared/ui/Pager.astro`, `SortSwitch.astro`, `ListingSummary.astro` | Listing kit with i18n labels. |

### app (feature- or site-specific)

| Item | Reason |
| --- | --- |
| `shared/layout/*` (BaseLayout, Navbar, Footer, Banner, SiteNotice, BannerToggle) | The site shell (SEO, fonts, nav, footer). |
| `shared/layout/{nav,locale-target,subscribe-cta,notice,back-to-top,theme-boot}.ts` | Site logic (nav model, locale, subscribe CTA). |
| `shared/lib/{avatar,experiment-image,background-preference,notes-helpers,provider-json,turnstile,external-anchor}.ts` | Config / feature / infra coupled. |
| `shared/seo/*`, `shared/config/*`, `shared/i18n/*` | The site's SEO, config and dictionary (app contract). |
| every `features/*/components/*` | Feature-specific (notes, portfolio, me, education, credentials, contact, subscribe, marks, comments, backgrounds). |
| `experiments-routes/*` | Page routes (list + case pages). |

### delete

None — every inventory item is used.

### Next (after the owner approves)

Each "core now" item becomes its own migration task: move to `packages/core/src/<ui|lib>/`, re-export from `packages/core/src/index.ts`, swap the app import, then run `pnpm depcruise`, `pnpm check:js-budget`, `pnpm test:white-label` and the affected e2e. "core later" items move only when their trigger fires.
