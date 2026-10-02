# Mobile, UX and performance pass

## Objective and authorization
Implement the findings of the 2026-10-01 UI/UX audit (Lighthouse mobile, screenshots at 390/768/1440 in both themes, source review). The user asked to implement every point on 2026-10-01. Local implementation and work-unit commits on a feature branch only; no push, deployment, remote access or real form submission.

Not implemented on purpose: audit point 7 (the hiring card shows "not available" next to a primary CTA). It is a content decision owned by the user (`recruiter.openToWork`), not a defect.

## Direction and evidence
Brand, tokens, fonts and the WebGL banner concept are settled (`docs/DESIGN.md`); only behavior, sizing and loading change. Audit baseline: mobile Lighthouse 96-100 performance, 100 elsewhere; JS 6-17 KiB gzip of 30; home FCP 2.19 s (0.8 score) with 10 font files and no preload; expanded home banner 557 px on a 390 px phone with the canvas hidden on coarse pointers.

## Execution and checks
- Branch: `feat/mobile-ux-performance-pass` from `develop` (`9300b35`), fast-forwarded into `develop` at the end (project workflow, no PR).
- Route: delegated direct, one writer at a time. Mapping and writing span more than four non-trivial files per unit.
- Strict TDD: enabled (user global config). Runner: `pnpm exec playwright test tests/browser/smoke.spec.ts` for browser behavior and `pnpm --filter web test` (Vitest) for pure logic. Each behavior change needs an observed RED before source changes, then GREEN. Pure copy, docs or class-only visual changes still get a measurable browser assertion where one is feasible (tap-target size, overflow, fold position).
- Delivery: ask-on-risk, forecast 300-420 authored changed lines including tests and docs, three work units. Record the running count; if it passes about 400 before a commit, apply the strategy before that commit.
- RDD: see Progress. Delivery stays under ordinary repository policy.
- Required at each unit close: focused Playwright, `pnpm test`, `pnpm typecheck`, `pnpm lint`, `git diff --check`; at feature close add `pnpm test:e2e`, `pnpm --filter web build`, `pnpm check:js-budget`, `pnpm test:white-label`, `pnpm test:lighthouse`, `pnpm depcruise`. Use `rtk proxy` only if compaction garbles output.
- Copy and documentation follow existing language conventions (UI strings through `shared/i18n`, English twin docs updated when their Spanish source changes).

## Work units
- [ ] T1 - Responsive and touch targets
  - Home banner on coarse pointers: shorter expanded height so the latest note starts near the fold (inspect the existing `@media (pointer: coarse)` rule in `Banner.astro` first; keep desktop geometry unchanged).
  - Navbar icon buttons reach 44 x 44 px (`shrink-0`, tighter gap); distinct icon for the background picker versus the theme toggle.
  - Footer links, "all notes" link and the banner expand button reach a 44 px hit area without changing visible layout.
  - Mono meta and chips at least 13 px; note meta segments do not orphan ("5 / min").
- [ ] T2 - Performance and documentation drift
  - Preload the Latin Space Grotesk and JetBrains Mono woff2 files in `BaseLayout`.
  - Avatar through Astro `<Image>` (webp/avif, explicit dimensions) keeping the white-label contract (configured image path, initials fallback).
  - `gl-runner.ts`: resume on visibility only while the banner intersects the viewport.
  - Enable Astro `prefetch` (hover/tap strategy) and make `docs/DESIGN.md` (and its English twin if any) state what the code really does about page transitions; no unrequested View Transitions.
- [ ] T3 - Interaction polish
  - Code-block copy button no longer covers code text on mobile.
  - Mobile menu closes when the navbar auto-hides and the navbar reveals on `focusin`.
  - Remove the duplicate sentence on `/contact` (`features/contact/content.ts`) in both locales.
  - Update `docs/DESIGN.md` for the above and record evidence.

## Progress and next step
Branch created, document written. RDD: off (clone-local), delivery `disabled/unmanaged`; no native review, mode untouched. Engram mirror: `odd/mobile-ux-performance-pass/tasks`. Next: T1.

## Route declaration
T1-T3: delegated direct, one Claude writer per unit; trigger evidence: more than four files to understand and 2+ non-trivial files per unit.
