# Home visual refinement

## Objective and authorization
Implement the user-approved calmer home design: blend the animated hero into the page, remove navbar/home cursor blinking, reuse the footer wordmark typography, display the configured author photo, and simplify the hiring card. Local development and work-unit commits only; no push, PR, deployment, or remote access.

## Problem and scope
The hero ends abruptly; repeated blinking competes with the animated background; the home author card ignores the avatar; a narrow hiring card crowds its heading and repeats employment context.
Preserve themes, ES/EN, reduced motion, banner expansion persistence, author fallback, hiring visibility, profile feature gating and optional CV. Do not change recruiter availability business configuration or unrelated pages' motion.

## Execution
- Route: delegated direct. Mapping requires more than four files; implementation involves multiple non-trivial components.
- Strict TDD: enabled by user-provided AGENTS.md. Runner: `pnpm test:e2e -- tests/browser/smoke.spec.ts`; observe RED before source changes, then GREEN and refactor.
- Delivery strategy: ask-on-risk. Forecast: 200–300 authored added/deleted lines. Ask before a next commit if actual authored changes exceed about 400 lines. No planned PR.
- RDD: off, decided by clone-local configuration; delivery disabled/unmanaged. Do not start native review or change the switch.
- Branch: `feat/home-visual-refinement`; initial boundary `0408797`.

## Tasks
- [x] T1 — Refine home hero, branding, author and hiring surfaces as one coherent visual work unit, with regression proof and a Conventional Commit.
  - Acceptance: approximately 120px home-only bottom fade; static pink accents replacing navbar/home blinking; small Press Start 2P wordmark with readable main title; configured photo with initials fallback; uncrowded hiring title/state, no duplicate employment row, primary profile action and secondary CV link.
  - Checks: focused browser RED/GREEN; `pnpm test`, `pnpm typecheck`, `pnpm lint`, `pnpm --filter web build`, `pnpm test:e2e`; desktop/mobile visual inspection, themes/locales and banner toggle. Targeted source normalization precedes final checks.
  - Evidence: work-unit commit `96c185b` (`feat(home): refine hero branding and sidebar cards`); 75 additions + 31 deletions = 106 authored implementation/test lines. Focused regressions observed RED before implementation and the navbar correction, then GREEN 6/6 (ES/EN at 360, 768, 1280). Full unit tests passed 347/347; full E2E passed 147/147; typecheck, lint and actual-site build passed. Targeted normalization preceded final checks. RTK mangled ordinary typecheck output; `rtk proxy pnpm typecheck` resolved it and exited 0. `rtk proxy pnpm lint` passed.
  - Independent verification: native risk assessment unavailable/unassessable because of the untracked feature document; treated as high, not downgraded. RDD remains off/disabled-unmanaged. Fresh verifier reran `pnpm exec playwright test tests/browser/smoke.spec.ts --grep 'keeps the refined home identity'`: 6/6 passed, no actionable findings. Parent spot-check `git diff --check` passed and parent inspected mobile/desktop screenshots.
  - Runtime evidence: eight actual-site ES/EN, 360/1280, light/dark screenshots captured and inspected under `/tmp/home-visual-refinement/`. Local dev server stopped. No failed, skipped or pending functional checks remain.
  - Rollback boundary: new visual styles, avatar rendering and hiring presentation plus their focused tests; preserve existing controls/configuration.

## Progress and next step
Implementation and verification complete. The home-only fade avoids altering other banner callers; retro type stays on the small navbar wordmark and the main title retains Space Grotesk. Hiring presentation removes duplicate employment context without changing business configuration. The existing square author-card footprint now displays the configured avatar with initials fallback.

Next step: user visual acceptance; push and deployment were not requested and were not performed. Memory mirror is synchronized after this document update.
