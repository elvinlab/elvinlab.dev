# 0005. Preact for islands

Status: Accepted (amends 0001)

## Context
ADR 0001 chose React for interactive islands, for consistency with the PC guides site. The first real island is the contact form. Measured on a one-button island (2026-09-30): React 19 costs about 69 KiB gzip (renderer chunk 65.6 KiB); Preact about 7.3 KiB. The repo gates mobile Lighthouse and 30 KiB of JavaScript per page, and `check:js-budget` previously ignored island chunks.

## Decision
- **Preact** (`@astrojs/preact`, `preact/hooks`) is the island runtime. Component, hook and JSX syntax match React, so islands stay portable.
- No `preact/compat` until a React-only library is actually needed.
- `check:js-budget` counts `component-url` and `renderer-url` island modules with their imports.
- Islands stay rare and small: server-rendered shell, hydrate with `client:visible` or `client:idle`, load third-party scripts on first interaction.

## Consequences
- Supersedes only the "React" line of 0001; Astro, Tailwind, pnpm and TypeScript decisions stand.
- Lose React's concurrent features and some ecosystem libraries; if one is needed, enable `compat` or revisit this ADR.
- Less code shared with the PC guides site; the syntax is the same, the runtime is not.
