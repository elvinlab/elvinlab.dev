# 0011. CI gates once at the develop -> main PR; no staging environment

Status: Accepted

Supersedes: the preview/staging description in [0002](./0002-cloudflare-workers-and-github-actions.md) and the `develop`-inclusive gate framing in [0007](./0007-ci-parallel-gates-aggregate.md).

## Context

CI previously ran on every push to `develop` (lint/typecheck/test/e2e/lighthouse) plus a staging deploy (`elvinlab-staging`), and every PR got a preview deploy. For a solo-developer, continuously-iterating repo this meant waiting on a full pipeline run for every push, with no second reviewer to use the staging/preview environments.

## Decision

Work happens directly on `develop` with no CI or deploy attached to it. CI runs exactly once per release, triggered by the `develop -> main` pull request (`pull_request`/`push` triggers scoped to `main` only). A passing merge deploys straight to production (`elvinlab`), smoke-checked with automatic rollback, same as before. The staging Worker (`elvinlab-staging`) and the per-PR preview job are removed from the pipeline entirely — not kept as an ungated auto-deploy, and not repointed elsewhere.

## Consequences

Faster local iteration (no pipeline wait per push); one environment (production) instead of two, less to keep in sync. No pre-production environment to sanity-check a build before it's live — the `develop -> main` PR's CI run is the only automated check before a release. Deleting the actual Cloudflare `elvinlab-staging` Worker and its GitHub secrets/environment is a separate, manual follow-up (infrastructure, not a repo-file change).
