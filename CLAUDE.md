# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Status

Planning phase — there is no code, package manager, build, lint, or test setup yet. Do not invent commands; add them here once the scaffold exists.

Read `docs/PLAN.md` (vision, scope, rules, success criteria) and `docs/BRAND.md` (narrative and design tokens) before any work. Both are written in Spanish; decisions in them are settled starting points, not suggestions to re-validate.

## What this repo is

- Portfolio at `elvinlab.dev` plus the blog **Lab Notes — by an eternal junior** at `/notes` (`/notes/<slug>` per post; `/devlog` reserved). The home page shows the latest 3 posts.
- The birthplace of `@elvinlab/core`, a shared design base that later moves to its own repo so others can build blogs/landings with this style.
- A from-scratch rebuild of the current live site (repo `portfolio-legacy`, Astro). Reuse only its content (bio, experience, bilingual copy) and i18n logic; discard its visual layer and component architecture. Fix on the way: missing accents, outdated experience count (5+ years since 2020), stock project images (use real screenshots).

## Planned architecture

```
apps/web/       → blog + portfolio
packages/core/  → @elvinlab/core, shared design base (internal, unpublished)
```

- `core` contains only, from day one: design tokens (CSS variables), dark/light theme system, i18n infrastructure. Nothing else.
- **Born in the project, moved to `core` when repeated.** Every component starts in `apps/web` and moves to `core` only when a second real project needs it. Do not design `core` ahead of need.
- **`core` is presentation-only:** no `fetch`, no persistence. Data in via props, events out.
- **Themeable tokens:** BRAND.md values are the default theme `theme-elvinlab`, replaceable in one file. Components read semantic variables only (`var(--brand-primary)`, `var(--surface)`), never a raw hex.
- `packages/core/tokens.json` will be the single source of truth: a build script generates `tokens.css` (`:root` and `[data-theme="light"]`), and the GitHub profile generators (`tools/` in repo `elvinlab/elvinlab`) read it from `main`. Changing token names/shape affects that external consumer.
- No npm publishing, semver, or changelog while `core` lives here.

## Brand rules that affect code

- Fonts: Space Grotesk + JetBrains Mono, self-hosted via Fontsource; never a runtime CDN.
- Every animation must stop under `prefers-reduced-motion`.
- Brand changes go to `docs/BRAND.md` first, then to each surface.
- Don't announce projects that don't exist yet; never name or link private repositories.
- Never write the raw email address in tracked files or HTML (public repo, scrapers); contact goes through `/contact`.

## Out of scope

Comment backend/moderation, a standalone published component library, and features of other elvinlab projects.

## Open decisions (resolve before scaffolding)

Tracked in `docs/PLAN.md` → "Preguntas abiertas": post language, stack confirmation (likely Astro + React islands + Tailwind, Vue avoided on purpose), spacing scale, full monorepo vs. starting with `src/core/`, light border color (`#c9c3ee` vs `#d8d0f5`). Do not scaffold until the stack is explicitly confirmed.

## Success criterion

Blog live with 3 posts within 6 weeks. If time goes into polishing `core` with nothing published, flag it — that is the identified risk.
