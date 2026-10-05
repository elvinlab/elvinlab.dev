# Feature: `features.blog = false` really turns the blog off

## Objective
A fork can keep only the portfolio. With `features.blog: false` the build must not emit the notes routes, the RSS feed or sitemap entries for notes. elvinlab.dev keeps `blog: true`: its production output must stay identical.

## Why
Fixture builds on 2026-10-05 (see `odd/tasks/elvinlab-site.md`, "Result 2026-10-05") showed that `blog: false` only hid links. `/notes/`, note pages, `/en/notes/...` and `rss.xml` were still built, indexable and in the sitemap. Needed for the commercial template plan (`docs/PLAN.md`, "Decisiones 2026-10-03"), issue #77.

## Design
Files under `src/pages` cannot be skipped conditionally. Move the four blog routes (`pages/notes/index.astro`, `pages/notes/[slug].astro`, `pages/en/notes/[slug].astro`, `pages/rss.xml.ts`) out of `src/pages` and register them with Astro's `injectRoute` from a small integration that does so only when `site.features.blog` is true. The sitemap filter also hides notes URLs when the flag is off (defense in depth, pure function, unit-tested).

## Authorized scope
Local work on `develop`. No push, no release. Production config unchanged.

## Tasks
- [x] T1 Pure `blogRoutes(enabled)` list plus the integration, unit-tested first (RED then GREEN); move the four route files; wire in `astro.config.ts`.
  - Evidence: RED (blog-routes module missing), GREEN `vitest run src/integrations` 63 passed; routes moved to `src/blog-routes/`, `blogRoutesIntegration` in `astro.config.ts`.
- [x] T2 Sitemap filter hides `/notes/`, `/notes/*`, `/en/notes/*` when `blog` is off (unit test first).
  - Evidence: RED on new sitemap-filter case, GREEN with the `blog` check in `isHiddenFromSitemap`.
- [x] T3 Verify: production-config build page list and sitemap identical before and after; blog-off fixture has no notes routes, no `rss.xml`, no notes in the sitemap; `me`-off unaffected; typecheck, lint, unit, depcruise.
  - Evidence: typecheck/lint/depcruise clean; real-site dist file list (49) and sitemap `<loc>` list (16) identical before/after; blog-off fixture 13 pages, 0 notes pages, no rss.xml, 0 notes in sitemap; me-off 17 pages with notes. (Unit run was focused `src/integrations` only.)
- [x] T4 Docs: `docs/CONFIGURATION*.md` (`features.blog` description), `docs/PLAN.md`, this file, changelog entry (developer-facing), issue #77.

## Acceptance
Both fixtures build. Blog off: zero notes routes, no RSS, no notes in the sitemap. Blog on: identical to today.

## Route and checks
Delegated direct (one writer: 2+ non-trivial files). TDD applicable (pure functions, Vitest). Heavy checks (full e2e, Lighthouse) only once at close; focused checks per task (owner asked for a light loop).

## Progress
Created 2026-10-05. T1-T3 delegated to one writer, then spot-checked by the parent (10 focused tests green, git diff reviewed). T4 done by the parent: `docs/CONFIGURATION*.md` blog row, changelog entry `blog-feature-flag` (dated 2026-10-05; move the date if it reaches production later), `docs/PLAN.md`, `odd/tasks/elvinlab-site.md`, issue #77. NOT run: full unit suite, e2e, Lighthouse, js-budget (owner asked for a light loop; run once before the next release). Not pushed, not released.
