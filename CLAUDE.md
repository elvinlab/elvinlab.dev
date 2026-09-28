# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Status and commands

Foundation phase. The pnpm workspace exists; Astro, CI and deploy land in T03–T04. Current work and history: `odd/tasks/elvinlab-site.md` and the GitHub Project (https://github.com/users/elvinlab/projects/2).

Tool versions are pinned in `.mise.toml` (single source of truth; `packageManager` in package.json must match). Run everything through mise:

```bash
mise exec -- pnpm install       # install workspace dependencies
mise exec -- pnpm typecheck     # tsc in every package
mise exec -- pnpm lint          # Biome check (format + lint), read-only
mise exec -- pnpm lint:fix      # Biome check with fixes
mise exec -- pnpm format        # Biome format
mise exec -- pnpm test          # Vitest in every package
mise exec -- pnpm depcruise     # architecture boundaries (.dependency-cruiser.cjs)

mise exec -- pnpm --filter web dev          # Astro dev server (workerd runtime)
mise exec -- pnpm --filter web build        # static build into apps/web/dist
mise exec -- pnpm --filter web preview      # serve the build locally on workerd
mise exec -- pnpm --filter web run deploy   # build + wrangler deploy (needs `wrangler login`)
```

Use `pnpm run deploy`, not `pnpm deploy` (that is a built-in pnpm command). Normally you never deploy by hand: CI (`.github/workflows/ci.yml`) runs `checks` (required on `main` and `develop`), gives every PR a preview at `https://pr-<N>-elvinlab-dev-staging.lab-previews.workers.dev`, deploys `develop` to staging (`elvinlab-dev-staging`) and `main` to production (`elvinlab-dev`), and smoke-checks each deploy with `.github/scripts/smoke-check.sh`.

pnpm enforces a minimum release age: when it proposes `minimumReleaseAgeExclude` entries, pin an older version instead of accepting them. Images are optimized at build time (`imageService: 'compile'`). dependency-cruiser cannot parse `.astro`, so `depcruise` first mirrors `apps/web/src` into the git-ignored `apps/web/boundaries-mirror/` (`apps/web/scripts/mirror-astro.ts`). Do not invent commands; add them here when they exist.

Read `docs/PLAN.md`, `docs/BRAND.md` (both in Spanish; decisions in them are settled), `docs/DESIGN.md`, `docs/CONVENTIONS.md` and `docs/adr/` before any work.

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

- Stack: TypeScript (strictest options in `tsconfig.base.json`, pinned to 6.x because `@astrojs/check` supports ^5 || ^6), Astro, Tailwind v4, React only for real islands, Biome, Cloudflare Workers.
- **Born in the project, moved to `core` when repeated.** Do not design `core` ahead of need.
- **`core` is presentation-only:** no `fetch`, no persistence. Data in via props, events out.
- **Themeable tokens:** BRAND.md values are the default theme `theme-elvinlab`. Components read semantic variables only, never a raw hex.
- Hexagonal ports/adapters only where infrastructure exists (`contact`). Atomic design only in `core` and `shared/ui`.
- Biome rules that bite: no `any`, `import type` for types, no default exports (except where Astro/config requires them).

## Workflow

- Branches: `main` (production), `develop` (staging); work on `feat/*`, `fix/*`, `docs/*`, `chore/*` from `develop` and open a PR. Conventional Commits, no AI attribution.
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
