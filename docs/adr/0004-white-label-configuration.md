# 0004. White-label via config + data collections + theme file

Status: Accepted

## Context
Another developer must be able to replace name, bio, posts, experience, colors, favicon, and socials through configuration and content only, while the visual style (layout, motion, motifs) stays in code.

## Decision
- **`site.config.ts`** with Zod schema — single source for personal data, socials, site metadata.
- **Content collections** (Astro) for posts, experience, projects — no hardcoded data in components.
- **One theme source** (`packages/core/src/tokens/tokens.json`, compiled to CSS vars in `tokens.css` by `packages/core/scripts/build-tokens.ts`) — all brand colors, typography, radii, motion tokens.
- **Build-time verification**: a test build with a sample profile must find **no owner-specific strings** in the output (grep for "elvinlab", "Elvin", personal emails, etc.).

## Consequences
- Components read only semantic CSS variables (`var(--brand-primary)`, `var(--surface)`).
- Zero personal data in component defaults or fallbacks.
- Extraction of `core` to its own repo keeps this contract intact.
