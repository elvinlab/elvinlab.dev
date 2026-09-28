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
- Runner: Vitest (to be installed in T02); Playwright for e2e (T17). Until T02 lands there is no runner; T01 is configuration and docs only.

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
- [ ] T02 pnpm workspaces, TS strictest, Biome, path aliases. Route: delegated writer (2+ non-trivial files). Check: `pnpm -r typecheck`, `pnpm biome check`.
- [ ] T03 Astro + `@astrojs/cloudflare` + Tailwind v4 placeholder page on a Cloudflare preview; verify `<Image>` on Workers. Route: delegated writer. Check: preview URL loads.
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

## Next step

T02 (#5, Tier 2): finalize the brief, delegate to OpenCode with `TIER2_MODEL`, review the diff.
