# Development pattern: how this repository is built

This is the playbook for starting the next project the way this one was built. It describes what exists and where it lives; it does not invent a method. Each claim points to a file. The machine-level setup has its own repository ([`agentic-dev-setup`](https://github.com/elvinlab/agentic-dev-setup), MIT); the story behind it is Lab Note 2 ([`/notes/agentic-dev-setup/`](../apps/web/src/content/notes/agentic-dev-setup/index.mdx)). This file is the part that was missing: how the three layers fit together and what to copy on day one.

## 1. The three layers

The pattern only works when all three are present. The most valuable one is the least versioned.

| Layer | What it holds | Where it lives | Versioned |
| --- | --- | --- | --- |
| **Machine** | herdr, OpenCode, OmniRoute, Ollama, Engram, model routing | [`agentic-dev-setup`](https://github.com/elvinlab/agentic-dev-setup) (`home/.claude/delegation-block.md`, `docs/SETUP.md`, `docs/LESSONS.md`) and `~/.config/agent-routing/active.env` | Yes, in that repository |
| **User** | the orchestration protocol: authorize, explore, size, track, delegate, verify, close with a `Risk:` line; tiers; remote-operation rules | `~/.claude/CLAUDE.md` | **No. Not in any repository.** See "Known gaps" |
| **Repository** | the project's own rules, specs, task logs, verification ledger, CI, ADRs | this repo (table in section 4) | Yes |

If you start a project on a new machine, layer 1 comes from `agentic-dev-setup`, layer 2 has to be restored by hand, and layer 3 is the checklist in section 6.

## 2. The working loop

Every request goes through the same steps. The user-level protocol calls it Organic Driven Development (ODD).

1. **Authorize.** Decide whether the request actually asks for a change. Investigations, reviews, comparisons and "what do you think" stay read-only until the owner says to implement. Ambiguous intent gets one question, then silence.
2. **Explore** the existing code and requirements first, proportionate to the request. Read what you will need anyway; delegate a read-only explorer only when understanding needs more than a few lookups.
3. **Classify the size.** *Small* when the outcome is specified, the risk is contained and the work could be resumed from the request and `git diff` alone: do it inline, no tracking files, no commits unless asked. *Large* only when that resume test fails (several sessions, waiting on something external, deliverables the owner wants apart).
4. **Track before the first write (large work only).** Create `odd/tasks/<feature>.md`: a short header, `## Specs` (`S1..Sn`, quoting the owner's exact strings), `## Tasks` (one line each: ID, linked `S#`, route, commit), `## Log` last (`L1` is the owner's request verbatim; corrections and evidence are appended). Real examples: [`odd/tasks/blog-feature-flag.md`](../odd/tasks/blog-feature-flag.md), [`odd/tasks/core-extraction-review.md`](../odd/tasks/core-extraction-review.md).
5. **Implement task by task.** Tests first when a relevant runnable test exists (observe RED, then GREEN). Hand work to a delegate by reference ("Spec: `odd/tasks/<feature>.md`, T2, S3-S4"), never by paraphrase. Check a task off only after its outcome and checks were observed.
6. **Verify only what the change touches** (section 5), and record what ran and what did not.
7. **Close** with the verified outcome, every failed, skipped or pending check, the next step, and a `Risk: none` or `Risk: item N (reason)` line.

Repository overrides of the user-level protocol (they win here): `odd/tasks/<feature>.md` in git is the only source of truth, with **no Engram mirror** ([`CLAUDE.md`](../CLAUDE.md), "Workflow").

## 3. Who does what: tiers and delegation

- **Tier 3** (architecture, hard debugging, security-sensitive code, ambiguous requirements): the paid orchestrator, inline.
- **Tier 2** (tests, boilerplate, docs, simple components, refactors with a clear spec) and **Tier 1** (renames, lint fixes, i18n strings, commit messages): delegated to OpenCode through herdr. Models come from `~/.config/agent-routing/active.env`, never hardcoded.
- **The reflex-stopper:** if writing the brief costs more than doing the change, do it yourself. Never delegate work whose spec you cannot state precisely.
- **A delegation brief is self-contained** and has the fields of [`.github/ISSUE_TEMPLATE/task.yml`](../.github/ISSUE_TEMPLATE/task.yml): tier, goal (one sentence), exact files (everything else read-only), conventions (point to an example file), acceptance criteria, verification commands, constraints (no commit, push, install or secrets).
- **Always review the diff** of delegated work: `git diff --stat`, rerun the verification commands, read only the risky hunks. After two failed attempts, do it yourself.
- **Never wait unbounded:** delegate with a timeout (at most 15 minutes for Tier 1-2); on a timeout or a repeating error, read the tail, interrupt, re-brief once with a narrower scope.

## 4. What in the repository carries the pattern

| File | Role |
| --- | --- |
| [`CLAUDE.md`](../CLAUDE.md) | Canonical repo knowledge: commands, architecture, workflow, verification rule, safety rules. |
| [`AGENTS.md`](../AGENTS.md) | Short agent-tooling notes and the production-deploy rule. Points to `CLAUDE.md`. |
| [`docs/PLAN.md`](PLAN.md), [`docs/BRAND.md`](BRAND.md) | Settled product and brand decisions (Spanish). |
| [`docs/CONVENTIONS.md`](CONVENTIONS.md), [`docs/DESIGN.md`](DESIGN.md) | Code and design rules. |
| [`docs/TESTING.md`](TESTING.md) | The test pyramid, the impact map and the touch-scoped verification rule. |
| [`docs/adr/`](adr/README.md) | One decision per file: context, decision, consequences (several also say how to revert). |
| `odd/tasks/*.md` | One feature per file: specs, tasks, log. |
| [`odd/verification-ledger.md`](../odd/verification-ledger.md), `odd/verification-state.json`, `odd/verification-timings.md` | What was verified, at which commit, and how long each check takes. |
| [`.github/ISSUE_TEMPLATE/task.yml`](../.github/ISSUE_TEMPLATE/task.yml) | Issue = delegation brief with a tier. |
| [`.mise.toml`](../.mise.toml) | Pinned Node and pnpm; every command runs through `mise exec --`. |
| `.github/workflows/ci.yml` | The only CI run: gates once on push to `main`, then deploy, smoke check and rollback. |
| `.dependency-cruiser.cjs` | Architecture boundaries enforced as a command (`pnpm depcruise`). |
| `apps/web/scripts/verification-map.ts` | Single source of truth for "which check covers which files" (`pnpm verify`). |
| `docs/CONFIGURATION*.md`, `NOTES*.md` | Reference tables **generated from the code** (`pnpm docs:config`) so docs cannot drift. |

## 5. Verification and safety rules that make it trustworthy

- **Touch-scoped verification.** List the touched files and what depends on them, run the checks that cover them, and skip (and say so) the ones whose scope was untouched since their last green entry. Never report a skipped check as verified: write "not re-run: untouched since `<sha>`". Full details in [`docs/TESTING.md`](TESTING.md) and the command `pnpm verify` (`--run`, `--record`, `--stale`).
- **Heavy checks once, at the close** of visual work: the full quick e2e run plus white-label, because a touch-scoped run once missed stale specs in a multi-commit redesign.
- **Budgets are rules, not advice**: JavaScript per page, page weight, Lighthouse thresholds are CI gates ([`docs/TESTING.md`](TESTING.md)).
- **Remote operations need explicit authorization every time**: push, release to `main`, remote branch deletion, anything that talks to a remote machine. A push to `main` deploys to production. Developing locally is never permission to do any of it.
- **Commits**: Conventional Commits, no AI attribution lines, slices of about 400 changed lines with tests and docs alongside the behavior.
- **A changelog entry ships with every visitor-visible or developer-facing change**, in the same work unit; `pnpm changelog:audit` fails a release that forgot one.
- **Verify claims before writing them down**: figures are copied from their source, never derived ([`docs/NOTES.md`](NOTES.md), section 1.2).

## 6. Bootstrap checklist for a new project

Do these in order; each step is small.

1. **Machine.** Follow `agentic-dev-setup` `docs/SETUP.md`. Check `~/.config/agent-routing/active.env` points at working models and that the orchestrator can reach herdr and OpenCode.
2. **User layer.** Confirm `~/.claude/CLAUDE.md` has the orchestration protocol (see "Known gaps"). Without it the loop in section 2 is not enforced.
3. **Repository skeleton.** Create the repo, a `develop` branch, and copy as a starting point: `CLAUDE.md`, `AGENTS.md`, `.mise.toml`, `.github/ISSUE_TEMPLATE/task.yml`, an empty `docs/adr/` with its README, an `odd/` folder, a `docs/TESTING.md` stub with the verification rule.
4. **Write `CLAUDE.md` first**: commands, architecture, workflow (branches, releases, who may push), safety rules. Keep a "Status and commands" block current; do not invent commands, add them when they exist.
5. **Pin tools with mise** and make `packageManager` match.
6. **First ADR**: the stack, written after a measurement when the choice is performance-sensitive (ADR 0001 chose React unmeasured; ADR 0005 reversed it after a one-button measurement, see the Preact note).
7. **Wire the gates before features**: lint and format, typecheck, unit tests, dependency boundaries, then CI that runs them once and deploys on green.
8. **First feature as a tracked task** (`odd/tasks/<feature>.md`) so the loop is exercised on day one, not later.
9. **Add `pnpm verify` early** (a verification map and a ledger), before the number of checks makes running everything too slow.

## 7. The stack, and what to keep or rethink

Defined in the README "Tecnologías" table and [ADR 0001](adr/0001-astro-tailwind-pnpm-monorepo.md), [0003](adr/0003-screaming-architecture-and-core-boundary.md), [0005](adr/0005-preact-for-islands.md).

- **Keep as defaults**: strict TypeScript, pnpm workspaces, mise-pinned versions, Biome, Vitest, Playwright with axe, dependency-cruiser boundaries, one CI run at the release push, Cloudflare Workers for hosting.
- **Rethink per project**: Astro with Preact islands fits a content site; another product may want another framework. Decide after measuring, and write the ADR with a "Reverting" section.
- **Not a default**: a shared package. `@elvinlab/core` stays tokens, themes and i18n; extracting components was evaluated and dropped ([ADR 0019](adr/0019-core-stays-tokens-themes-i18n.md)). Build a second consumer first.

## 8. Failure modes seen in this repository

Each one happened and was fixed; they are listed so the next project starts knowing them.

- **A pipe hid a failed command.** `git push origin develop | tail` showed a clean tail while the push had been rejected, so a release looked sent when it was not. Check the exit code (or use `set -o pipefail`) before reporting a command as done.
- **A test that could not fail.** A layout-shift test measured an element's `y`, which cannot move; measuring the article height did catch the shift (`tests/browser/marks.spec.ts`).
- **A fix that broke a distant selector.** Emptying a container made a structural selector in another spec match it as the "last child"; the CI run failed and the selector was made explicit. Prefer selectors that name what they mean.
- **A command waiting for stdin.** `cat $(grep ...)` with no match waits forever. Quote or guard command substitutions that can come back empty.
- **A decision copied, never measured.** ADR 0001 picked React for consistency with another site; the first island measured 69 KiB against Preact's 7.3 KiB.
- **A derived number presented as a fact.** A note stated a balance computed as 20 - 17.86 while the panel said US$2.13 ([`docs/NOTES.md`](NOTES.md), 1.2).

## 9. Known gaps

- **The user-level protocol is not versioned.** `~/.claude/CLAUDE.md` (the loop, the tiers, the delegation triggers, the remote-operation rule) lives only on this machine. Losing it loses the most valuable layer. Candidate fix: keep a copy in `agentic-dev-setup` (it already ships `home/.claude/delegation-block.md`) and restore it from there. Not done.
- **There is no starter repository.** Section 6 is a manual copy list. A template repository with those files would turn day one into a click; it was not built.
- **gentle-ai manages part of `~/.claude`** (settings, skills). After reinstalling it, re-run `~/.config/agent-routing/restore.sh` and recheck the routing file.
