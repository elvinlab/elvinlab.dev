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

## Addendum 2026-10-13: the lane now proves the published note, not only the build

Owner decision: truth over speed. A note publish may cost about three extra minutes if that means it never reaches production unverified. A read-only audit after a very large UI change found these gaps in the lane as written above:

1. A changelog-only push skipped `tests/browser/changelog.spec.ts`, although `verification-map.ts` maps that spec to `changelog.json` and `releases.json` (and `docs/TESTING.md` said to skip e2e for them).
2. Nothing opened a real published note. `e2e` and Lighthouse build from a fixture workspace that excludes the owner's notes, so for a real publish only the build and the two size budgets looked at it. Nothing checked that every published note has its page, is in the index, the RSS feed and the sitemap, that the topic pages exist, or that internal links resolve (deleting a note counted as notes-only and nothing checked links pointing to it).
3. The post-deploy smoke check only looked at `/version.txt`, `/` and `/_astro` assets, so a published note that answered 404 passed.
4. Stale statements: the Lighthouse URL count in `ci.yml` (13, not 10), and this ADR presented "real notes are not measured by e2e and Lighthouse" as a cost of the lane while that is also true of the full stack (they measure fixtures).

What the lane runs now (the full-stack lane is unchanged):

- `notes-gate` runs, in this order: build, `check:js-budget`, `check:page-weight`, **`check:built-notes`**, then installs Chromium and runs **`tests/browser/changelog.spec.ts`** (a note publish always edits `changelog.json`). `check:built-notes` (`apps/web/scripts/check-built-notes.ts`, pure logic with unit tests, no browser) reads `content/notes/` and `dist/client` and fails with `path: reason` lines when a published note has no page, `<h1>` or canonical link; is missing from the notes index rows, the sitemap or (Spanish notes) the RSS feed; when a topic that should have a page has none, lacks its `data-topic-notes` marker or lists the wrong number of notes; or when any root-relative or page-relative internal `href`/`src` in any built page does not resolve. A small, printed list of known broken links of the current build (a 404 language switch and `/en/notes/` from the English subscribe pages) is tolerated, not hidden.
- `publish-note` runs the same three checks that need no browser (`check:js-budget`, `check:page-weight`, `check:built-notes`) before committing, so a problem fails on the owner's machine first. The changelog spec runs in CI only.
- The `changes` job also outputs the slugs of the notes added or edited by the push (removed files excluded). The deploy job passes them to `smoke-check.sh` as `SMOKE_NOTES`; a failed live-note lookup fails `changes` instead of silently dropping targets. Before deployment, the workflow validates the candidate configuration and explicitly derives `SMOKE_BLOG` from `features.blog`. When true, smoke requires 200 on `/notes/` and `/rss.xml` and, in the notes-only lane, on `/notes/<slug>/` or `/en/notes/<slug>/` for each note. When false, those intentionally absent routes are not requested; unknown flags or note targets with blog off fail closed. Standalone callers with an unset flag keep blog-on checks by default. A failed smoke check rolls the deploy back, as before.
- Extra cost per note publish: estimated at roughly three minutes, mostly Chromium setup and the changelog spec; a real notes-only run must confirm the added CI time. The built-output check itself needs no browser.
- Not done on purpose: `/changelog/` is not a Lighthouse URL (it is not in `lighthouserc.json` for the full stack either) and it stays that way: another URL adds run-to-run flakiness to a gate that already has little margin. `docs:config` and `changelog:audit` are not CI steps (the first is run when a schema changes, the second by `publish-note`); this was never stated before and is now.
- Lighthouse and e2e still never open a real note: they remain measures of the fixtures. The new checks prove that the real note exists, is wired and is reachable; they do not measure how it renders.

### Release allowance (2026-10-13)

The new notes-gate and preceding Lighthouse changelog entries increased editorial markup on the
first changelog page. A fresh build still exceeded its fixed HTML budget by 155 B after shortening
the pending entry. The owner authorized a measured 128690 → 129000 B allowance with small remaining
headroom, documented with the final baseline in `docs/TESTING.md` and `page-weight-budget.json`.
This changes no runtime payload, CSS ceiling or JavaScript gzip cap. Changelog remains outside
`CONTENT_GROWTH`; the notes-index, topic and article growth rules are unchanged.
