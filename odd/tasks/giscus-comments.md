# Giscus comments and reactions (issue #24, T20)

## Objective and authorization
Add Giscus comments and reactions to note pages. The user asked on 2026-10-01 to start Giscus and to have Claude do the work (not delegate to OpenCode). Local work-unit commits on `feat/giscus-comments`; pushing `develop` is allowed by repo policy; releasing to `main` needs a separate request. No change to GitHub repository settings (Discussions, giscus app) without the user.

## Problem and why
`NotePage.astro` renders a placeholder (`0 comments`) where discussion should be. Readers have no way to react or comment. Success criterion of the repo is the blog live with 3 posts, so comments should be ready before the first note ships.

## Scope
- In: optional `giscus` block in site config (white-label), pure helpers, `features/comments` component, wiring in `NotePage`, i18n strings, conditional privacy section, e2e + unit tests, docs.
- Out: custom Giscus theme CSS, comments outside notes, moderation tooling, enabling Discussions or installing the giscus app (user-owned, T4).

## Constraints and decisions
- Inert by default: renders nothing unless `features.comments` is true AND `giscus` config is present (no "0 comments" placeholder, no empty box).
- Lazy: no request to giscus.app until the section nears the viewport (IntersectionObserver). Plain Astro component with a small inline script; no Preact island (ADR 0005), so the 30 KiB JS budget is unaffected.
- Built-in Giscus themes only (`light`/`dark`), synced with `html[data-theme]` through a MutationObserver and `postMessage`. Language follows the page locale. `mapping: pathname`, reactions on.
- No CSP exists on the site (discarded in PLAN.md), so no header changes.
- Do not announce comments publicly (changelog) until they are live end to end (brand rule: do not announce things that do not exist yet).
- Strict TDD: runner Vitest (`mise exec -- pnpm test`) and Playwright (`mise exec -- pnpm test:e2e`); RED observed before each implementation. Source: AGENTS/CLAUDE strict TDD. RDD is off for this clone (disabled/unmanaged).
- Route: inline (parent) by explicit user instruction, overriding the issue's Tier 2 delegation default. Trigger evidence: touches 2+ non-trivial files, so the writer trigger would normally fire.
- Delivery: ask-on-risk; forecast about 300 authored lines (additions + deletions), under the 400 heuristic; no PR requested.

## Tasks
- [x] T1 — Config + pure helpers: optional `giscus` schema (repo `owner/name`, repoId, category, categoryId), `buildGiscusAttributes(config, locale)`, `giscusThemeFor(siteTheme)`; unit tests first.
- [x] T2 — `Comments.astro` lazy loader with theme sync, i18n strings, `NotePage` wiring replacing the placeholder, e2e (fixture override with a stubbed giscus script) and a11y coverage.
- [ ] T3 — Privacy section (ES/EN, only when giscus is configured) with test, plus docs (`docs/DESIGN.md` comments surface, how to enable in `docs/CONVENTIONS.md` or PLAN).
- [ ] T4 — USER-OWNED, blocked: enable GitHub Discussions on `elvinlab/elvinlab.dev`, create an "Announcements"-type category (e.g. "Comments"), install https://github.com/apps/giscus on the repo. Then Claude reads repo/category IDs with `gh api graphql`, fills `giscus` in `site.config.ts`, verifies live, adds the changelog entry and releases on request.

## Acceptance criteria
- With config absent or the flag off: note pages show no comments section and make no giscus request.
- With config present: nothing loads until scroll; then the Giscus iframe appears in the page locale and the right theme; toggling the theme updates the iframe.
- Keyboard and screen-reader access: labelled section, no focus trap; `noscript` fallback links to the GitHub discussion area.
- Privacy page discloses Giscus/GitHub only when configured. White-label build has no owner strings.
- Checks: focused tests, `pnpm test`, `pnpm typecheck`, `pnpm lint`, `pnpm depcruise`, `pnpm --filter web build`, `pnpm check:js-budget`, `pnpm test:white-label`, `pnpm test:e2e`, `git diff --check`.

## Progress and evidence
Exploration done (CodeGraph + targeted reads). Verified: `hasDiscussionsEnabled=false`, 0 discussion categories (so T4 is a real blocker for going live). Repo node id `R_kgDOUvCLAA`.

T1 done: RED observed (missing module, schema without `giscus`), then GREEN 26 tests (schema + helpers); typecheck 0 errors, Biome clean. T2 done: RED observed (8 e2e failing, no `[data-comments]`), then GREEN 24 comments e2e (3 viewports x ES/EN); white-label asserts no section without config; fixture helper `enableFixtureComments` unit-tested (RED then GREEN); Lighthouse notes perf 96-98, CLS 0.023, a11y/SEO/best-practices 100; JS budget all pages PASS. Next step: T3 privacy section + docs.

Engram mirror: `odd/giscus-comments/tasks`.
