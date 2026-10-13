# Resume release CI fixes and harden the notes fast lane

## Objective
Finish the interrupted release fix, independently validate the notes-only lane, publish the owner-requested release, and confirm successful CI before cleaning up integrated branches.

## Problem and evidence
- GitHub run 38465355361 failed for quiet/bare navbar specs and Lighthouse; deploy was skipped.
- Lighthouse tolerance is already committed in 7c6a483. Navbar profile fixes and notes hardening are uncommitted.
- Local audit found unconditional blog smoke checks, actionlint SC2129, checker formatting failures, and incomplete topic-marker validation.

## Scope and constraints
- Preserve all existing work and distinguish the release/navbar unit from next-release notes hardening.
- Work on fix/ci-release-and-notes-gate, branched from local develop at 7c6a483.
- Initial GitHub authorization was read-only through the current gh session for elvinlab/elvinlab.dev. The owner subsequently requested release, a clean repo, synchronized main/develop, and no other branches. Release execution is pending verification and the delivery-size decision; do not publish while checks fail.
- RDD is disabled globally and for this clone. Use functional proof; do not start native review or enable it.
- Keep deterministic regression tests with their fixes; observe RED before new behavior fixes where runnable.
- Forecast: roughly 100 changed lines for navbar fixes; notes hardening exceeds 400 including existing checker/regression tests. Owner requests one release without PRs or permanent feature branches; keep coherent work-unit commits and preserve tests instead of line-count reduction. Publishing follows the explicit release request and requires green local applicable checks.

## Tasks
- [x] T1 — Structurally verify and commit the existing feature-aware navbar fixes; defer all four full profile suites to CI at the owner's explicit request. Route: delegated verification; trigger: verification and code audit. Commit d0eca8477fa46d676a354a3c0cf621756bfdc749. CI proof is deferred, not claimed locally. Lighthouse stays in its existing commit.
- [x] T2 — Correct confirmed notes-lane defects and add focused regression tests. Route: delegated writer; trigger: multi-file non-trivial fixes and preparation for writing. Preserved blog-off behavior, enforced topic counts, normalized code and passed actionlint. Measured changelog growth and rationale documented. Commit d0eca8477fa46d676a354a3c0cf621756bfdc749.
- [x] T3 — Verify notes build, budgets, checker, changelog browser coverage, and local deployed-smoke behavior independently. Route: delegated verification; trigger: builds/tests and production workflow changes. Independent proof recorded below and in odd/verification-ledger.md. Commit d0eca8477fa46d676a354a3c0cf621756bfdc749; genuine notes-only job/deployed rollback remain future-event proof.

## Acceptance and checks
- The real CI must prove blog-only, me-only, quiet, and bare without removing applicable navbar coverage. Owner explicitly requested not to rerun profiles locally.
- Checker tests fail on missing pages, invalid links, and missing/incorrect topic markers.
- Smoke regression proof includes valid blog-on, valid blog-off, and missing required note/index/feed failures.
- actionlint .github/workflows/ci.yml; bash -n .github/scripts/smoke-check.sh; pnpm lint; browser TypeScript; focused Vitest checks.
- Fresh build; check:built-notes; check:js-budget; check:page-weight; changelog browser spec.
- GitHub notes-only path selection and deployed rollback remain unverified without an authorized real run.

## Progress
- Read-only audit: 116 focused unit tests passed; browser TypeScript and shell syntax passed.
- Initial actionlint/Biome checks failed. Existing dist page-weight failed on two changelog pages; artifact freshness unknown.
- GitHub logs confirmed navbar failures and LCP assertion threshold 2600 ms. A later read-only log request returned HTTP 502; no remote mutation occurred.
- Commits: baseline 7c6a483; coherent CI-remediation work unit d0eca8477fa46d676a354a3c0cf621756bfdc749 (19 files, 1103 additions / 79 deletions, including inherited checker and full regressions). One release, no PR requested; no tests or documentation removed to fit a line heuristic.
- T2 corrections implemented: feature-aware smoke, fail-closed note lookup, required topic marker, relative links, actual-file assets and exact version.txt exemption. Observed RED: 11/35 failures; GREEN: 47/47 targeted tests. actionlint, shell syntax, diff-check, lint (602 files), fresh build, JS budget (42 pages), browser TypeScript pass. Built-notes passes nine notes with three explicit known-link warnings.
- Changelog allowance authorized and documented: HTML ceiling 129000 B from 128690 B; final measured ES 128899 B (101 B headroom), EN 128595 B (405 B headroom), inline CSS 63066 B against unchanged 63216 B ceiling. JS ceiling remains 30 KiB. Fresh page-weight and JS checks pass 42 pages.
- Native risk assessment is high/unassessable because intended untracked files are not declared; RDD remains off. An independent verifier is required, not native review.
- Owner requests one release, clean main/develop only, and CI-only full-profile proof. Delivery remains one release with separate coherent local work-unit commits; no PR creation requested. Existing new checker and regression tests account for over-400-line notes hardening and will not be reduced for line count.
- Final independent proof: 1771 full unit tests, 147 focused script tests, six changelog browser tests, seven mocked executions of the actual workflow selector, architecture, lint, shell syntax, actionlint, fresh build and budgets all pass. Full typecheck caught two TS4111 errors in the new smoke test; bracket property access fixed them, then full typecheck and 47 affected tests passed. Stamp dry-run and actual were byte-preserving no-ops.
- Full profiles and Lighthouse were intentionally not run locally. Mixed-release CI skips the actual notes-gate job; local component/selector checks do not claim that conditional job ran. Three known-link warnings are explicit pre-existing output exceptions, not new release fixes.
- Next: synchronize release branches, push the exact-tree release and inspect every actual CI profile/Lighthouse/deploy result. Final remote evidence is reported in GitHub Actions and the Engram recovery summary. Branch cleanup must preserve unmerged work; remote Dependabot branches have open PRs #115 and #123 and require a separate disposition.
