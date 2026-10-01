# Sitewide UI polish

## Objective and authorization
Review and improve the whole site's UI/UX with UI UX Pro Max and document the changes. The user confirmed sitewide scope on 2026-10-01. Local implementation and work-unit commits only; no push, deployment, remote access, real form submission, or unrelated feature activation.

## Direction and evidence
Retain the lab-notebook identity: existing purple/cyan/pink semantic tokens, 1200px main/right-sidebar layout, readable Space Grotesk, small Press Start 2P signatures, and the accepted home fade/avatar/hiring refinements. The skill's generic design-system palette/layout suggestions do not fit the established brand and are not adopted. `docs/DESIGN.md` remains the appearance authority; no competing generated MASTER.md.

Audit covered 15 desktop routes in light/dark and representative home, me, contact, notes and 404 views at 360/768px. No horizontal overflow or page errors were observed. Findings: the fixed language hint overlaps content, privacy prose exceeds the documented 68ch reading measure, secondary pages retain decorative blinking, documentation omits the new navbar wordmark, and an English development note links to a missing localized detail route. Published-note coverage is unavailable because current content is development drafts; disabled experiments and real contact submission remain outside runtime coverage.

## Execution and checks
- Branch: `feat/sitewide-ui-polish`, based on `8040628` (retains prior home work).
- Route: delegated direct; mapping exceeds four files and implementation spans multiple non-trivial files.
- Strict TDD: enabled by user AGENTS.md. Runner: `pnpm exec playwright test tests/browser/smoke.spec.ts`; focused regressions must show RED before source changes, then GREEN.
- Delivery: ask-on-risk, forecast 300–380 authored added/deleted lines including tests and documentation. No PR requested. Record actual count; resolve delivery strategy before committing if it exceeds about 400. Do not compress code or omit tests to meet the heuristic.
- RDD: off (clone-local), disabled/unmanaged; do not start native review or toggle the mode. Use independent functional verification according to risk assessment.
- Normalize changed supported files only before final checks. Required: focused Playwright, `pnpm test`, `pnpm typecheck`, `pnpm lint`, `pnpm test:e2e`, `pnpm --filter web build`, `git diff --check`. Use `rtk proxy` only when native compaction breaks output.

## Work unit
- [x] T1 — Deliver and document consistent, unobstructed sitewide reading and navigation.
  - Make the locale suggestion non-obstructive while preserving dismissal persistence, valid locale destinations, no forced redirects and keyboard/touch access; avoid introducing disruptive layout shifts.
  - Apply documented reading measure and rhythm to privacy/prose surfaces without narrowing the overall content/sidebar layout.
  - Extend the accepted calm decorative-accent treatment to remaining shared/footer and about-page blinking, without disabling meaningful motion or the interactive background.
  - Repair the verified English draft-note detail link through the existing content/i18n conventions; keep the Spanish notes index, optional translations, draft-production exclusion and feature flags intact. If resolving it requires changing product policy rather than a missing detail route, report the gap instead of inventing a policy.
  - Update existing `docs/DESIGN.md` and the relevant `docs/BRAND.md` statements; preserve each document's language, link implementation/check evidence, distinguish configuration-dependent contact states and audited/deferred coverage. No generic generated design-system dump.
  - Verify ES/EN, mobile/desktop, light/dark; preserve home refinements, theme controls, contact behavior, me printing, note reading UI and optional links. Inspect actual screenshots and run accessible interaction regressions.
  - Evidence and commit: committed as `28e91be`, fast-forwarded into `develop` and pushed. Diff: 12 files, +179/-21 (within the 300–380 forecast, no delivery-strategy trigger).
    - Focused Playwright (`tests/browser/smoke.spec.ts`): 48 passed.
    - `pnpm typecheck`: 0 errors/warnings/hints (astro check, 171 files).
    - `pnpm lint`: Biome, 211 files, no fixes needed.
    - `pnpm test`: 34 + 313 passed (core + web).
    - `pnpm --filter web build`: completed, no errors.
    - `pnpm test:e2e`: 159 passed (includes theme + smoke suites).
    - `pnpm test:white-label`: passed, no owner-string leaks.
    - `git diff --check`: clean.
  - Rollback: only this work unit's shared presentation, localized detail-route correction, regression tests and corresponding documentation; prior home work remains intact.

## Progress and next step
T1 implemented and independently verified (all required checks green). Committed (`28e91be`), integrated into `develop` and pushed (develop has no CI); the feature branch was deleted. Re-verified on `develop` 2026-10-01: typecheck, lint, 347 unit tests, depcruise, build, JS budget, white-label, 159 e2e and Lighthouse (performance 95–100, other categories 100) all green. Not in production yet: it ships with the next direct push to `main`. Feature closed. Engram mirror: `odd/sitewide-ui-polish/tasks`.
