# Minimal appearance preset

## Objective and authorization
Make the site calmer and more minimalist while keeping the modern look, and make the home sections configurable so the owner can switch them on or off by taste. The owner confirmed on 2026-10-01: "minimal configurable", smaller and less loud text, calmer notes. Local implementation and work-unit commits on a feature branch only; push, merge and release are separate decisions (the owner authorized one push of `develop` and remote branch cleanup earlier; that does not extend to this feature).

## Specification (owner-approved direction, defaults are mine)
- Config in `site.config.ts` (white-label, schema-validated, documented by `pnpm docs:config`):
  - `appearance: 'minimal' | 'full'`, default `'minimal'`. `'full'` reproduces today's home and note pages.
  - `home`: optional booleans `heroPills`, `authorCard`, `hiringCard`, `labLog`, `pillars`, `notebookIndex`, `experiments` that override the preset. Preset `minimal`: `heroPills` off, `labLog` off, `pillars` off, the rest on; `experiments` still also needs `features.experiments`. Preset `full`: everything on.
  - A section that is off renders nothing (no empty heading or placeholder); layout closes the gap.
- Type scale driven by the theme, not by scattered classes: `appearance` sets a document attribute and CSS variables for the scale. Minimal targets (owner finds current text too large and loud): hero 32 px phone / 44 px from `md` (pixel face), section titles 20 px, note title 30 px phone / 40 px desktop, card titles 20-22 px, body 17 px at the same line height ratio, meta stays 13 px. `full` keeps today's sizes (hero 36/60, section 24, note 36/54, card 26-28, body 18).
- Calmer home banner in minimal: lower expanded height; the WebGL background and brand motifs stay.
- Banner bottom edge on every page (owner request, 2026-10-01): the home hero blends into the page through a 120 px gradient (`homeFade`), which the owner likes, but on the other pages (notes index, note, `/me`, `/contact`, legal, changelog, 404) navigating between pages shows a hard or inconsistent edge between the animated banner and where the content starts. The same blend must apply on every page that has a banner, in both themes, with no flash during navigation (including the collapsed banner state and reading mode), without changing the home result. Verify with screenshots of each page at 390 and 1440 in dark and light, before and after.
- Calmer note pages in minimal: lower banner, compact decision record (smaller type, tighter padding), reduced header meta (date and reading time; language badge and tags move to the foot), no change to reading mode, TOC, comments or prev/next behavior.
- Constraints: accessibility floor unchanged (44 px targets, contrast AA both themes, no overflow at 360/390/768/1280, reduced motion), JS budget and CLS unchanged, brand tokens and fonts unchanged, `full` is covered by the same tests as today.

## Execution and checks
- Branch: `feat/minimal-appearance-preset` from `develop` (`4b6e618`).
- Route: delegated direct, one Claude writer per unit, parent reviews each diff.
- Strict TDD: enabled (user global config). Runner: `pnpm exec playwright test tests/browser/<spec> --project=chromium-1280` for focused browser checks (add `chromium-360` only for layout tests), `pnpm --filter web test` and `pnpm --filter @elvinlab/core test` for unit tests.
- Tiered verification (owner twice asked for less testing, 2026-10-01): per unit run only the new or changed unit tests, `pnpm typecheck`, `pnpm lint`, `git diff --check`, and at most one focused Playwright spec at `chromium-1280` filtered with `-g` when the behavior cannot be proven at unit level. At feature close the parent runs `pnpm test:e2e` once on the chromium-1280 project only (plus `pnpm --filter web build` and `pnpm test:white-label` because the config schema changes), and skips Lighthouse, `check:js-budget` and `check:dev-cold-start` unless a change touches fonts, scripts or the build graph. The parent spot-checks instead of repeating the writer's runs. Record anything skipped as skipped.
- Autonomy (owner, 2026-10-01): the owner is away and authorized finishing this feature unattended. Scope: complete M1-M3, commit each unit locally, and fast-forward the feature into `develop` locally if it ends green. Not authorized: push, merge into `main`, release, or any remote operation.
- Delivery: ask-on-risk, forecast 450-650 authored lines across three units; the repo has no PR flow (ADR 0012), so the count is recorded only.
- RDD: off (clone-local), unmanaged.

## Work units
- [x] M1 - Config and home sections: schema, preset resolution, home section flags, generated docs, tests for both presets.
  - Evidence: committed with this document update (subject `feat(config): appearance preset and per-section home switches`). 9 tracked files +172/-22 plus `appearance.ts`, `appearance.test.ts`, `home-sections.spec.ts`. Route: delegated (Claude writer, sonnet); parent reviewed the diff.
    - RED then GREEN (writer-observed): config vitest 7 failed / 3 files failed (missing `appearance.ts`) then 69 pass; new browser spec 2 of 6 failed (pills still present) then 6 pass; empty-aside checked by hand against the dev server (before: `<aside>` and the two-column grid still rendered with every card off; after: neither).
    - Parent spot checks: aside renders on `/`, `/me/`, `/notes/` and a note page (TOC present) through the dev server (read-only requests); resolver and schema reviewed by reading.
    - Decisions: schema default `appearance` is `'full'` (forks keep today's look); the repo's `site.config.ts` sets `'minimal'` explicitly and a unit test asserts it. `experiments` also needs `features.experiments`, resolved inside `resolveHome`. `BaseLayout` renders the `aside` slot once and keeps the sidebar only when it produced content (`Astro.slots.has` stays true for a slot whose content renders nothing).
    - Gap: the empty-aside case has no committed automated test (the fixture build copies the real minimal config and the repo has no Astro container test setup).
    - Skipped by owner policy: full `pnpm test`, other Playwright specs, `depcruise`, white-label (optional keys keep the alt config valid).
- [ ] M2 - Theme-driven type scale: minimal and full scales, hero/section/card sizes, tests of computed sizes in both modes.
- [ ] M3 - Calm note pages and banners: consistent bottom blend on every page's banner (see specification), lower banners, compact decision record, reduced meta, tests.

## Progress and next step
Branch and document created. Next: M1. Engram mirror: `odd/minimal-appearance-preset/tasks`.

## Route declaration
M1-M3: delegated direct, one Claude writer per unit; trigger evidence: more than four non-trivial files per unit.
