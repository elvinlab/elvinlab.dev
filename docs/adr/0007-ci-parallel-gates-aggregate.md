# 0007. CI shape (parallel gates behind one aggregate)

Status: Accepted

## Context

Needed multiple independent CI checks (static analysis, e2e, lighthouse) without blocking each other or duplicating "required check" config per gate.

## Decision

CI runs gates in parallel (static, e2e, lighthouse) and exposes one stable `checks` aggregate job that branch protection requires. Gates are skipped on push to `main` (the tree already passed as a PR into main). Deploy job is guarded by `always()` plus `needs.checks.result` so a failed gate blocks deploy. In-progress runs are cancelled on superseding pushes, except on `main`.

## Consequences

Branch protection only needs to track one job name even as gates are added/removed; main pushes are fast (no gate re-run) but rely on the PR having already passed; deploy strictly depends on gate outcome.