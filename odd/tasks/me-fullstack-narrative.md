# Feature: `/me` full-stack narrative ("from data to screen")

## Objective

Make `/me` read as a full-stack engineer with database, backend, frontend, cloud and AI experience, not as a frontend profile. One coherent thread across the hero, the at-a-glance strip, the strengths, the stack and the experience timeline.

## Problem / why

Owner feedback 2026-10-08: the page leans on frontend. Evidence read from code: the headline says "full-stack, con enfoque en frontend"; the pitch opens with "interfaces"; the strengths cover architecture, AI and frontend performance only; the stack lists Frontend first and the "personal projects" group is all frontend; Buo's summary opens with the Vue interfaces and the timeline tags are mostly UI frameworks. The data and backend work (SQL Server, MySQL, MongoDB, ETL to S3, Java/Spring, .NET, Node) exists in the texts but is buried.

## Thread

"Del dato a la pantalla" (from data to screen): Data, Backend, Frontend, Cloud, with AI across all of them. Every layer states one claim backed by work already published in the site (no invented experience). Cloudflare (Workers, D1, Turnstile) is shown as "in use and learning" on this very site, not as professional experience. Backend or database optimization is NOT claimed: the owner has not confirmed any real case.

## Scope

- `apps/web/src/site.config.ts` (`me` block): headline, pitch, facts, strengths, stack groups and order.
- `apps/web/src/content/experience.json`: summary order and tags per role.
- `apps/web/src/features/me/lib/tag-label.ts` (+ test): labels for the new tags.
- `apps/web/src/shared/ui/SocialIcon.astro`: a `database` icon.
- `apps/web/src/shared/config/schema.ts` (+ test, `docs:config`, `docs/PORTFOLIO*.md`): optional `me.stack[].layer` flag so layers are configuration, not hardcoded indexes (white-label).
- `StackGroup.astro` (new) and the `me.stack.layers` i18n key.
- `apps/web/src/features/me/components/MeSidebar.astro`: layered stack (vertical spine joining the groups).
- Changelog entry in `apps/web/src/content/changelog.json`.

## Constraints

- English-only technical artifacts are NOT the rule here: this is site copy, authored in both locales (ES default, EN twin), same as the rest of `/me`.
- No raw email, no private repos, no invented experience.
- Touch-scoped verification (CLAUDE.md): unit tests for touched code, typecheck, lint, build, `/me` e2e and a11y, `docs:config` only if a schema changes (none planned), no full battery (owner prefers light local checks).
- Stays on `develop`; no push, no release without explicit owner authorization.

## Tasks

- [x] **M1** Copy: headline, pitch, facts, strengths, stack groups and order in `site.config.ts`; `experience.json` summaries and tags; tag labels with their test. Route: inline (copy decided with the owner in this conversation, edits are small and mechanical once decided; briefing a worker would cost more than writing it).
- [x] **M2** Visual: `database` icon and the layered stack in `MeSidebar.astro`. Route: inline (one component plus one icon).
- [x] **M3** Changelog entry, tracker evidence, commits. Route: inline.

## Authorized scope

M1 to M3 on `develop`, local commits only. Push and release stay the owner's decision.

## Acceptance criteria

- No mention of "enfoque en frontend" / "frontend focus" as the identity of the page.
- Hero, facts, strengths, stack and timeline use the same layer vocabulary.
- Data and backend appear before frontend in the stack and in each role's tags where it applies.
- Cloudflare appears in Cloud (and D1 in Data) marked as learning/in use on this site.
- `/me` and `/en/me` build; unit, typecheck, lint and the `/me` e2e pass.

## Progress and evidence

2026-10-08, local on `develop`, not pushed. RED observed for `tagLabel('sql'|'etl')` and for `me.stack[].layer` before the code. Checks run (touched scope only, owner prefers light): biome (2 style fixes applied), typecheck 0 errors, depcruise clean, `docs:config` no drift after regeneration, vitest related 12 files / 241 tests pass, build, `check:js-budget` and `check:page-weight` PASS (26 pages), `test:white-label` PASS, e2e at 1280 px: me-hero-tips, me-experience-locale, a11y, type-scale, cv-and-credentials, smoke pass (the hero test pinned the old headline and was updated). One `/contact/` axe failure appeared once and passed 4/4 on rerun (page untouched: intermittent). Visual check of `/me/` at 1280 px by screenshot: layers 01 to 04 with the vertical rail, AI, quality and personal projects below.
Not re-run: Lighthouse (`/me/` margin is thin, issue #87: a real `/me/` Lighthouse run is advised before the release), the 3-viewport e2e, the mobile view of the new rail (only 1280 px seen).
Follow-up check 2026-10-08 (parent): mobile 390 px screenshot of the layered stack looks clean and has no horizontal overflow; local mobile Lighthouse (1 run) `/me/` 98, LCP 2272 ms, `/en/me/` 97, LCP 2418 ms, CLS 0, no assertion failed against the 2500 ms gate (thin margin, issue #87; one local run, CI does 3).
Route record: all three tasks inline, no delegation trigger worth firing (copy already decided, small edits).
Not claimed: any backend or database optimization experience (owner has not confirmed a real case).

## Next step

Owner review of the copy; release only on explicit authorization (CI runs Lighthouse with 3 runs; `/en/me/` has the thinnest margin).
