# 0018. Noisy gates retry once and report flakes

Status: Accepted

Builds on: [0007](./0007-ci-parallel-gates-aggregate.md) (the gates) and [0017](./0017-the-ci-follows-the-site-config.md) (profiles). Nothing there changes.

## Context

Noisy measurements blocked release runs without being real regressions: Lighthouse `/me/` CLS 0.31 in 1 of 3 runs (pessimistic aggregation, passed on rerun), axe `color-contrast` on `/en/contact/` in 1 of 812 e2e (passed 2/2 on rerun), and an earlier font-swap race. The owner asked for a lasting, scalable policy, not more one-off patches. A gate that flakes must neither block a release nor hide silently.

## Decision

1. **Deterministic gates never retry.** `lint`, `depcruise`, `typecheck`, unit tests, `build`, the size budgets and the notes fast-lane build checks fail immediately: their result does not vary between runs.
2. **Playwright retries once, in CI only.** `retries: 1` when `CI` is set (`playwright.config.ts`); locally and under `pnpm verify` retries stay off, so a developer sees the real result. A test that passes on the retry is `flaky`: the JSON report is read by `apps/web/scripts/list-flaky.ts` and the flaky tests are written into the job's run summary.
3. **Lighthouse re-runs the failed URL once, in CI only.** When `lhci autorun` fails, `run-lighthouse-ci.ts` reads `.lighthouseci/assertion-results.json`, re-runs only the URLs that failed an error-level assertion, and — if they pass — writes them to `.lighthouseci/flaky.md`, which the job copies into the run summary. A failure with no failed URL recorded (for example a collect error) stays immediate.
4. **A flaky pass is reported, never hidden.** Every Playwright job (`e2e`, `profiles`, `notes-gate`) and the `lighthouse` job append their flaky entries to `$GITHUB_STEP_SUMMARY`.

## Consequences

- A single noisy measurement no longer blocks a release: it is retried once and, on a pass, reported as flaky.
- A deterministic failure still fails the gate at once, because deterministic gates never retry.
- Flaky evidence accumulates in the run summary, so a test that flakes repeatedly stays visible instead of disappearing.
- Cost is bounded: a flaky e2e test runs twice; a flaky Lighthouse URL runs twice (its usual 3 runs each), and only the failed URLs re-run.
- Retries are a CI policy; local and `pnpm verify` runs are unaffected and keep showing the unfiltered result.

## Reverting

Set `retries: 0` in `playwright.config.ts`, drop the `if (status !== 0 && process.env['CI'])` block in `run-lighthouse-ci.ts`, and remove the four "List flaky" steps from `.github/workflows/ci.yml`.
