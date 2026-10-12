# 0016. One-command note publishing and a notes-only CI fast lane

Status: Accepted

Builds on: [0012](./0012-direct-push-to-main-no-pr-gate.md) (direct push to `main`, the push is the only CI trigger). Nothing there changes; this ADR only decides what the run does when the push is a note.

## Context

A Lab Note is an MDX file in the repository, so publishing one is a release to `main`, and every release ran the whole stack: `static`, four `e2e` shards, two `lighthouse` shards and the white-label build, then the deploy. For a change that is only text, that wait was out of proportion. The manual steps around it (move the draft, set the date, write the changelog entry, build, commit, push, build a release commit, push `main`) were nine things to remember.

## Decision

1. **`pnpm publish-note <slug>`** does the steps in order and stops at the first failure: preconditions (on `develop`, clean tree, draft exists) → move the draft into `content/notes/` and set `pubDate` to the local date → add the `note-NNN` changelog entry → `pnpm --filter web build` plus `check:js-budget` and `check:page-weight` (the build is the only validator of frontmatter and `translationOf`; the two budgets are the same ones CI's `notes-gate` runs, a few seconds, so a heavy note fails before the push; a failure of any of them puts the draft back) → `changelog:stamp` → commit → `changelog:audit` → push `develop` → release to `main` with `git commit-tree` and `git push origin <sha>:refs/heads/main` (no local checkout of `main`). Running the command is the owner's authorization to push and release. `--dry-run` prints the plan and changes nothing; `--no-release` stops after the local commit. Logic that can be tested lives in `apps/web/scripts/publish-note-plan.ts`; the CLI is a thin shell around it.
2. **A notes-only fast lane in `ci.yml`.** A `changes` job asks the GitHub compare API for the files between the previous and the new `main`. The push is notes-only when every path is under `apps/web/src/content/notes/` or is `changelog.json` or `releases.json`. Then `e2e` and `lighthouse` are skipped, and a `notes-gate` job runs the build plus `check:js-budget` and `check:page-weight`. `static` and the deploy (with its smoke-check and rollback) always run. Anything else (any other path, an unknown base such as a first push, an API error, 300 or more files) runs the full stack.
3. `changes` is listed in the `checks` aggregate so that a failed detection fails `checks` instead of leaving every gate skipped. A skipped `e2e`/`lighthouse` is not a failure, which is what lets the fast lane pass.

## Consequences

- A note reaches production after `static`, `notes-gate` and the deploy, instead of the whole stack.
- What the fast lane does not check: browser behavior of the new note (layout, theme, a11y, share card rendering) and Lighthouse. The build still rejects invalid frontmatter and orphan translations, and the page-weight budget (the one that has tripped on notes before) still runs. A note that uses an unusual layout should be opened with `pnpm --filter web dev` first, as the guide already says.
- A push that mixes a note with any other change gets the full stack, so the fast lane cannot hide a code change.
- `topics.json` is deliberately not in the allowlist: a topic changes pages and filters, so it keeps the full stack.
- The path rule lives in `ci.yml` (shell), not in TypeScript, so it cannot drift from what CI really does; it was exercised with GNU grep on representative path sets when it was written.

## Reverting

Delete the `changes` and `notes-gate` jobs, the `needs`/`if` on `e2e` and `lighthouse`, and the two names from `checks`' `needs`. `publish-note` keeps working: it only pushes, and CI then runs the full stack.
