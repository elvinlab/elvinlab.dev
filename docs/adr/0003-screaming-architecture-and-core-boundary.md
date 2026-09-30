# 0003. Screaming architecture, core presentation-only boundary

Status: Accepted

## Context
The monorepo needs clear boundaries: features must be independently togglable (feature flags), `core` must stay presentation-only so any project can consume it without coupling to a backend, and the dependency direction must be enforceable.

## Decision
- **Screaming architecture** in `apps/web`: `features/<capability>/` folders = feature flags. Public API per feature: `components/`, `lib/`, `schema.ts`, `index.ts` only.
- **Thin `pages/`** — only composition and data fetching.
- **`shared/ui`** — atomic design (atoms → molecules → organisms) for cross-feature UI.
- **`packages/core`** — presentation-only: tokens, themes, i18n. **No `fetch`, no persistence.** Data in via props, events out.
- **Dependency rule**: `apps/web` → `packages/core` only. Reverse forbidden.
- **Enforcement**: `dependency-cruiser` (configured in `.dependency-cruiser.cjs`, implemented in T10) blocks violations in CI.

## Consequences
- `core` never couples consumers to a backend.
- Feature folders make scope visible; toggling a feature = deleting its folder.
- `dependency-cruiser` config will be the authoritative guard.
