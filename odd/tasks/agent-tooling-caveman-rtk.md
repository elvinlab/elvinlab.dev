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

## Delivery
- Strategy: ask-on-risk.
- Forecast: under 400 authored changed lines.
- Commit identity: `2ae84f5` (`feat: configure repository agent tooling`).
- RDD: clone-local mode is off (global on, clone-local off). Native risk assessment returned high/unassessable because intended untracked inventory was required; no review lifecycle was started because mode is off.
