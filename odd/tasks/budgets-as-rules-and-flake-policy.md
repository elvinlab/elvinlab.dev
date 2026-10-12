# Budgets as rules, and a policy for noisy gates

## Objective
Stop patching gates one page type at a time: content growth must never break a budget by surprise, and a noisy measurement must not block a release or hide silently.

## Problem and Why
Publishing note 009 was stopped by the page-weight budget of a topic page (+718 B), the same class of bug already patched for the notes index (#112, #113). Budgets are "measured value rounded up to 100 B" (`/me` has 32 B of headroom, `result` 45 B), so any growth means raising a number by hand. Separately, noisy gates blocked the release run: Lighthouse `/me/` CLS 0.31 in 1 of 3 runs (pessimistic aggregation, passed on rerun) and axe `color-contrast: .hover:bg-button/90` on `/en/contact/` in 1 of 812 e2e (passed 2/2 on rerun), plus the earlier font-swap race. Owner asked for a lasting, scalable fix, not more patches.

## Scope
- Piece 1 (T1-T3): page types that list content scale by what they list, the remaining room is visible before it runs out, and a guard test keeps the pattern from regressing.
- Piece 2 (T4-T5): a policy for noisy gates (one automatic retry, flake recorded in the run summary, never silent) and a GitHub issue to investigate the `/me/` CLS.
- Then publish Note 009 with `pnpm publish-note` (separate, authorized by the owner).
- Out of scope: paginating `/notes/` (only made visible here), changing CSS/JS budgets, redesigning Lighthouse thresholds.

## Constraints
- Tier 3, inline. No Engram mirror of this file (project CLAUDE.md); decisions go to `mem_save`.
- Keep strict what protects LCP: CSS (`styleBytes`) and the fixed HTML shell. Only content-driven bytes scale.
- Work on `develop`; no push or release without the owner's explicit authorization each time.
- Test-first where a runner exists (`pnpm --filter web test`). Whole stack once at the end of piece 1 (verification scripts changed: full-wide).
- About 400 changed lines per task is a planning heuristic only.

## Design decisions
- Listing types that grow with notes: `notes-index` (rows, already scaled), `topic` (rows, marker `data-topic-notes` on `TopicPage`; no change to `NoteIndexRow`, which home and `/me` also render and `/me` has 32 B of room), and `note` (article body, already scaled). `/me` shows only 3 notes and the home list is bounded, so they stay fixed.
- A scaled budget is: fixed shell + per-note allowance, with an absolute ceiling that forces pagination. The report shows how many more notes fit ("room") so the limit is visible before it blocks a publish.
- Noisy gates: Playwright `retries: 1` in CI and one automatic Lighthouse re-run of a failed URL; a test that passes on retry is reported as flaky in the job summary, not hidden. Deterministic gates (typecheck, unit, budgets, build) never retry.

## Tasks
- [ ] **T1 — Topic pages scale by listed notes** (route: inline; trigger: verification script and one component, Tier 3). `topicNoteCount` + `data-topic-notes` marker, `topic` budget with `htmlBytesPerNote` 800 and `maxHtmlBytes` 120000, tests, changelog entry. Already written and verified in the working tree; to be committed.
- [ ] **T2 — Show the room left** (route: inline). Report line and `publish-note` output telling how many more notes each scaled type fits; warning (not failure) under 5.
- [ ] **T3 — Guard test and docs** (route: inline). A test over the real `page-weight-budget.json` that every listing type declares an allowance and a ceiling; TESTING.md and ADR note on "how to add a listing page type".
- [ ] **T4 — Noisy-gate policy** (route: inline). Retry once and report flakes (Playwright and Lighthouse) in the run summary; document which gates may retry.
- [ ] **T5 — Issue for the `/me/` CLS** (route: inline; remote write, authorized by the owner with the plan). One GitHub issue written as a delegation brief with evidence.

## Acceptance Criteria
- Adding a note to any topic or to the index never fails a budget while room remains; the report says how much room.
- The guard test fails if a new listing type has a fixed budget.
- A flaky pass is visible in the run summary; a deterministic failure is still immediate.
- `pnpm verify --run --record` is green once, and `pnpm publish-note <slug> --dry-run` still works.

## Applicable checks
`pnpm --filter web test` (touched scripts), `pnpm typecheck`, `pnpm lint`, `pnpm check:page-weight` after a build, `pnpm changelog:audit`; full stack once at the end (`pnpm verify --run --record`); `actionlint` for workflow changes.

## Progress and evidence
- Done before this file existed (T1 content): RED observed on the topic-marker test, then 49/49 GREEN in `page-weight-budget.test.ts`; `pnpm typecheck` 0 errors after fixing an `exactOptionalPropertyTypes` error that `pnpm verify` caught; budgets pass on a real build (topic pages 84025/84200, 83348/83400, 84816/85000 with 5 notes).
- First full `pnpm verify --run`: 811 of 812 e2e passed; the one failure (axe on `/en/contact/`, dark) passed 2/2 on rerun, so it is intermittent and unrelated to this change. Not recorded in the ledger because that run was not green.

## Next step
Commit T1, then T2.
