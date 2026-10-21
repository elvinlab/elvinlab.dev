# 0019. `core` stays tokens, themes and i18n; no component extraction for now

Status: Accepted (2026-10-21)

Builds on: [0003](./0003-screaming-architecture-and-core-boundary.md) (`core` is presentation-only). Nothing there changes; this ADR only decides not to grow `core` yet.

## Context

The plan was to move shared pieces into `@elvinlab/core` and later split it into its own repository, so other people could build a portfolio like `/me` plus a landing and docs page. A read-only review (`odd/tasks/core-extraction-review.md`) listed 12 pieces that qualified (Card, Chip, SocialIcon, SectionHeading, PageHeader, InfoTip, Stamp, `localized.ts`, `listing.ts`, `minify-css.ts`, `inline-mark.ts`, `external-link.ts`) and more that qualified later. Before committing to it, a spike moved three of them (`Card.astro`, `Chip.astro`, `external-link.ts`) into `packages/core` on a throwaway branch.

## Decision

1. **`core` stays as it is today**: tokens, themes and i18n. No component or helper moves into it, and it does not leave the monorepo.
2. **The review stays as a reference** (`odd/tasks/core-extraction-review.md`): the verdict lists say what would move first if a second consumer appears.
3. **The commercial template is dropped too.** Its phase 2 was this extraction (`docs/PLAN.md`, "Decisiones 2026-10-03"), so without it the template has no base. The review, the spike and this ADR are kept as learning, not as a backlog.
4. **The trigger is a real second consumer** that needs a piece, as `docs/PLAN.md` already said. An intention to build one is not enough. The reason to stop now is cost against payoff: other projects are waiting and a library nobody consumes yet pays nothing back.

## What the spike showed

All checks passed with the three pieces in `core`: typecheck, 1790 unit tests, lint, depcruise, build, the 30 KiB JavaScript budget, the white-label build and the full quick e2e run (1099 passed). The move itself is mechanical. What it needs, so any later attempt starts from here:

- **Tailwind v4 does not scan a workspace package.** `apps/web/src/styles/global.css` needs `@source "../../../../packages/core/src";`, or the utility classes of `core` components are never generated.
- **`core` components may not depend on tokens the app defines.** `Chip` uses `text-meta`, declared in the app's `@theme`; it would have to move into `tokens.json` first.
- **Boundary rule.** `pages-are-thin` in `.dependency-cruiser.cjs` only allowed `packages/core/src/index.ts`; deep imports (`ui/`, `lib/`) need the rule widened, or a barrel (which Astro bundles with the CSS of everything it re-exports, see the X2 note in the extraction review).
- **`package.json` exports** need `./ui/*` and `./lib/*`.
- **What the spike did not test**: a second app consuming `core`. That is the real proof, and the only part that cannot be mechanical.

## Consequences

- **What carries over to future projects** is the stack, the development environment and the agentic working pattern of this repository (README "Tecnologías", `.mise.toml`, `odd/tasks/`), not the shared package. That is the owner's own reading of what this experience was worth.
- No work, no new surface and no versioning to maintain; `apps/web` keeps its own copies of these pieces.
- A future fork or second site starts by copying or by reopening the extraction with the list above, not from zero.
- The spike branch was local, never pushed, and was deleted on 2026-10-21. Its code is not kept: the findings above are what it left, and redoing it is a mechanical move of the same three pieces.

## Reverting

Open the extraction again from `odd/tasks/core-extraction-review.md`: pick the first batch, apply the four points above, and validate with a second app before splitting the repository.
