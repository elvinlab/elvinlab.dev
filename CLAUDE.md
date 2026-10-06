# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Status and commands

Live in production at elvinlab.dev (Astro on Cloudflare Workers, CI and deploy in place). Current work and history: `odd/tasks/elvinlab-site.md` and the GitHub Project (https://github.com/users/elvinlab/projects/2).

Tool versions are pinned in `.mise.toml` (single source of truth; `packageManager` in package.json must match). Run everything through mise:

```bash
mise exec -- pnpm install       # install workspace dependencies
mise exec -- pnpm typecheck     # tsc in every package
mise exec -- pnpm lint          # Biome check (format + lint), read-only
mise exec -- pnpm lint:fix      # Biome check with fixes
mise exec -- pnpm format        # Biome format
mise exec -- pnpm test          # Vitest in every package
mise exec -- pnpm test:e2e      # isolated production-build Playwright smoke checks (3 viewports)
mise exec -- pnpm test:e2e:quick # same checks at 1280 px only; pass a spec path to narrow further
mise exec -- pnpm test:white-label # build with alternate identity; reject owner-string leaks
mise exec -- pnpm check:js-budget # enforce <=30 KiB gzip JavaScript per built page
mise exec -- pnpm test:lighthouse # mobile Lighthouse scores and Core Web Vitals; local reports only
mise exec -- pnpm exec playwright install chromium  # one-time local browser setup
mise exec -- pnpm depcruise     # architecture boundaries (.dependency-cruiser.cjs)
mise exec -- pnpm check:dev-cold-start # cold `astro dev` in an isolated workspace: no blank page or late dependency reload
mise exec -- pnpm docs:config      # regenerate the tables of docs/CONFIGURATION*.md and docs/NOTES*.md and the .env/.dev.vars examples

mise exec -- pnpm --filter web dev          # Astro dev server (workerd runtime)
mise exec -- pnpm --filter web build        # static build into apps/web/dist
mise exec -- pnpm --filter web preview      # serve the build locally on workerd
mise exec -- pnpm --filter web run deploy   # build + wrangler deploy (needs `wrangler login`)
```

Use `pnpm run deploy`, not `pnpm deploy` (that is a built-in pnpm command). Normally you never deploy by hand: work happens directly on `develop` with no CI attached to it (push freely, no wait). Releases are a direct push to `main` (no PR; fast-forward onto a commit built from `develop`'s tree, see Workflow) — that push is the only trigger for CI (`.github/workflows/ci.yml`): gates run once, and if they pass, the same run deploys straight to production (`elvinlab`) and smoke-checks it with `.github/scripts/smoke-check.sh`, rolling back on failure. There is no staging environment and no PR preview deploy (ADR 0011, ADR 0012). `main`'s ruleset no longer requires a passing check before the push lands — a failing gate blocks the deploy, not the push itself, so check the Actions run after pushing to `main`.

pnpm enforces a minimum release age: when it proposes `minimumReleaseAgeExclude` entries, pin an older version instead of accepting them. Images are optimized at build time (`imageService: 'compile'`). dependency-cruiser cannot parse `.astro`, so `depcruise` first mirrors `apps/web/src` into the git-ignored `apps/web/boundaries-mirror/` (`apps/web/scripts/mirror-astro.ts`). Do not invent commands; add them here when they exist.

CI runs the production JavaScript gzip budget, Playwright/a11y/theme checks, white-label build, and mobile Lighthouse budgets on every push to `main`, before that same run deploys. Lighthouse audits an isolated production-build fixture and writes HTML/JSON reports to the ignored `.lighthouseci/` directory; it does not upload reports.

Read `docs/PLAN.md`, `docs/BRAND.md` (both in Spanish; decisions in them are settled), `docs/DESIGN.md`, `docs/CONVENTIONS.md` and `docs/adr/` before any work. To change a setting, secret, dependency or release, follow `docs/CONFIGURATION.md`; to write a note, `docs/NOTES.md` (both have an English twin, `*.en.md`). Their reference tables are generated from the code: after changing a schema or `shared/config/env-vars.ts`, run `pnpm docs:config`.

## What this repo is

- Portfolio at `elvinlab.dev` plus the blog **Lab Notes — by an eternal junior** at `/notes`, and a recruiter page at `/me`.
- The birthplace of `@elvinlab/core`, a shared design base that later moves to its own repo so others can build blogs/landings with this style.
- **White-label by design:** another developer must be able to replace name, bio, posts, experience, colors, favicon and socials through configuration and content only, while the visual style (layout, motion, motifs) stays in code.
- A from-scratch rebuild of the legacy site; reuse only content and ideas, never its components.

## Architecture

```
apps/web/        → blog + portfolio (Astro); screaming features/, thin pages/, shared/
packages/core/   → @elvinlab/core: tokens, themes, i18n (presentation-only)
```

- Stack: TypeScript (strictest options in `tsconfig.base.json`, pinned to 6.x because `@astrojs/check` supports ^5 || ^6), Astro, Tailwind v4, Preact only for real islands (ADR 0005), Biome, Cloudflare Workers.
- **Born in the project, moved to `core` when repeated.** Do not design `core` ahead of need.
- **`core` is presentation-only:** no `fetch`, no persistence. Data in via props, events out.
- **Themeable tokens:** BRAND.md values are the default theme `theme-elvinlab`. Components read semantic variables only, never a raw hex.
- Hexagonal ports/adapters only where infrastructure exists (`contact`). Atomic design only in `core` and `shared/ui`.
- Biome rules that bite: no `any`, `import type` for types, no default exports (except where Astro/config requires them).

## Workflow

- Branches: `main` (production), `develop` (work branch, no CI attached). For routine development, work directly on `develop`; nothing runs on push. Production releases are a direct push to `main` (no PR — ADR 0012). `main` and `develop` have diverged histories, so `git merge develop` conflicts: build the release commit from `develop`'s tree (`git commit-tree develop^{tree} -p main`), fast-forward `main` onto it, confirm `git diff main develop` is empty, then push; the exact steps are in `docs/CONFIGURATION.md` section 7. That push is the only CI run (gates + deploy, in one pass). Conventional Commits, no AI attribution.
- **Changelog stays current:** every visitor-visible or developer-facing change (features, fixes, performance, config, docs for forks, tooling) gets an entry in `apps/web/src/content/changelog.json` in the same work unit that ships it, written in English (ADR 0010). Before each release, compare the `feat`, `fix` and `perf` commits since the previous release with the entries and add what is missing: `git log --reverse --format='%ad %h %s' --date=short <develop SHA of the last release>..develop` (the release commit message ends with `develop: <sha>`; do not use `origin/main..develop`: releases are built with `commit-tree`, so that range also lists everything already published); the entry date is the day it reaches production.
- **Touch-scoped verification (rule):** verify what a change touches and record it; do not run the whole stack after every change. Before running anything, list the touched files and what depends on them (`codegraph affected <files>` finds unit tests; it does NOT see page-level specs, so use the impact map in `docs/TESTING.md` for e2e, budgets and Lighthouse). "Test" means every kind of check: unit, types, lint, build, depcruise, docs:config, e2e, a11y, budgets, Lighthouse, white-label, cold start. A check whose scope was untouched since its last green entry in `odd/verification-ledger.md` is not re-run; if the change touches that scope, it is re-run, never trusted. Full-wide changes (dependencies, toolchain, astro/vite/tailwind/wrangler/tsconfig/biome/playwright/lighthouse config, `fixture-workspace.ts`, the verification scripts) run the whole stack once; layout-wide changes (global CSS, `shared/layout/**`, i18n structure) run a cheaper subset (everything at 1280 px, two Lighthouse URLs, 1 run locally; CI keeps 3 runs and every threshold). Timings: `odd/verification-timings.md`. Record every run and every skip in the task tracker and the ledger; report a skipped check as "not re-run: untouched since <sha>", never as verified. Delegated writers run only the checks the parent lists. A release runs what the ledger shows stale; CI on `main` runs the whole stack once more. The rule is a command: `pnpm verify` prints the plan for the uncommitted work (dry run), `--run` executes it, `--run --record` stores what passed in `odd/verification-state.json`, `--stale` plans what changed since the last green run. Details: `docs/TESTING.md`, section "Touch-scoped verification".
- Every task is a GitHub issue written as a delegation brief with a Tier (see `.github/ISSUE_TEMPLATE/task.yml`): Tier 1/2 are delegated to OpenCode via herdr; Tier 3 is done by Claude Code, which reviews every delegated diff.

## Brand and safety rules that affect code

- Fonts: Space Grotesk + JetBrains Mono, self-hosted via Fontsource; never a runtime CDN.
- Every animation must stop under `prefers-reduced-motion`.
- Brand changes go to `docs/BRAND.md` first, then to each surface.
- Don't announce projects that don't exist yet; never name or link private repositories.
- Never write the raw email address in tracked files or HTML (public repo, scrapers); contact goes through `/contact`.
- Secrets only in Cloudflare or git-ignored `.dev.vars`.

## Success criterion

Blog live with 3 posts within 6 weeks. If time goes into polishing `core` with nothing published, flag it — that is the identified risk.

<!-- rtk-instructions v2 -->
# Command output

Command output here is condensed to save tokens, keeping every signal and
dropping costly noise. Treat it as the complete result: run commands
normally, and batch related commands into one call to avoid extra turns.
Truncated results state their recovery path in their own output. Re-run a
command as `rtk proxy <cmd>` only when its result is unusable: empty when
output was clearly expected, contradicting its exit code, or garbled.
<!-- /rtk-instructions -->
## Shared agent instructions

See [`AGENTS.md`](AGENTS.md) for repository-local Caveman and RTK guidance.
