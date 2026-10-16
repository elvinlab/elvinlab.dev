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
- [x] **T1 — Topic pages scale by listed notes** (route: inline; trigger: verification script and one component, Tier 3). `topicNoteCount` + `data-topic-notes` marker, `topic` budget with `htmlBytesPerNote` 800 and `maxHtmlBytes` 120000, tests, changelog entry. Commit 2bce379.
- [x] **T2 — Show the room left** (route: inline). Report line and `publish-note` output telling how many more notes each scaled type fits; warning (not failure) under 5. RED observed (6 failing: `notesRoom` missing), then 55/55 GREEN; typecheck 0 errors; a real build prints `Room left: notes-index +15 notes, topic +43 notes`.
- [x] **T3 — Guard test and docs** (route: inline). A test over the real `page-weight-budget.json` that every listing type declares an allowance and a ceiling; TESTING.md section on how a page type grows and how to add a listing type (the ADR for both pieces comes with piece 2). RED observed (4 failing: constants missing), then 60/60 GREEN; typecheck and lint exit 0 (checked by exit code, after an earlier `| tail` masked a lint failure).
- [x] **T4 — Noisy-gate policy** (route: inline). Retry once and report flakes (Playwright and Lighthouse) in the run summary; document which gates may retry.
- [x] **T5 — Issue for the `/me/` CLS** (route: inline; remote write, authorized by the owner with the plan). Issue #124 (T83) created with labels type:chore, area:web, tier:3 and added to the project; one hypothesis corrected after creation (the font-swap flake was a test race, not a real shift). One GitHub issue written as a delegation brief with evidence.

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

- Whole stack once, after piece 1: `pnpm verify --stale --run --record` green, 12 of 12 checks (lint, typecheck, depcruise, docs:config, unit, build, js-budget, page-weight, white-label, cold start, 43 e2e specs, Lighthouse on 11 URLs), 367 s, recorded in `odd/verification-state.json`. The axe failure on `/en/contact/` did not recur.
- Commits (local, not pushed): 2bce379 (T1), fd348c5 (T2), 69ee568 (T3). Review assessment: not run (RDD tier unassessed for these local commits; recorded as unavailable, not as low).

- Piece 1 released as 653abb7 (full CI green on the first run, deploy 41 s). Note 009 then published alone with `pnpm publish-note`: 15 s from command to push, CI 89 s (static 42, notes-gate 27, deploy 34; e2e and lighthouse skipped) against 325 s for the previous full run (73 % less). The size budgets accepted the note: `Room left: notes-index +14 notes, topic +43 notes`. Note updated with the measured results and released as 99ece45 through the fast lane again: CI 115 s (deploy 1 min). Production serves 99ece45; the note, its share card and its 3 images answer 200.
- Two fast-lane samples so far: 89 s and 115 s. The note says "one sample of each"; it can be refreshed with the second one in a later edit.
- T4 (noisy-gate policy, not pushed): Playwright `retries: 1` in CI, one automatic Lighthouse re-run of a failed URL (`run-lighthouse-ci.ts` reads `.lighthouseci/assertion-results.json` and re-runs only the failed URLs), flakes listed in the run summary (`list-flaky.ts` for Playwright, `.lighthouseci/flaky.md` for Lighthouse), ADR 0018, `CI` registered in `env-vars.ts` and `docs:config` regenerated. Full-wide verification: `pnpm verify --run --record` green, 12 of 12 checks, 390 s, recorded 94 checks in `odd/verification-state.json`; `actionlint` clean.

## Next step
T4 is code-complete on `develop` (unreleased). Releasing to `main` runs the full CI once (`static`, `e2e`, `lighthouse`, `checks`) and deploys; that is where the retry policy first takes effect. Needs the owner go-ahead for the release. T5 (issue #124 for the `/me/` CLS) is already done.
