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
- [ ] T04 CI (Biome, typecheck, test, build) as required checks; Cloudflare `main` → production, `develop` → staging, PR → preview. Route: delegated writer. Check: green Action + three URLs.
- [ ] T05 `docs/CONVENTIONS.md`, `docs/DESIGN.md` (design brief v3), first ADRs, accessible token variants in `docs/BRAND.md`. Route: delegated writer. Check: structural readback.
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
- 2026-09-27: T03 done (#6). Route: inline (Tier 3). Astro 7.3.5, `@astrojs/cloudflare` 14.3.3 with `imageService: 'compile'` (Sharp at build time; default `cloudflare-binding` would use Cloudflare Images), Tailwind 4.3.3 via `@tailwindcss/vite`, `@astrojs/check` 0.9.10, wrangler 4.142.0. `pnpm-workspace.yaml` `allowBuilds` limited to esbuild and workerd. Biome override allows default exports in `.astro` and `astro.config.*` (review follow-up from #6). Checks: `pnpm --filter web build` (WebP generated at build), `astro check` 0 errors, `pnpm lint` clean, local `astro preview` on workerd 200 + `image/webp`. Deployed with `wrangler deploy` as a static-assets-only Worker: https://elvinlab-dev.lab-previews.workers.dev → 200, image `image/webp` with `max-age=31536000, immutable`. workers.dev subdomain set to `lab-previews` (the auto-created one exposed the email handle). TDD: not applicable (scaffold only). Commit `ca3b11d` + tracker commit.

## Next step

T04 (#7, Tier 3): CI (Biome, typecheck, build as required checks) and Cloudflare environments (main → production, develop → staging, PR → preview) with Workers Builds or wrangler in Actions.
