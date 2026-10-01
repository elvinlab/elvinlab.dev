# 0012. Direct push to main, no PR gate

Status: Accepted

Supersedes: the `develop -> main` pull-request framing in [0011](./0011-ci-gate-once-at-main-pr-no-staging.md) (that ADR's "no staging, one CI run" decision stands; only *where* the one CI run happens changes here).

## Context

0011 moved the single CI run to the `develop -> main` pull request. In practice that still meant waiting on a PR's check before merging — the exact wait the user was trying to eliminate. The `protect-main` ruleset required a passing `checks` status before the PR could merge, so the wait didn't actually go away, it just moved.

## Decision

`main` is a direct push, not a PR: `git checkout main && git merge develop && git push origin main`. That push is the only trigger for `.github/workflows/ci.yml` — gates (lint/typecheck/test/e2e/lighthouse) and the production deploy run in the same workflow run, gates first. The `protect-main` ruleset (GitHub, id `24092000`) was changed to match `protect-develop`'s shape: `deletion` + `non_fast_forward` + `required_linear_history` only — **no `pull_request` rule, no `required_status_checks`**. Nothing blocks the push itself; a failing gate blocks the `deploy` job (via `needs: checks`), not the commit from landing on `main`.

`required_linear_history` means `main` only ever moves by fast-forward: no merge commits. `git merge develop` performs a fast-forward automatically as long as `main` has no commits of its own since the last release — which holds as long as `main` is never committed to directly outside this flow.

## Consequences

- Fastest possible loop: one push, one CI run, deploy if green. No PR UI, no review step, no "waiting for checks to allow merging."
- Weaker safety net: a broken commit reaches `main`'s history even though it won't deploy (the deploy job only runs if gates pass). Recovery is `git revert`/`reset` on `main`, not "the PR never merged."
- No required reviewer, no required status check on `main` at the GitHub level — this is a deliberate, solo-developer trade-off, not an oversight.

## Scaling this back up (when collaborators join, or the solo trade-off stops being worth it)

This is reversible in two independent steps, either or both can be applied without touching the other:

1. **Re-require review on `main`.** Restore `protect-main`'s `pull_request` rule (require a PR, optionally `required_approving_review_count: 1+`) via the GitHub UI or `gh api --method PUT repos/<owner>/<repo>/rulesets/24092000` with that rule added back (see the `protect-main` rule shape in [0011](./0011-ci-gate-once-at-main-pr-no-staging.md)'s predecessor state, or `protect-develop`'s ruleset, id `24092004`, as the reference for what "no gate" looks like in reverse).
2. **Re-require the CI check before merge.** Add `.github/workflows/ci.yml`'s `pull_request: branches: [main]` trigger back (the gate jobs are unconditional already, no `if` to undo — they ran in this exact shape under 0011 too), restore `protect-main`'s `required_status_checks` rule naming `checks`, and change `deploy`'s trigger to `push` only again (the existing `if` conditions on `static`/`e2e`/`lighthouse` would need the `github.event_name != 'push'` guard restored so the push-to-main merge doesn't re-run gates that the PR already ran — see 0011's version of this file in git history for the exact shape).

Both steps are config-only (ruleset + workflow triggers), no application code involved, so scaling back up is a same-day change whenever it's needed.
