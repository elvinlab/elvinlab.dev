# 0001. Astro + Tailwind v4 + React islands, pnpm workspace

Status: Accepted (React line amended by [0005](./0005-preact-for-islands.md))

## Context
Need a stack for the blog/portfolio rebuild that matches the rest of elvinlab (PC guides site uses Astro + React islands + Tailwind) and supports a monorepo with an internal shared package (`@elvinlab/core`).

## Decision
- **Astro** for static content, SSR islands only where interactivity is real.
- **React** only for real islands (no blanket SPA).
- **Tailwind v4** with CSS variables for theming.
- **pnpm workspace**: `apps/web` + `packages/core`.
- **TypeScript 6.x** (pinned) because `@astrojs/check` supports ^5 || ^6.

## Consequences
- No Vue (intentional break from BUO daily stack).
- `core` stays internal (no npm publish, no semver, no changelog) until extraction.
- Strict TS config in `tsconfig.base.json` shared across workspace.
