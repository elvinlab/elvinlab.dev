# Project Conventions

This document records the settled conventions for the elvinlab.dev monorepo. It is the reference for code reviews, onboarding, and future decisions. Changes require a new ADR.

---

## Architecture

### Monorepo structure
```
apps/web/          → blog + portfolio (Astro); screaming features/, thin pages/, shared/
packages/core/     → @elvinlab/core: tokens, themes, i18n (presentation-only)
```

### `apps/web` — Screaming architecture
- **features/** — one folder per capability, acts as a feature flag; laid out as `components/`, `lib/`, `schema.ts`, `index.ts`. `index.ts` is the only public API: everything outside the feature imports from it (components too, e.g. `export { default as NoteCard } from './components/NoteCard.astro'`).
- **pages/** — thin Astro routes; they compose feature entry components and pass route params, with no logic of their own.
- **shared/** — cross-feature code; `shared/ui` follows atomic design: atoms → molecules → organisms.

### Imports
- In `apps/web`, cross-folder imports use the `@/` alias (`apps/web/src`, defined once in `tsconfig.json`); `./` only for files in the same folder. Biome `noRestrictedImports` rejects `../`.
- `packages/core` keeps relative imports: its source is consumed directly by the apps, where `@/` means the app's own `src`.
- Biome sorts imports into groups separated by a blank line: `node:`, packages, `@/` aliases, relative paths. Side-effect imports (e.g. CSS) keep their position.

### Boundaries enforced in CI
`pnpm depcruise` (rules in `.dependency-cruiser.cjs`) fails on: import cycles, unresolvable imports, `core` importing the apps, `shared/` importing `features/`, imports into a feature other than its `index.ts`, pages importing anything but feature entry points, `shared/` and `core`, and imports of pages. dependency-cruiser cannot parse `.astro`, so the script first mirrors `apps/web/src` with each `.astro` reduced to its frontmatter and bundled scripts.

### `packages/core` — Presentation-only boundary
- Contains tokens, themes, i18n infrastructure.
- **No `fetch`, no persistence.** Data enters via props, exits via events.
- **Born in the project, moved to `core` when repeated.** Do not design `core` ahead of need.

### White-label by design
Personal data (name, bio, posts, experience, colors, favicon, socials) lives **only** in configuration (`apps/web/src/site.config.ts`) and content collections. The visual system (layout, motion, motifs) stays in code.

### Hexagonal ports/adapters
Only where infrastructure exists (`contact`). No premature abstraction.

---

## Code

| Rule | Detail |
|------|--------|
| TypeScript | Strictest options in `tsconfig.base.json`; pinned to 6.x because `@astrojs/check` supports ^5 \|\| ^6. |
| Modules | ESM only. |
| `any` | Forbidden. |
| Imports | `import type` for types. |
| Exports | No default exports (except where Astro/config requires them). |
| Functions | Small, pure, early returns. |
| Magic values | None — extract to named constants. |
| Documentation | TSDoc **only** on exported APIs and non-obvious *why*. |
| Language | English (code, comments, identifiers, UI copy). |

---

## Styling

| Rule | Detail |
|------|--------|
| Framework | Tailwind v4. |
| Tokens | Semantic CSS variables only (`var(--brand-primary)`, `var(--surface)`). Never raw hex in components. |
| Responsive | Mobile-first. |
| Layout | Container queries where applicable. |

---

## Tooling

| Tool | Rule |
|------|------|
| Biome | Only formatter/linter. `html.experimentalFullSupportEnabled: true` for `.astro` support (experimental since Biome 2.3). |
| Version source of truth | **One source**: `.mise.toml` + `packageManager` in `package.json` (must match). |
| pnpm builds | `allowBuilds` as needed. When pnpm proposes `minimumReleaseAgeExclude`, pin an older mature version instead. |
| Images | Optimized at build time (`imageService: 'compile'`). |

---

## Git

| Aspect | Convention |
|--------|------------|
| Branches | `main` (production), `develop` (staging); routine work is committed directly on `develop` (auto-deploys staging). |
| Commits | Conventional Commits; **no AI attribution**. |
| Integration | Releases are PRs `develop` → `main` (merge commit); `develop` gets direct commits. |
| Release cadence | One release per phase with one review. |

---

## Delivery

| Aspect | Convention |
|--------|------------|
| Issues | Each task is a GitHub issue written as a delegation brief with a Tier (see `.github/ISSUE_TEMPLATE/task.yml`). |
| Tier 1/2 | Delegated to OpenCode via herdr. |
| Tier 3 | Done by Claude Code, which reviews every delegated diff. |
| CI | Required checks on `main` and `develop`. |
| Previews | Every PR gets a preview at `https://pr-<N>-elvinlab-staging.lab-previews.workers.dev`. |

---

## Testing

| Aspect | Convention |
|--------|------------|
| Unit/Integration | **Strict TDD** with Vitest (from T06). |
| E2E | Playwright + axe (implemented in T17). |
| Performance budgets | Lighthouse: mobile ≥95, LCP < 2.5 s, CLS < 0.1, ≤30 KB JS on pages without islands. |

---

## Safety

- **No raw email** in tracked files or HTML (contact goes through `/contact`).
- **Secrets** only in Cloudflare or git-ignored `.dev.vars`.
- **Never name or link private repositories**.
