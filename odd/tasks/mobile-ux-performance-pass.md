# Mobile, UX and performance pass

## Objective and authorization
Implement the findings of the 2026-10-01 UI/UX audit (Lighthouse mobile, screenshots at 390/768/1440 in both themes, source review). The user asked to implement every point on 2026-10-01. Local implementation and work-unit commits on a feature branch only; no push, deployment, remote access or real form submission.

Not implemented on purpose: audit point 7 (the hiring card shows "not available" next to a primary CTA). It is a content decision owned by the user (`recruiter.openToWork`), not a defect.

## Direction and evidence
Brand, tokens, fonts and the WebGL banner concept are settled (`docs/DESIGN.md`); only behavior, sizing and loading change. Audit baseline: mobile Lighthouse 96-100 performance, 100 elsewhere; JS 6-17 KiB gzip of 30; home FCP 2.19 s (0.8 score) with 10 font files and no preload; expanded home banner 557 px on a 390 px phone with the canvas hidden on coarse pointers.

## Execution and checks
- Branch: `feat/mobile-ux-performance-pass` from `develop` (`9300b35`), fast-forwarded into `develop` locally once the pass closed (project workflow, no PR); the local branch was deleted after the merge.
- Route: delegated direct, one writer at a time. Mapping and writing span more than four non-trivial files per unit.
- Strict TDD: enabled (user global config). Runner: `pnpm exec playwright test tests/browser/smoke.spec.ts` for browser behavior and `pnpm --filter web test` (Vitest) for pure logic. Each behavior change needs an observed RED before source changes, then GREEN. Pure copy, docs or class-only visual changes still get a measurable browser assertion where one is feasible (tap-target size, overflow, fold position).
- Delivery: ask-on-risk, forecast 300-420 authored changed lines including tests and docs, three work units. Record the running count; if it passes about 400 before a commit, apply the strategy before that commit.
- RDD: see Progress. Delivery stays under ordinary repository policy.
- Required at each unit close: focused Playwright, `pnpm test`, `pnpm typecheck`, `pnpm lint`, `git diff --check`; at feature close add `pnpm test:e2e`, `pnpm --filter web build`, `pnpm check:js-budget`, `pnpm test:white-label`, `pnpm test:lighthouse`, `pnpm depcruise`. Use `rtk proxy` only if compaction garbles output.
- Copy and documentation follow existing language conventions (UI strings through `shared/i18n`, English twin docs updated when their Spanish source changes).

## Work units
- [x] T1 - Responsive and touch targets
  - Evidence: commit `1286a95`, 30 files, +309/-42 (tests included). Route: delegated (Claude writer, sonnet), diff reviewed by the parent. Tier: parent-owned design decisions (Tier 3).
    - RED (observed): `tests/browser/mobile-ux.spec.ts` 15 of 20 failed first (theme toggle 40px at 390 and 30px at 360, banner toggle under 44px, sun-like galaxy icon, ~40 elements at 12px on `/me/`, breakable "1 min", latest note at 618px of 844 when limit was 590).
    - GREEN: 20 of 20 pass. Parent re-ran: `pnpm typecheck` 0 errors, `pnpm lint` clean, `pnpm test:e2e` 359 passed / 40 skipped (chromium 360/390/1280 projects), `git diff --check` clean.
    - Result: home banner floor 28rem on touch/phone (557px to ~490px at 390px), latest note card starts at ~526px (62% of viewport), desktop banner unchanged (594px at 1280x900, pinned by a test), CLS 0 on both phone sizes.
    - Decision: CSS-only `compactExpandedHeight` prop on `Banner` (defaults to `expandedHeight`, so other banners are untouched). `text-meta` token (13px) replaces `text-xs` for meta and chips; retro wordmark and signature keep 12px.
    - Not covered: `ReadingMode` toggle (`h-9`) and `LanguageHint` link hit areas were out of scope for T1; T3 later gave the reading-mode toggle and exit button a 44px hit area and found `LanguageHint` already compliant.
    - Original brief: Home banner on coarse pointers: shorter expanded height so the latest note starts near the fold (inspect the existing `@media (pointer: coarse)` rule in `Banner.astro` first; keep desktop geometry unchanged).
  - Navbar icon buttons reach 44 x 44 px (`shrink-0`, tighter gap); distinct icon for the background picker versus the theme toggle.
  - Footer links, "all notes" link and the banner expand button reach a 44 px hit area without changing visible layout.
  - Mono meta and chips at least 13 px; note meta segments do not orphan ("5 / min").
- [x] T2 - Performance and documentation drift
  - Evidence: committed with this document update (subject `perf: preload fonts, optimize avatar, pause banner offscreen, prefetch on hover`). 16 tracked files +107/-27 plus 4 new files (~306 lines): about 440 authored lines, slightly over the 400 heuristic because ~70% is new tests; nothing trimmed. Route: delegated (Claude writer, sonnet), parent reviewed the diff and re-ran the checks.
    - RED then GREEN (writer-observed): `gl-runner.test.ts` 2 of 3 failed then 3 of 3 pass; `performance.spec.ts` 7 of 8 failed (control passes) then 8 of 8 pass; 5 avatar schema cases failed and `avatar.ts` did not exist; the new `og-images.test.ts` case failed first.
    - Parent re-run: `pnpm typecheck` 0 errors, `pnpm lint` clean, `pnpm test` 34 + 483 passed, `pnpm --filter web build` ok, `pnpm check:js-budget` pass (home 7.33 KiB of 30), `pnpm test:white-label` pass, `pnpm depcruise` no violations, `pnpm test:e2e` 367 passed / 56 skipped, `git diff --check` clean.
    - Lighthouse (writer, mobile median of 3, fixture server, no compression): `/` and `/en/` performance 0.98 (was 0.96), FCP 1.74 s (was 2.19 s), LCP 2.26 s unchanged, CLS 0, `modern-image-formats` 0 bytes savings, fonts no longer in a late CSS chain.
    - Decisions: only the two Latin variable woff2 are preloaded. `identity.avatar` is now a bare file name resolved in `apps/web/src/assets` (breaking for forks that used a `public/` path; schema regex rejects paths, docs and `docs:config` tables updated); missing file fails the build. Prefetch is `hover` with `prefetchAll` (Astro also covers focus and falls back to tap on data-saver). DESIGN.md now states there are no page transitions. `dev-cold-start-check.ts` adds a `server.fs.allow` patch only inside its isolated workspace (symlinked node_modules put the font files outside Vite's root).
    - Known limit: LCP did not move; it is the hero `<h1>` text, so the remaining lever is the HTML/CSS path, not fonts or images.
    - Original brief:
  - Preload the Latin Space Grotesk and JetBrains Mono woff2 files in `BaseLayout`.
  - Avatar through Astro `<Image>` (webp/avif, explicit dimensions) keeping the white-label contract (configured image path, initials fallback).
  - `gl-runner.ts`: resume on visibility only while the banner intersects the viewport.
  - Enable Astro `prefetch` (hover/tap strategy) and make `docs/DESIGN.md` (and its English twin if any) state what the code really does about page transitions; no unrequested View Transitions.
- [x] T3 - Interaction polish
  - Evidence: committed with this document update (subject `feat(ui): copy button strip, menu closes on navbar hide, single contact intro`). 10 tracked files +67/-26 plus `interaction-polish.spec.ts` (202 lines): about 295 authored lines. Route: delegated (Claude writer, sonnet), parent reviewed the diff and re-ran the checks.
    - RED then GREEN (writer-observed): copy button 40px then 44px; "alpha" overlapped 25.6x18px and "bravo" 40x6.5px at 390px then no overlap; `aria-expanded` stayed `true` when the navbar hid then closes; navbar stayed hidden on focus then reveals; contact unit tests 3 failed then 484 pass; reading toggle and exit button hit-area probe failed then pass. The keyboard-focus guard has a manual RED (guard removed, test failed, restored). `LanguageHint` was already 44px (link `min-h-11`, dismiss `size-11`), no source change, that test never went RED.
    - Feature-close checks (parent): `pnpm typecheck` 0/0, `pnpm lint` clean, `pnpm test` 34 + 484 passed, `pnpm --filter web build` ok, `pnpm check:js-budget` all pages PASS, `pnpm test:white-label` pass, `pnpm depcruise` no violations, `pnpm test:e2e` 377 passed / 76 skipped, `pnpm check:dev-cold-start` 7 routes ok, `pnpm test:lighthouse` completed with no assertion failures, `git diff --check` clean.
    - Decisions: on touch devices (`hover: none`) the copy button sits in its own 3.5rem strip above line 1 instead of over text (costs about 40px height per code block there); mouse devices keep the upstream hover-only button. Navbar scripts merged into one; the navbar never hides while focus is inside it. The contact page keeps one intro sentence (the richer one, now `pageDescription` in `text-text-secondary`); the `intro` field is removed. `tests/fixtures/notes/smoke-es` gained two code blocks so overlap is measurable.
    - Original brief:
  - Code-block copy button no longer covers code text on mobile.
  - Mobile menu closes when the navbar auto-hides and the navbar reveals on `focusin`.
  - Remove the duplicate sentence on `/contact` (`features/contact/content.ts`) in both locales.
  - Update `docs/DESIGN.md` for the above and record evidence.

## Progress and next step
Branch created, document written. RDD: off (clone-local), delivery `disabled/unmanaged`; no native review, mode untouched. Engram mirror: `odd/mobile-ux-performance-pass/tasks`. T1 done (`1286a95`). Running authored count: 351 lines (309 added, 42 removed, including the new spec and this document). Delivery note: this repo ships by fast-forward of `develop` into `main` with no PR (ADR 0012), so there is no PR review slice to size; the chain-strategy question does not apply and the count is recorded only. T2 done (see its evidence). Running authored count: about 790 lines across two units. T3 done. Running authored count: about 1085 lines across three units (each unit is under or near the 400 heuristic; T2 slightly over because of tests). All required feature-close checks green on the branch. Merged into `develop` by fast-forward (local only; commits `1286a95`, `99344b2`, `b58b437`), NOT pushed and NOT released to `main`, so nothing is deployed. Pending, owned by the user: push `develop` and the release push to `main`. The pixel display font experiment (`odd/tasks/pixel-display-font-experiment.md`, `de925b2`) was adopted by the owner and merged on top of this pass. Open follow-ups: audit point 7 (hiring card content decision); LCP is the hero `<h1>` and did not move (2.26 s in the fixture); measure real-GPU banner cost and INP; screenshots at 360 and 1024 px were not part of the audit. Engram mirror: `odd/mobile-ux-performance-pass/tasks`.

## Route declaration
T1-T3: delegated direct, one Claude writer per unit; trigger evidence: more than four files to understand and 2+ non-trivial files per unit.
