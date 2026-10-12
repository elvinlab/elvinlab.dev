# Publish a note in one command, with a notes-only CI fast lane

## Objective
Publishing a Lab Note must be one command (`pnpm publish-note <slug>`) and a few minutes of CI, not nine manual steps plus the whole gate stack.

## Problem and Why
A note is an MDX file in the repo, so publishing means a release to `main`, which runs every gate (static, 4 e2e shards, 2 lighthouse shards, white-label) before the deploy. The owner finds this too slow and tedious for a text-only change.

## Scope
- T1: `publish-note` command (pure helpers + thin CLI), `pnpm publish-note`.
- T2: notes-only fast lane in `.github/workflows/ci.yml`.
- T3: docs (NOTES, CONFIGURATION, both languages), ADR 0013, CLAUDE.md command list, changelog entry.
- Out of scope: CMS or database for notes, scheduled publishing, newsletter send (`notify:note` stays manual).

## Constraints
- Tier 3 (release + CI touch production): done inline by Claude Code. No Engram mirror (project CLAUDE.md overrides the global protocol); this file is the source of truth.
- Work directly on `develop`; no push, no release from this session without explicit authorization.
- The fast lane keeps the `checks` aggregate name, the budgets (JS, page weight) and the deploy smoke-check/rollback.
- Test-first where a deterministic runner exists (`pnpm --filter web test`, vitest); CI YAML and docs get structural checks instead.
- About 400 authored changed lines per task is a planning heuristic only. Forecast for the feature: ~450.

## Design decisions
- `publish-note <slug>` runs: preconditions (on `develop`, clean tree, draft exists) -> move draft to `content/notes/` -> set `pubDate` to the local date -> add the `note-NNN` changelog entry -> `pnpm --filter web build` (the only validator of frontmatter and `translationOf`) -> `changelog:stamp` -> commit `feat(notes): publish "<title>"` -> `changelog:audit` -> push `develop` -> release to `main` (commit-tree from develop's tree, push `SHA:main`, no local checkout of `main`).
- Running the command is the owner's authorization to push and release. `--dry-run` prints the plan and changes nothing; `--no-release` stops after the local commit.
- Fast lane: a `changes` job asks the GitHub compare API for the files in the push; `notes_only` is true when every path is under `apps/web/src/content/notes/` or is `changelog.json` / `releases.json`. Then `e2e` and `lighthouse` are skipped (a skipped need passes `checks`), and a `notes-gate` job runs build + `check:js-budget` + `check:page-weight`. Anything else, an unknown `before`, or 300+ files keeps the full stack.

## Tasks
- [x] **T1 — `publish-note` command** (route: inline; trigger: new script with git/release logic, Tier 3, tests beside it). Pure module `publish-note-plan.ts` + test, thin CLI `publish-note.ts`, wiring in both `package.json` files. Commit 657b4ca. RED observed (module missing), then 10/10 GREEN; `pnpm typecheck` 0 errors, `pnpm lint` clean. Review assessment: not run (RDD tier not assessed for this local tooling commit; recorded as unavailable, not as low).
- [x] **T2 — Notes-only CI fast lane** (route: inline; trigger: production workflow, Tier 3). `changes` job, `if` on `e2e`/`lighthouse`, `notes-gate` job, `checks` needs updated. Exception to test-first: YAML has no runnable RED; checked with `actionlint` (clean) and the path rule exercised with GNU grep on six inputs (note+changelog and note+image: notes-only; note+css, topics.json, `notes-evil.ts`, `ci.yml`: full). Found and closed one hole: `changes` is in `checks` needs, so a failed detection fails the gate instead of skipping every gate. Gotcha: in this dev shell `grep` is a function that resolves to `rg`, so shell snippets must be tested with `/usr/bin/grep`. Not exercised end to end: the first real notes-only push to `main` is the live test (owner decides when).
- [ ] **T3 — Docs, ADR 0013, changelog** (route: inline or delegated Tier 2 after T1/T2 land; bilingual twins must agree). NOTES(.en).md steps 6-9, CONFIGURATION(.en).md section 7, ADR 0013, CLAUDE.md commands, changelog entry.

## Acceptance Criteria
- `pnpm publish-note <slug> --dry-run` prints every step and changes nothing.
- Pure helpers (pubDate rewrite, changelog entry, release message, notes-only path test) are unit-tested; changelog entry validates against `changelogSchema`.
- `ci.yml` lints (actionlint if available, else YAML parse) and shows e2e/lighthouse gated by `notes_only`.
- A mixed push (note + any other path) still runs the full stack.

## Applicable checks
`pnpm --filter web test` (touched scripts), `pnpm typecheck`, `pnpm lint`, `pnpm docs:config` if schema docs change. e2e, lighthouse, white-label: not applicable until T2 (untouched app code).

## Progress and evidence
- Explored: new-post/scaffold-note layout, ci.yml jobs, CONFIGURATION section 7 release steps, ADR 0012.

## Next step
T1: write the failing tests for `publish-note-plan.ts`.
