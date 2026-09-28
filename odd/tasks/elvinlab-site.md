# Feature: elvinlab.dev — portfolio + Lab Notes

Locator: `odd/tasks/elvinlab-site.md` · Engram mirror: `odd/elvinlab-site/tasks`

## Objective

Rebuild elvinlab.dev from scratch as a portfolio plus the blog "Lab Notes — by an eternal junior", and incubate `@elvinlab/core` (tokens, themes, i18n).

## Problem and why

The legacy site works but is being rebuilt on purpose to build the habit of asking, per component, "blog or shared base?". Success = 3 posts published in 6 weeks; the known risk is polishing architecture instead of publishing.

## Scope

Approved plan: `~/.claude/plans/ok-me-gusta-entonces-starry-truffle.md`. Design: canvas https://claude.ai/artifact/9xzGdZD1e7cvoKsvrgCvTi (page "v3 — Lab notebook"). Sources of truth: `docs/PLAN.md`, `docs/BRAND.md`.

## Constraints

- TypeScript strictest, Astro, Tailwind v4, React only for real islands, pnpm monorepo (`apps/web`, `packages/core`), Biome, Cloudflare Workers.
- Screaming `features/`, hexagonal only in `contact`, atomic design only in `core` and `shared/ui`, boundaries enforced by dependency-cruiser.
- Mobile first, WCAG AA, Lighthouse ≥95 (mobile), ≤30 KB JS on pages without islands.
- Branches: `main` (production), `develop` (staging), `feat/*` · `fix/*` · `docs/*` · `chore/*` from `develop`. Conventional Commits, no AI attribution.
- Never expose the raw email address or private repository names in the public repo.

## TDD

- Mode: strict (source: user/session configuration "Strict TDD Mode: enabled").
- Runner: Vitest (installed in T06, first task with runtime logic); Playwright for e2e (T17). T01–T05 are configuration and docs only.

## Delivery

- Strategy: `ask-on-risk` (default). Forecast: well above 400 authored lines across the feature → chained PRs per phase.
- Slice boundaries are recorded per task below.

## Project management

- GitHub Project: https://github.com/users/elvinlab/projects/2 — fields Status, Phase, Size, Priority, Tier.
- One issue per task (issue numbers below), milestones per phase with due dates, labels `type:*`, `area:*`, `tier:*`. PRs close their issue (`Closes #n`).
- Tiers follow https://github.com/elvinlab/agentic-dev-setup: Tier 1/2 delegated to OpenCode via herdr (`TIER1_MODEL`/`TIER2_MODEL` from `~/.config/agent-routing/active.env`), Tier 3 by Claude Code, Human = written by Elvin. Claude reviews every delegated diff. Issue bodies are delegation briefs, finalized right before delegating.
- Issue map: T00 #3, T01 #4, T02 #5, T03 #6, T04 #7, T05 #8, T06 #9, T07 #10, T08 #11, T09 #12, T10 #13, T11 #14, T12 #15, T13 #16, T14 #17, T15 #18, T16 #19, T17 #20, T24 (/me) #21, T18 #22, T19 #23, T20 #24, T21 #25, T22 #26, Note 001 #27, Note 002 #28, Note 003 #29. (T23 "publish 3 posts" is split into the three note issues.)

## Tasks

- [x] T00 Design preview (Phase 0). Route: inline. Evidence: canvas v8, v3 approved by the user.
- [x] T01 Repo safety: scrub raw email and private repo name from history (rewrite the single commit while private), `.gitignore`, `develop` branch, rulesets on `main`/`develop`, secret scanning + push protection, Dependabot, `SECURITY.md`, then make the repo public. Route: inline (config and docs, mechanical). Check: `rg` finds no email/private names in tracked files and history; `gh api` shows rulesets and visibility.
- [x] T02 pnpm workspaces, TS strictest, Biome, path aliases. Route: delegated writer (2+ non-trivial files). Check: `pnpm -r typecheck`, `pnpm biome check`.
- [x] T03 Astro + `@astrojs/cloudflare` + Tailwind v4 placeholder page on a Cloudflare preview; verify `<Image>` on Workers. Route: delegated writer. Check: preview URL loads.
- [x] T04 CI (Biome, typecheck, test, build) as required checks; Cloudflare `main` → production, `develop` → staging, PR → preview. Route: inline (Tier 3, re-tiered from delegated). Check: green Action + three URLs.
- [x] T05 `docs/CONVENTIONS.md`, `docs/DESIGN.md` (design brief v3), first ADRs, accessible token variants in `docs/BRAND.md`. Route: delegated writer. Check: structural readback.
- [ ] T06–T23 as in the approved plan (core, content, interactivity, launch).

## Acceptance criteria (feature)

Blog live on elvinlab.dev with 3 posts, `/me`, `/contact`, both themes and both languages, all CI budgets green.

## Progress and evidence

- 2026-09-27: T00 done. Canvas https://claude.ai/artifact/9xzGdZD1e7cvoKsvrgCvTi v8.
- 2026-09-27: T01 in progress. History rewritten while private (commit `07d3247`, force-push once, authorized by the user); `git grep` over all history finds no email or private repo names. `develop` created. Branch `chore/repo-safety`: commits `47c9c46` (safety baseline), `c95d770` (CLAUDE.md + tracker). PR #1 into `develop`. Review: assessed high (SECURITY.md), user declined review for this candidate. Pending: merge PR #1, rulesets, secret scanning + push protection, private vulnerability reporting, make public, GitHub Project (needs `gh auth refresh -s project`).
- Plan fix: linear history only on `develop`; `main` allows merge commits for releases.

- 2026-09-27: T01 done. PR #1 squash-merged into `develop` (`dca878f`). Repo public. Rulesets active: `protect-main` (PR required, no deletion, no force-push) and `protect-develop` (same + linear history); required status checks added in T04. Rebase merges off, branches auto-deleted on merge. Secret scanning + push protection, private vulnerability reporting, Dependabot alerts and security updates enabled (verified via `gh api`). Rulesets only apply to public repos on the free plan, so they were created after going public.

- 2026-09-27: GitHub Project #2 created with 27 issues, 6 milestones, labels and a Tier field (1 trivial, 8 bounded, 15 complex, 3 human). Issue template `.github/ISSUE_TEMPLATE/task.yml` added. herdr, OpenCode and Ollama present; active profile: cloud.

- 2026-09-27: T02 done (#5). Route: delegated to OpenCode via herdr (`omniroute/elvinlabCode`, pane w8:p2); brief in the issue. Claude review: all 10 files match the brief; fixed a missing final newline in `pnpm-workspace.yaml` and migrated `biome.json` to the 2.5 `preset` key (`biome migrate`). Checks re-run by Claude: `pnpm install --frozen-lockfile` ok, `pnpm typecheck` ok, `pnpm lint` ok, negative check (`any` fails `noExplicitAny`) ok. TDD: not applicable (configuration only, no runtime behavior; Vitest arrives in T06). Commits `3483771` (mise pin), `2cfb079` (workspace). Native review: medium, granted, lens reliability, approved and acknowledged; advisory findings: `preset` key (refuted with the migrate + lint evidence) and no CI proof (covered by T04 #7). TypeScript pinned to 6.0.3 because `@astrojs/check` peer is ^5 || ^6.

- 2026-09-27: Release PR #32 (develop → main, merge commit) moved the review baseline forward. Working agreement: one review per task PR, tracker committed before the review, advisory follow-ups recorded on issues.
- 2026-09-27: T03 done (#6). Route: inline (Tier 3). Astro 7.3.5, `@astrojs/cloudflare` 14.3.3 with `imageService: 'compile'` (Sharp at build time; default `cloudflare-binding` would use Cloudflare Images), Tailwind 4.3.3 via `@tailwindcss/vite`, `@astrojs/check` 0.9.10, wrangler 4.141.0 (pinned for supply-chain stability per pnpm release-age policy). `pnpm-workspace.yaml` `allowBuilds` limited to esbuild and workerd. Biome override allows default exports in `.astro` and `astro.config.*` (review follow-up from #6). Checks: `pnpm --filter web build` (WebP generated at build), `astro check` 0 errors, `pnpm lint` clean, local `astro preview` on workerd 200 + `image/webp`. Deployed with `wrangler deploy` as a static-assets-only Worker: https://elvinlab-dev.lab-previews.workers.dev → 200, image `image/webp` with `max-age=31536000, immutable`. workers.dev subdomain set to `lab-previews` (the auto-created one exposed the email handle). TDD: not applicable (scaffold only). Commit `ca3b11d` + tracker commit.

- 2026-09-28: T04 done (#7). Route: inline (Tier 3). Decision: GitHub Actions + wrangler over Workers Builds (config as code, one pipeline, free on public repos). `ci.yml` jobs `checks` / `preview` / `deploy`, actions pinned by SHA; `smoke-check.sh` (200 + HTML, immutable cache per asset type, `image/webp`). Environments `production` (main only), `staging` (develop only), `preview`; variable `CLOUDFLARE_ACCOUNT_ID`, secret `CLOUDFLARE_API_TOKEN` (set by the user). Staging Worker bootstrapped once with `wrangler deploy --name elvinlab-dev-staging` (preview uploads need an existing Worker). First run (PR #35, run 36377739264): checks ✅, preview ✅ https://pr-35-elvinlab-dev-staging.lab-previews.workers.dev (smoke ✅, sticky comment ✅). Rulesets now require `checks` on `main` and `develop`. T03 review follow-ups resolved: `sharp` explicit (0.35.4, workspace override), CI asserts WebP + immutable cache, `compatibility_date` 2026-09-25 matches workerd 1.20260925. Supply chain: pnpm release-age policy kept without exclusions (wrangler pinned to 4.141.0). actionlint + shellcheck clean. Commits `6b7dfb0`, `e18112e` + tracker commit.

- 2026-09-28: T04b (#36). Route: delegated to OpenCode (`elvinlabCode`), reviewed by Claude. Build writes the commit SHA to `version.txt`; smoke check retries until `/version.txt` serves the expected SHA (proves the new build is live), retries asset HEADs, fails when no `/_astro/` asset is referenced, named retry budget; deploy rolls back with `wrangler rollback` when the smoke check fails; comment lookup paginates; production Worker name in `env`; preview token exposure documented. Claude fixes on top of the agent: rollback step had no Cloudflare credentials or `apps/web` working directory, SHA check only waited for 200 (not for the new SHA), missing final newlines; one smoke-check regression of mine (a `git checkout` reverted the file) was restored and re-tested. Dependabot PR #33 (TypeScript 7) closed; Dependabot now ignores TypeScript majors until `@astrojs/check` supports 7. Checks: actionlint + shellcheck clean; local preview smoke test passes with the right SHA and fails with a wrong one.

- 2026-09-28: T05 (#8). `docs/DESIGN.md` written by Claude from the approved v3 brief (Engram `elvinlab-dev/design-brief`; the session scratchpad copy was lost on resume). `docs/CONVENTIONS.md` and ADRs 0001–0004 delegated to OpenCode (`elvinlabCode`); the agent skipped the BRAND.md and CLAUDE.md edits, which Claude did. Claude review fixes: ADR 0002 rollback description, `pages/` wording in CONVENTIONS, final newlines. BRAND.md: accessible variants table, Press Start 2P row, mono role. Checks: `pnpm lint` clean, no email addresses in docs.

- 2026-09-28: Phase 1 released (PR #39, develop → main): first automatic production deploy verified by SHA (`3f7a92a`) at https://elvinlab-dev.lab-previews.workers.dev. The user skipped the end-of-phase review.
- 2026-09-28: T06 (#9). Route: inline (Tier 3). TDD: RED observed (module missing), GREEN 8/8 Vitest tests. `packages/core/src/tokens/`: `tokens.json` (source of truth: two themes with identical semantic colors, radii, fonts), Zod `parseTokens` (themes must share the default theme's colors, kebab-case names, known default theme), pure `renderTokensCss` → Tailwind `@theme inline` mapping to `--ui-*` runtime vars, default theme on `:root` + `[data-theme]` per theme. `pnpm --filter @elvinlab/core tokens` regenerates `tokens.css`; a test fails if it drifts. `apps/web` imports `DEFAULT_THEME` from core (typecheck proves the workspace link) and uses `bg-page`, `text-text`, `font-display`, `rounded-inner`. CI runs `pnpm test`. Deps: vitest 5.0.2, zod 4.6.5, @types/node 24 (all past the release-age cutoff).

- 2026-09-28: Workflow change (user): PRs skipped during early development; commit straight to `develop` (ruleset keeps no-deletion, no force-push, linear history). `main` still requires a PR and `checks`.
- 2026-09-28: T07 (#10). Route: inline (Tier 3). TDD: RED (module missing) → GREEN 15/15. `packages/core/src/themes/`: pure self-contained `resolveTheme` (stored theme if still available → theme matching the system scheme, default first → default) and `buildThemeBootScript` (inlines `resolveTheme` source; storage/matchMedia failures fall back safely). Core exports `THEMES`, `THEME_BOOT_SCRIPT`, `THEME_STORAGE_KEY`. Web: `<script is:inline>` pre-paint in `<head>` (no flash), `shared/ui/ThemeToggle.astro` (vanilla, cycles N themes, persists choice, suppresses transitions for one frame, scheme icon, 44 px target, `active:scale-96`). Playwright no-flash test deferred to T17 (runner not installed yet).

- 2026-09-28: T08 (#11). Route: inline (Tier 3). TDD: RED → GREEN 25/25 (typecheck caught a locale inference bug that tests did not; fixed by inferring locales from the dictionaries). Core: typed `createTranslator` (keys from the default dictionary, per-key fallback, `{param}` interpolation) and path helpers `localeFromPath`, `localizePath`, `switchLocale`. Web: Astro i18n routing (`en` at root, `es` under `/es`, `prefixDefaultLocale: false`), `shared/i18n` dictionaries, `ComingSoon` shared by `/` and `/es/` with `lang`, canonical and a language link. Biome `useLiteralKeys` off (conflicts with `noPropertyAccessFromIndexSignature`).

- 2026-09-28: Locale direction changed by the user: Spanish is the default at `/`, English optional under `/en/`. Browser-language detection implemented SEO-safely: no redirect; `suggestLocale` (TDD, 4 tests, 29 total) drives a dismissible, fixed-position `LanguageHint` (no CLS). Pages emit `hreflang` for both locales plus `x-default` → Spanish. Biome `useLiteralKeys` off.

- 2026-09-28: T09 (#12). Route: inline (Tier 3). TDD: RED (module missing) → GREEN; web gets Vitest (8 tests). `apps/web/site.config.ts` holds identity, locales, socials and feature flags (`blog`, `comments`, `contact`, `credentials`, `experiments`); `shared/config/schema.ts` validates it with Zod (https-only URLs, so no `mailto:`; default locale must be supported; localized texts need the default locale and only supported locales). `shared/config` parses on import and exposes `site` + `isEnabled`; `astro.config.ts` reads `site.url` and locales from it. Verified: a config with `default: 'fr'` fails `astro build` with a readable error. Build-level white-label check (swap profile, grep HTML for owner strings) moves to T17 with Playwright, once real pages render the config.

- 2026-09-28: T10 (#13). Route: inline (Tier 3: the brief's tool is blind to `.astro`, a design decision). dependency-cruiser 18.3.1 cannot parse `.astro` (only vue/svelte), so `apps/web/scripts/mirror-astro.ts` mirrors `src` into git-ignored `apps/web/boundaries-mirror/` with each `.astro` as `.astro.ts` (frontmatter + bundled scripts). Biome `noRestrictedImports` was rejected: it matches import strings, so relative cross-feature imports slip through. Rules: no-circular, no-unresolvable, core-is-standalone, shared-below-features, feature-public-api, no-cross-feature-internals, pages-are-thin, pages-are-leaves. Verified: a deliberate violation per rule fails `pnpm depcruise`; clean tree passes. CI runs it after lint. CONVENTIONS fixed: `index.ts` is the only public API of a feature. Gotcha: depcruise needs an absolute tsconfig path (TypeScript finds no inputs with a relative one).

- 2026-09-28: Imports (user request). Route: inline. Single alias `@/*` → `apps/web/src/*` (replaces `@features/*`, `@shared/*`, which Biome sorts as npm scoped packages). `site.config.ts` moved to `apps/web/src/`. Biome `noRestrictedImports` bans `../` in `apps/web`; `organizeImports` groups node / packages / aliases / paths with blank lines. `core` keeps relative imports. Vitest uses a plain config with Vite 8 `resolve.tsconfigPaths` (Astro's `getViteConfig` boots the Cloudflare adapter and fails). Verified: lint, typecheck, 37 tests, depcruise (still catches violations through the alias), build.

## Next step

T11 (#14): base layout, `shared/ui` atoms, `<Seo>`, footer with retro signature, 404.
