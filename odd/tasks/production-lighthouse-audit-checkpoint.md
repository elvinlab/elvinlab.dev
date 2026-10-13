# Record the partial production Lighthouse audit

## Objective

Preserve the verified production audit results and the owner's decision to stop pursuing exhaustive perfect scores while feature development continues.

## Scope and constraints

- Documentation and task trackers only; no application behavior, thresholds, dependency, browser or CI configuration changes.
- Work directly on `develop`, as explicitly requested by the owner; no new branch.
- No new audits, deployment, push, GitHub mutations, database/email operations or automatic audit resume.
- Distinguish completed Navigation coverage from incomplete interactive coverage and historical CI evidence.
- Preserve actual unresolved performance/accessibility work; stopped work is not completed work.
- Existing verification and budgets remain unchanged. Technical artifacts use their established language.

## Tasks

- [x] A1 — Document measured coverage, limitations and the stopped audit; reconcile current workflow and tracker status.
  - Route: delegated direct; multiple documentation files and preparation reading.
  - Acceptance: 74 completed Navigation reports and 192 partial interaction reports are stated accurately; 266 total, not the planned 378; no complete all-mode 100 claim; intentional noindex exception preserved; mobile shortfall and non-scoring label finding remain pending.
  - Acceptance: no automatic continuation; feature-scoped existing verification remains applicable; prior documentation-reconciliation publication is no longer described as pending.
  - Checks: `git diff --check`; `mise exec -- pnpm --filter web exec vitest run scripts/docs-quality.test.ts scripts/config-docs.test.ts`; structural readback and independent command spot check.
  - Test-first exception: passive documentation has no meaningful behavioral RED.
  - Runtime scenario: N/A — no runtime behavior changes.
  - Rollback boundary: this documentation-only work-unit commit.
  - Commit: `5c8f239` — `docs: record partial Lighthouse audit and feature-first decision` (93 authored changed lines).

## Verified evidence

- Audited production revision: `ce5bdeb1c8263751249592941607c306b42bc2ce`.
- Temporary tooling: Lighthouse 13.4.1, Chromium 152, Node 24.21; user PDF used Chromium 155. Versions are not identical.
- 37 public HTML routes, both devices: 74 Navigation reports. Desktop performance 100 on 37/37; mobile performance 95–100, with 26/37 at 100. ES Experiments was 95 with LCP 2838 ms.
- Navigation accessibility, best practices and Agentic Browsing: 100 on all 74 reports. SEO: 100 on 66/74; four intentional noindex subscription token-state pages score 66 on both devices. Do not remove noindex to force a score.
- Stop checkpoint: 192 interaction reports spanning 78 journey IDs with some results. Do not claim all 78 journeys completed. Combined report count: 266 of 378 planned; remaining coverage was stopped by the owner.
- A non-scoring `label-content-name-mismatch` finding concerns the visible language label and accessible name in `Navbar.astro`; accessibility 100 does not establish every check passed. No source fix was made.
- The earlier 96 versus 100 homepage experiments changed browser-launch defaults/harness; source causality remains unproven. No font/animation optimization is established by those experiments.
- Temporary reports are under `/tmp/elvinlab-lighthouse13-audit-20261012/`; they are not committed assets and may disappear. Engram preserves the checkpoint and decisions.
- Owner stopped the audit and prioritized features. All owned audit processes were terminated; no automatic continuation.
- Earlier documentation reconciliation was pushed to `develop` at `79215f4`; no merge to main or deployment was performed by that push.

## Delivery strategy

`ask-on-risk`; forecast 150–250 authored changed lines, generated files excluded. One documentation work unit, on `develop`; commit locally after proof. Push requires explicit authorization for this new commit.

## Progress

- A1 documentation updates are implemented locally across this checkpoint, `docs/TESTING.md`, and the site, LCP-margin and reconciliation trackers. Existing CI/touch-scoped policy and unfinished issue #119 are preserved; no source or configuration changed.
- Writer verified existing artifact counts by JSONL readback: 74 Navigation reports, 192 interaction reports, 78 distinct journey IDs with results; mobile 95–100 (26/37 at 100), desktop 100 (37/37), SEO 66/74 at 100 and 8/74 at 66.
- Writer checks: `git diff --check` passed; `mise exec -- pnpm --filter web exec vitest run scripts/docs-quality.test.ts scripts/config-docs.test.ts` passed (2 files, 41 tests). Structural Markdown readback passed.
- No new Lighthouse, browser, full build or E2E runs: passive documentation-only scope, no runtime changes. Existing production CI evidence was not rerun or relabeled as new proof.
- Parent structural readback and independent command spot check passed: `git diff --cached --check` and the same 41 documentation tests. Native assessment classified the five Markdown files as passive; RDD remains off. Local commit identity follows below; new checkpoint publication remains unauthorized.
- Engram mirror: initial write/readback completed (#924); full-document closure mirror uses the same topic and locator.

## Next step

Resume feature work when the next feature is specified, without resuming the stopped audit. No push or deployment is performed by this documentation closure.
