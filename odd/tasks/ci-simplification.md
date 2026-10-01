# Feature: CI/CD simplification — drop staging, gate once at the main PR

## Objective

Stop running CI (lint/typecheck/test/e2e/lighthouse) and a staging deploy on every push to `develop`. Work directly on `develop` with no pipeline overhead; CI runs exactly once, on the `develop -> main` pull request, and a passing merge deploys straight to production. Staging environment removed entirely.

## Problem / why

User (2026-10-01): "vamos a cambiar un poco los tiempos que pasamos esperando en consola es exagerado el ci/cd... trabajar directo en develop, y para hacer un merge a main (prod) lo hacemos directo y ahi corremos el ci/cd una sola vez así queda mas optimizado." Confirmed via AskUserQuestion: staging deploy is also dropped (not kept as an ungated auto-deploy) — single production environment, CI runs once per release instead of once per push.

## Decisions (confirmed / parent judgment call, documented for correction)

- **Confirmed with user:** no CI, no deploy on push to `develop`. Staging is removed from the pipeline (not kept as a gate-less auto-deploy).
- **Parent's call (not separately asked, consistent with "drastic, more optimized" intent — flag if wrong):** the PR-preview job (`preview` in `ci.yml`) also used the `elvinlab-staging` Worker as a preview-alias target; since staging is removed, PR previews are removed too, not re-pointed elsewhere. `develop -> main` stays a pull request (existing convention, `CLAUDE.md` "Workflow" section); the PR's `pull_request` CI run is the one gate run the user asked for, and a merge (push to `main`) deploys without re-running gates (same "already validated by the PR" logic the current workflow already uses for pushes to `main`).
- `develop` keeps existing as a git branch for ongoing work; it simply has no CI/CD wired to it anymore.

## Scope

In scope:
- `.github/workflows/ci.yml`: drop `develop` from both `pull_request` and `push` triggers; remove the `preview` job and the staging branch of `deploy` (single production target); simplify the gate-skip condition (`push` now only ever means a merge to `main`, so the `github.ref != 'refs/heads/main'` check becomes `github.event_name != 'push'`).
- `CLAUDE.md` ("Status and commands" section): update the CI/CD description (no more per-push develop CI, no PR previews, no staging deploy).
- New ADR documenting the decision (supersedes parts of ADR 0002 and ADR 0007).
- `docs/adr/README.md`: add the new ADR row.

Out of scope (flagged as manual human follow-ups, not done by Claude):
- Deleting the actual `elvinlab-staging` Cloudflare Worker and its GitHub Environment/secrets — infrastructure/account-level action, destructive, user's call.
- Any GitHub branch-protection ruleset changes — server-side GitHub config, not a repo file; the existing `checks` required-status-check name is unchanged, so no edit should be needed, but the user should verify the ruleset still passes after this change.

## Tasks

- [x] **CI1** — Edit `.github/workflows/ci.yml`: triggers, remove `preview` job, simplify `deploy` to production-only, update the `static`/`e2e`/`lighthouse` skip condition and related comments. Route: direct inline (1 file, already-understood, Tier 3 — CI/deploy logic is infra-sensitive).
- [x] **CI2** — Update `CLAUDE.md` "Status and commands" paragraph describing CI behavior. Route: direct inline (1 file, mechanical once CI1 is decided).
- [x] **CI3** — Write `docs/adr/0011-...md` (supersedes ADR 0002's preview/staging description and ADR 0007's parallel-gates framing where it mentions `develop`) + add the row to `docs/adr/README.md`. Route: direct inline.

## Acceptance criteria

- `ci.yml` has no reference to `develop` in `on:` triggers.
- No `preview` job; no `STAGING_WORKER` env var; `deploy` targets `PRODUCTION_WORKER` unconditionally.
- Gates (`static`/`e2e`/`lighthouse`) still run on every PR into `main` and are skipped on the resulting push-to-main (merge), same logic as today, just simplified now that `push` only ever targets `main`.
- `CLAUDE.md` and the new ADR accurately describe the new flow; no stale mention of "staging" or "preview" as live behavior.
- This is a workflow-file-only change: no app code changes, so `pnpm typecheck`/`lint`/`test` are unaffected (run anyway as a sanity check since docs/CLAUDE.md edits are in the same repo).

## TDD mode

Not applicable — no application code changes, pure CI/CD + docs.

## Checks run / evidence

Done inline (Tier 3, no delegation — infra-sensitive, single-file-at-a-time changes).

- `python3 -c "import yaml; yaml.safe_load(...)"` — `ci.yml` is valid YAML.
- `mise exec -- actionlint .github/workflows/ci.yml` — exit 0, no findings.
- Manual read-through confirming: no `develop` left in `on:` triggers; no `preview` job; no `STAGING_WORKER`; `deploy` targets `PRODUCTION_WORKER` unconditionally; gate-skip condition simplified to `github.event_name != 'push'` (push now only ever means a merge to `main`).
- Grepped the rest of the repo (`rg -ln "elvinlab-staging|STAGING_WORKER|staging"`) — only remaining hit is a doc-comment in `robots.ts` that's generically about any non-production build, no code change needed there.
- `docs/adr/README.md` diff confirmed as a single added line.
- App code untouched, so `pnpm typecheck`/`lint`/`test` were not re-run for this change (CLAUDE.md/CI-workflow/ADR only).

Not done (flagged to the user, human/infra follow-ups):
- Deleting the `elvinlab-staging` Cloudflare Worker and its GitHub Environment/secrets.
- Verifying the GitHub branch-protection ruleset still passes end-to-end with the new trigger shape (the required status check name `checks` is unchanged, so it should need no edit, but worth a live check on the next PR).

Not committed yet — pending explicit go-ahead.

## Next step

CI1 first (the actual workflow logic), then CI2/CI3 (documentation of the decision already encoded in CI1).
