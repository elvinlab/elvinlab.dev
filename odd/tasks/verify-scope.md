# Feature: `pnpm verify`, the touch-scoped verification as a tool

## Objective
The rule in `docs/TESTING.md` ("Touch-scoped verification") must not depend on memory or judgment. A command reads what changed and runs only the checks that cover it: the e2e specs of the affected areas, the Lighthouse URLs whose page bytes could change, and the cheap families (types, depcruise, docs:config, build, budgets, white-label, cold start) only when their scope was touched. Everything it runs or skips is recorded, so the next run knows what is still green.

## Why
Owner, 2026-10-05: "pruebas e2e, lighthouse etc solo prueben lo que afecten". Today the full e2e takes about 1.5 minutes and Lighthouse about 4, and both were repeated after changes that could not affect them. `codegraph affected` follows imports only and finds no page-level spec, so the e2e and Lighthouse part needs a declared map, kept honest by tests.

## Design
- `apps/web/scripts/verification-map.ts`: the single source of truth, typed. Areas with `scope` globs (source files), the e2e specs that cover them, the Lighthouse URLs they can affect, and flags (`responsive`: run three viewports; `wide`: run everything). A "wide" list (dependencies, toolchain and build config, global CSS and tokens, `BaseLayout`, i18n shape, `fixture-workspace.ts`) selects the whole stack.
- `apps/web/scripts/verify-scope.ts` (CLI, `pnpm verify`): detects changes (uncommitted by default, `--since <ref>` for a committed range, `--all` to force everything), builds the plan with pure functions, prints it (dry run by default) and with `--run` executes it:
  - unit: `vitest related` on the changed sources plus the changed test files;
  - lint: `biome check <changed files>`;
  - types: whole `pnpm typecheck` only when TypeScript, Astro, schema, config or type files changed;
  - depcruise: when files were added, moved or removed or an `import` line changed;
  - docs:config: when the schema or `env-vars.ts` changed;
  - build, js-budget, white-label, cold start: by the map's flags;
  - e2e: `playwright test <specs>`, one viewport (`chromium-1280`) unless the area is `responsive` or `--viewports all`;
  - Lighthouse: only the affected URLs (`run-lighthouse-ci.ts` gains a `--url <path>` filter that writes a temporary config with the filtered list).
- Registry, machine readable: `odd/verification-state.json`. After a green run with `--record`, each check (a family, an e2e spec, a Lighthouse URL) stores a fingerprint of its scope: a hash of the path and content hash of every tracked or untracked non-ignored file matching its globs. A check is fresh when its current fingerprint equals the stored one, independent of commits, amends or rebases. `pnpm verify --stale` plans exactly the checks whose fingerprint differs (what a release needs). `odd/verification-ledger.md` stays the human narrative.
- Drift guards (unit tests): every spec under `tests/browser/` is referenced by at least one area or declared `always` or `manual`; every referenced spec and every Lighthouse URL exists (URLs must be in `lighthouserc.json`); no glob matches nothing.
- Docs: `docs/TESTING.md` explains the command and points to the map as the source of truth; `CLAUDE.md` rule mentions `pnpm verify`.

## Known limit to refine in V1
The i18n dictionary is one file, so any edit would make every text-rendering spec stale. The planner treats a diff that only ADDS keys to the dictionary as not affecting existing pages (it only affects the specs of the area that uses the new keys); a modified or removed key is a real change. The hand-written map can miss a dependency and skip a check that mattered: the drift guards catch the structural gaps, and CI on `main` is the backstop for the rest.

## Authorized scope
Local implementation on `develop`. No push, no release, no remote operation. One writer at a time: starts after the marks UI task (M3 of `odd/tasks/marks.md`) is committed, because both would edit the working tree.

## Tasks
- [x] V1 Map and planner: `verification-map.ts`, pure planning functions (change detection input in, plan out), unit tests including the drift guards; dry-run CLI.
- [x] V2 Runner: execute the plan (unit, lint, types, depcruise, docs:config, build, budgets, white-label, cold start, e2e specs, Lighthouse URL filter), exit code and summary table; `--run`.
- [x] V3 Registry: fingerprints, `--record`, `--stale`, `odd/verification-state.json` seeded by one real full run.
- [x] V4 Docs and rule: `docs/TESTING.md`, `CLAUDE.md`, ledger note, changelog (tooling).
- [ ] V5 Validation on real changes: replay three past commits (a docs-only one, a note-page one, a contact one) and compare the plan with what was really needed.

## Acceptance
Owner's example (2026-10-05): running the whole battery for the footer when it was not touched "desde hace rato" is not worth it. What counts is the content of a check's scope, never the time: if the files a check depends on are byte-identical to what they were when it last passed, it is fresh and is not planned, however many other areas changed since. Concretely: with `Footer.astro` and its dependencies unchanged, no footer-related spec or check is planned even when notes code changed; touching `Footer.astro` plans the specs that render the footer and nothing unrelated. A page-level spec has the sources of everything its page renders in its scope, so it goes stale when any of them changes.
A docs-only change plans lint only. A change to `ContactForm.tsx` plans the contact spec and the contact unit tests, no notes specs and no Lighthouse unless page bytes changed. A change to `global.css` is wide. The planner never schedules less than the manual impact map in `docs/TESTING.md` for the replayed commits.

## Progress
Designed 2026-10-05, built the same day. V1 to V3 by one delegated writer with a 15 minute time box and scoped verification only; reviewed by the parent (its tests re-run: 30 passed, typecheck, lint, dry runs). 30 unit tests include the drift guards (all 29 specs mapped, every Lighthouse path in `lighthouserc.json`, no empty scope). Dry runs reported by the writer in a scratch copy: a docs-only file plans lint only; a `ContactForm.tsx` edit plans 22 checks (contact and shared specs, contact Lighthouse URLs only, no notes specs); the full `--stale` pass with a registry costs about 0.26 s. The tool's own files are a wide change, so the runner itself was proven in a scratch copy (a lint-only run, `--record` writes the registry, the next dry run reports "fresh").
- Known limits: Biome cannot check Markdown, so a docs-only change plans `lint` and runs nothing; the e2e map is conservative (about 10 specs have narrow scopes, the rest map to every page, so a footer change selects nearly all of them); the width-dependent spec set was guessed (calm-pages, focus-not-obscured, interaction-polish, marks, mobile-ux, notes-layout, pixel-display, reading-mode, type-scale).
- Left: V5 (replay three past commits against the plan) and the first real `--all --run --record` that seeds `odd/verification-state.json` (about a full battery of time; best done once after the current design changes).
