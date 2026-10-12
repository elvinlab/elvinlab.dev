# Reconcile repository and GitHub state

## Objective

Bring documentation, local task trackers, repository issues and GitHub Project 2 up to date with verified implementation and release evidence.

## Scope and constraints

- Authorized: passive documentation corrections and updates to existing issues in `elvinlab/elvinlab.dev` using authenticated `gh`; inspect user `elvinlab` Project 2.
- No source behavior changes, deletions, push, merge, deployment, database operations or mail sends.
- Preserve historical evidence; distinguish current state, historical measurements and unobserved manual checks.
- Keep genuinely unfinished work open. Project statuses already agree with all 21 open issues.
- RDD is off at clone and global scope. No review lifecycle is requested or started.
- Technical documents retain their existing language; synchronize English/Spanish twins.

## Delivery strategy

`ask-on-risk`; forecast 250–350 authored changed lines excluding generated files. Reassess actual count before committing; ask once if it exceeds approximately 400 lines.
Feature branch: `docs/reconcile-repo-and-github` from `4b94342`.

## Tasks

- [x] D1 — Correct documentation and stale local trackers against current code and release evidence.
  - Route: delegated direct; preparation reading and multiple non-trivial documentation files.
  - Acceptance: Preact 11, note-fixture 0.93/2600 ms exception, current worker/retry configuration and provider boundaries documented; historical checks are not fabricated; stale release steps reconciled; ADR numbering conflict removed.
  - Checks: `git diff --check`; `mise exec -- pnpm --filter web exec vitest run scripts/docs-quality.test.ts scripts/config-docs.test.ts`; structural and bilingual readback.
  - Test-first exception: passive documentation, no meaningful behavior RED; existing documentation checks provide proportional proof.
  - Runtime scenario: N/A — no runtime behavior changes.
  - Rollback boundary: documentation/task-tracker commit only.
  - Commit: `ae019bd` — `docs: reconcile guides and task trackers with released state` (186 authored changed lines including this tracker).
- [x] D2 — Reconcile existing issue briefs and verify project consistency.
  - Route: delegated direct; authenticated GitHub context and nine issue updates.
  - Targets: issue bodies #63, #64, #69, #70, #77, #85, #89, #119; title #124 T83 to T85.
  - Acceptance: preserve unresolved scope and issue state; preserve relevant historical material; update only evidence-backed stale claims; read back every mutation; project remains consistent with open issues.
  - Checks: authenticated GitHub issue/project readback, no blind mutation retry on uncertain outcome.
  - Runtime scenario: existing GitHub issue edits, not application runtime.
  - Rollback boundary: recorded prior issue values; tracker closure commit.
  - Commit: tracker closure follows `ae019bd`; remote mutation records are #892–900 with aggregate readback #901.

## Evidence and progress

- Initial local worktree clean on `develop` at `4b94342`.
- Live GitHub main `ce5bdeb1c8263751249592941607c306b42bc2ce` matches the local HEAD tree.
- CI run https://github.com/elvinlab/elvinlab.dev/actions/runs/38322066089 completed successfully, including deploy. This is existing CI evidence, not a new local run.
- Project 2 has 90 items: 69 Done, 21 Todo, none In Progress. All 21 open issues match Todo; no status changes are justified.
- Issue #81 has explicit release `d440d6b` evidence; #80 is a delivered umbrella with independent backlog retained.
- PR #117 is closed; replacement #123 remains open against develop without Satori. PR #115 remains open. No PR changes planned.
- D1: 19 existing Markdown files corrected; 130 authored changed lines (87 additions, 43 deletions). Writer and independent verifier each observed `git diff --check` pass and 41 passing tests across `docs-quality.test.ts` and `config-docs.test.ts`. Parent structurally read back the diff; the independent rerun was the requested command spot check.
- Native risk assessment was unassessable/high because the new tracker was untracked. An independent verifier was therefore used; it found no substantive discrepancies. RDD remains off; no native review was started.
- D2 remote work completed and read back: bodies #63/#64/#69/#70/#77/#85/#89/#119 corrected; #124 title changed from T83 to T85. All remain open. Original title/body rollback records are Engram observations 881–889; aggregate completion evidence is #901.
- Project inventory is unchanged and correct; #124 title propagates automatically. Parent independently read back #124 and all project status counts. No status edits, closures or comments were needed.
- Engram mirror: initial write and full readback completed (#878); mirror uses this same locator/topic and is updated at task closure.

## Next step

Reconciliation is complete. Feature branch remains local; no push, PR, merge or deployment was performed. Next implementation should use current issue briefs and preserve unfinished work, including manual SQL with no individual execution evidence.
