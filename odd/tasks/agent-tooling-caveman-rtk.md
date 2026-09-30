# Caveman and RTK Agent Tooling

## Objective
Make Caveman response guidance and RTK command-output optimization available to Codex and Claude agents working in this repository.

## Problem and Why
Caveman and RTK currently exist only in user-level tooling. Repository agents need discoverable, repository-local instructions and integrations.

## Scope
- Configure repository-level Caveman guidance for Codex and Claude.
- Configure repository-local RTK integrations where supported, preserving existing agent configuration.
- Do not change application runtime or dependencies.

## Constraints
- Local-only; no remote operations.
- Preserve existing `CLAUDE.md` content and configuration.
- TDD mode: enabled by session instruction; runner: `pnpm test` (configuration-only changes may use targeted structural/configuration verification instead of irrelevant application tests; explain any skipped suite).

## Tasks
- [x] **T1 — Add repository-local Caveman and RTK configuration** (route: delegated; trigger: integration touches multiple non-trivial configuration files; worker owns preparation reads and writes). Add clear shared agent guidance and native local integrations for Codex and Claude without overwriting existing settings.
- [x] **T2 — Make repository lint pass with RTK enabled** (route: delegated; trigger: formatter fixes plus repository guidance update across multiple files). Correct the observed Biome formatting violations and document the RTK proxy invocation needed to bypass its ESLint-specific lint output filter.
- [x] **T3 — Token-optimization routing and durability net** (route: direct inline; trigger: two understood single-file config writes plus validation, no unresolved design). Wire the herdr → opencode model routing that was missing, and make the token-saving setup (Caveman hook, RTK hook, output style, routing) survive a gentle-ai reinstall. These artifacts are user-level (`~/.config`, `~/.claude`), not repository files, so they are recorded here for continuity but committed evidence covers only this document.
- [x] **T5 — Port the token-opt restore net into the `agentic-dev-setup` dotfiles** (route: mixed — security-sensitive script authored inline, mechanical docs delegated to elvinlabCode via herdr and reviewed). Track `restore.sh` in the dotfiles repo so a dead-machine rebuild restores the whole token-opt layer, and allow opencode to work across `~/Projects` repos without `external_directory` prompts. Cross-repo: changes live in `~/Projects/repositories/agentic-dev-setup` (its own `main`), recorded here for continuity.
- [x] **T4 — Autonomous opencode permission ceiling** (route: direct inline; trigger: one security-sensitive user-level config write, Tier-3 so not delegated). Give the delegated opencode agent more protagonism by letting it complete whole work units (`edit`/`bash`/tests/commit) under `--auto` without per-step round-trips to the Claude orchestrator, while denying irreversible and outward-facing commands. Rationale: token savings come from fewer orchestrator round-trips, not from delegating cheap RTK-compacted state reads or Tier-3 review; only bounded write/test/explore work is delegated. Ceiling chosen: **A (broad-safe)** — edit/read/write/bash/test/commit allowed; push, deploy (`wrangler*`, `pnpm [--filter web run] deploy`), `gh pr merge`/`release`/`auth`, `rm -rf`, and remote transfer (`ssh`/`scp`/`rsync`) denied. `--auto` auto-approves anything not explicitly `deny`, so dangerous rules are `deny` (never `ask`).

## Acceptance Criteria
- Codex and Claude find repository-local Caveman and RTK usage instructions when starting work here.
- RTK integrations are local to this repository, valid, and preserve unrelated user/project settings.
- No app source or dependencies change.

## Checks
- Inspect exact diff and configuration files after changes.
- Use `rtk init --show` and/or targeted dry-run/config inspection for each supported integration.
- Run an applicable repository configuration/lint check if feasible; document skipped checks and reasons.

## Progress
- Exploration: RTK 0.50.0 supports local Codex hooks and local Claude instructions; repo contains `CLAUDE.md`, no `AGENTS.md`, and user-level RTK setup was left untouched.
- T1 outcome: native `rtk init --codex` created project-local `AGENTS.md`, `RTK.md`, and `.codex/hooks.json`; native `rtk init --no-patch` added Claude RTK guidance to existing `CLAUDE.md` and created `.rtk/filters.toml`. Added shared Caveman/RTK guidance to `AGENTS.md` and linked it from `CLAUDE.md`.
- TDD: RED observed before edits: structural assertion failed because `AGENTS.md` did not exist. GREEN: assertions confirmed both agent entry points reference shared Caveman/RTK guidance and both native RTK integration files exist.
- Verification: `rtk init --dry-run` and `rtk init --codex --dry-run` previewed expected changes; actual Codex setup reported registered project hook; Claude setup reported local RTK instructions enabled. `rtk init --show` reports Claude local instructions enabled; it does not report Codex, which its summary does not cover.
- Functional check skipped: `pnpm test` exercises application packages; no runtime/dependency code changed. Config-only structural assertions passed. `pnpm lint` did not yield usable lint output (RTK wrapper reported `ESLint output (JSON parse failed: EOF while parsing a value at line 1 column 0)`); `git diff --check` and JSON parsing of `.codex/hooks.json` passed.
- T2 outcome: Biome formatting violations fixed by adding the trailing newline to `.codex/hooks.json` and formatting the `PAGES` array in `tests/browser/a11y.spec.ts`. Added an RTK.md note to use `rtk proxy pnpm lint` when RTK lint parsing is unusable: the repo uses Biome while RTK rewrites `pnpm lint` to its ESLint-specific parser. `rtk proxy pnpm lint` passed: checked 146 files, no fixes applied. `git diff --check` passed. App tests skipped: formatting and workflow documentation only, no runtime behavior changed.
- Route: delegated (trigger: multi-file configuration integration); forecast remains under 400 authored lines.
- T2 work-unit commit: `f5e573c` (`fix: make repository Biome lint pass through RTK`).
- T3 outcome: found `~/.config/agent-routing/active.env` missing (the whole dir absent), so herdr → opencode delegation silently fell back to opencode's default model and never used the cheap tiers. Created it with `TIER1_MODEL=omniroute/elvinlabFast` and `TIER2_MODEL=omniroute/elvinlabCode` (OmniRoute proxy at localhost:20128 running; `OMNIROUTE_API_KEY` present). Built `~/.config/agent-routing/restore.sh` (idempotent, executable): recreates `active.env` if missing, sets `outputStyle=Gentleman`, re-adds the Caveman ULTRA `SessionStart` hook and the `rtk hook claude` `PreToolUse` hook if missing, warns if the Caveman skill is gone, and backs up `~/.claude/settings.json` (keeps last 5).
- T3 durability rationale: the Caveman skill is independent of gentle-ai (survives reinstalls) and the repo `.claude/settings.json` hooks are committed, but the global `~/.claude/settings.json` (output style + Caveman/RTK hooks) is written by gentle-ai's persona/permissions components and can be clobbered on a full reinstall; `restore.sh` neutralizes that. Run `bash ~/.config/agent-routing/restore.sh` after any gentle-ai update.
- T3 verification: no-op run confirmed all four items present; the re-add branches were proven on throwaway copies (Caveman 0→1, RTK 0→1, `outputStyle` Neutral→Gentleman) with JSON staying valid; backup rotation keeps 5.
- T3 decision: keep the `full-gentleman` preset and the Gentleman persona. Evidence that ODD is in active daily use (this `odd/tasks/` set plus the recent `docs(odd)` commit cadence) means the `minimal` preset would remove a workflow that is actually used; RDD is already clone-off, which is where the largest gentle-ai cost already sits.
- Next step: in a fresh session, verify end to end — Tier 1/2 delegations actually launch `opencode -m <model>` with the OmniRoute IDs, RTK compacts Bash output, Caveman ULTRA applies to replies, and `restore.sh` is a clean no-op. See the Engram test plan for this feature.
- T3 work-unit commit: pending (documentation-only; artifacts are user-level).
- T4 outcome: added a top-level `permission` block to `~/.config/opencode/opencode.json` (backed up first as `opencode.json.pre-permission.*`). `edit`/`read`/`list`/`glob`/`grep`/`webfetch`/`websearch` allow; `bash` is `"*":"allow"` with 14 `deny` rules for irreversible/outward-facing commands (push, wrangler, `pnpm [--filter web run] deploy`, `gh pr merge`/`release`/`auth`, `rm -rf`/`rm -fr`, `ssh`/`scp`/`rsync`). Ordered `"*"` first because V1 opencode uses last-matching-rule-wins. Dangerous rules are `deny` (not `ask`) because `--auto` auto-approves everything not explicitly denied. The gentle-ai-managed `agent` subagents (`explore`, `review-*`) keep their own stricter per-agent `permission` and are not loosened by this top-level default.
- T4 verification (live, both PROVEN): under `opencode run --auto -m omniroute/elvinlabFast`, `git status --short` executed with no prompt (header `> build · elvinlabFast`); `git push --dry-run` was DENIED — opencode refused citing the `git push*: deny` rule and listed all 15 loaded rules. JSON validated (`python3 -m json.tool`). Durability: extended `~/.config/agent-routing/restore.sh` with section 4 to re-inject this `permission` block if a gentle-ai reinstall drops it (idempotent; backs up opencode.json, keeps 5); `bash -n` OK, no-op run reports `opencode permission present`, and the inject path produces valid JSON.
- T4 route: direct inline (security-sensitive Tier-3 config, done by the orchestrator, not delegated). Under 400 authored lines.
- T4 work-unit commit: pending (documentation-only in-repo; the permission and restore.sh artifacts are user-level under `~/.config`).
- T5 outcome: added `home/.config/agent-routing/restore.sh` (mode 100755, byte-identical to the live `~/.config/agent-routing/restore.sh`) to the `agentic-dev-setup` dotfiles; it encodes the caveman ULTRA hook, the RTK hook, `outputStyle=Gentleman`, the opencode permission ceiling, and (added last) `external_directory: { "~/Projects/**": "allow" }`. Wired `scripts/bootstrap.sh` to install it (`install -m 755`) but NOT auto-run it (it errors unless `~/.claude/settings.json` exists, which Gentle AI creates in step 4). Delegated the `docs/SETUP.md` runbook update to elvinlabCode in herdr pane w8:p9 (new step 6 + renumber 7/8 + a verification line); reviewed = PASS. Also added `external_directory: { "~/Projects/**": "allow" }` to the live `~/.config/opencode/opencode.json` so delegated opencode runs no longer block reaching across `~/Projects` repos; destructive/outward denies (push, deploy, rm -rf, ssh/scp/rsync) unchanged.
- T5 verification: both git worktrees clean; `bash -n` OK on restore.sh and bootstrap.sh; opencode.json valid JSON; repo restore.sh == live restore.sh. Live proof earlier: opencode `--auto` ran `git status` but was DENIED on `git push --dry-run`. `external_directory` glob confirmed via opencode docs (`*` matches zero+ of any char incl. slashes; `~/` home-expansion supported).
- T5 commits (in `agentic-dev-setup`, branch `main`, NOT pushed): `43af610` (restore.sh + bootstrap + SETUP.md) and `a0bbca2` (external_directory under ~/Projects).
- NEXT STEP (when resuming): (a) if a fresh machine or a gentle-ai reinstall happens, run `bash ~/.config/agent-routing/restore.sh` after Gentle AI is installed; (b) neither repo is pushed — pushing `elvinlab.dev` `develop` triggers CI + staging deploy, and `agentic-dev-setup` `main` has 4 unpushed commits, both are user-owned push decisions; (c) delegation posture is now DEFAULT to elvinlabCode/elvinlabFast (see Engram feedback memory), keep reviewing every delegated diff; (d) optional, not built: a routing-policy table in `~/.config/agent-routing/` and a one-command herdr delegation wrapper.

## Delivery
- Strategy: ask-on-risk.
- Forecast: under 400 authored changed lines.
- Commit identity: `2ae84f5` (`feat: configure repository agent tooling`).
- RDD: clone-local mode is off (global on, clone-local off). Native risk assessment returned high/unassessable because intended untracked inventory was required; no review lifecycle was started because mode is off.
