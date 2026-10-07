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
