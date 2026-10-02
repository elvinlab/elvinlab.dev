# Pixel display font experiment

## Objective and authorization
Prototype Pixelify Sans as a second, readable pixel face for the home hero headline and section titles, so the owner can judge it on screen before touching `docs/BRAND.md`. The user approved a separate-branch trial on 2026-10-01. Local branch and commits only; no push, merge, deploy or remote access. Installing the one Fontsource dependency is authorized.

## Direction and constraints
- Press Start 2P stays the brand mark (navbar wordmark, footer signature, 404). Space Grotesk stays body and UI; JetBrains Mono stays code and entry numbers.
- Pixel type only for short, large text: home hero `h1` and section titles (`h2` with the accent bar). Never paragraphs, notes prose, navbar items or form text.
- Self-hosted via Fontsource, latin only, at most two weights; not preloaded on every page unless it is above the fold (the hero is).
- Theme-driven: the face goes through a core font token, no hard-coded family in components (white-label).
- No horizontal overflow at 360/390/768/1280; hero stays readable (pixel faces are wider than Space Grotesk). JS budget and CLS unchanged.
- `docs/BRAND.md` is not edited here; the result is judged first. If kept, a follow-up updates BRAND.md and DESIGN.md. (Kept: that follow-up landed on 2026-10-01, see `docs/BRAND.md` Tipografía and `docs/DESIGN.md` Type.)

## Execution and checks
- Branch: `exp/pixel-display-font` from `feat/mobile-ux-performance-pass` (`b58b437`). Outcome: fast-forwarded into `develop` (pushed to `origin/develop` with the minimal preset on 2026-10-01, released to `main` as `c62dfb4` on 2026-10-01) after the owner adopted it; both local branches were deleted after the merge.
- Route: delegated direct, one Claude writer; spans more than four files.
- Strict TDD: enabled (user global config). Runner: `pnpm exec playwright test tests/browser/<file>.spec.ts` and `pnpm --filter web test`.
- Required: focused Playwright, `pnpm test`, `pnpm typecheck`, `pnpm lint`, `pnpm --filter web build`, `pnpm check:js-budget`, `pnpm test:white-label`, `pnpm depcruise`, `git diff --check`; Lighthouse compared with the T2 baseline (perf 0.98, FCP 1.74 s, LCP 2.26 s).
- RDD: off (clone-local), unmanaged.

## Work unit
- [x] E1 - Pixelify Sans on hero and section titles, behind a core font token, with tests, screenshots and a measured performance delta.
  - Evidence: committed on `exp/pixel-display-font` as `de925b2`, later merged into `develop` (see Progress). 11 files +59/-11 plus `pixel-display.spec.ts` (103 lines). Route: delegated (Claude writer, sonnet); parent reviewed the diff and screenshots and spot-checked.
    - RED then GREEN (writer-observed): hero/section computed family 8 failures then pass; Pixelify face loaded; latin preload present and 200; home preload count 3; core token 3 failures then 37 pass. Guards (no overflow at 360/390/768/1280, prose and note titles not pixel, `/notes/` no preload) passed from the start.
    - Writer full run: `pnpm test:e2e` 397 passed / 116 skipped; unit web 484, core 37; typecheck, lint, build, js-budget (`/` 7.26 KiB), white-label, depcruise, dev-cold-start all green. Parent spot check: pixel + mobile-ux specs 40 passed (chromium-1280), core 37, typecheck 0/0, lint clean, `git diff --check` clean.
    - Cost: latin woff2 ~12 KB preloaded on home only; Lighthouse mobile home perf 0.97 (was 0.98), LCP 2.34 s (was 2.26 s), FCP and CLS unchanged; part may be noise (a page not using the face moved too).
    - Choices: weight 600 from the single variable file (400/500 thin, 700 closes the `e` counters); hero `text-4xl md:text-6xl` with `text-balance`; section titles `text-2xl`. `SectionHeading` is shared, so `/me` section titles are pixel too.
    - Parent visual judgment: coherent with the Press Start 2P wordmark, but the pixel `e` reads like a reversed `e` at hero size ("engineer"), the hero is louder than before (it conflicts with the minimalist direction and the "text too large" feedback), and `text-balance` leaves "Full-stack" alone on the first line. Section titles work well. Leaning: keep the pixel face for section titles and small labels, keep the hero in Space Grotesk, or use it at a much smaller size. Owner decides; BRAND.md untouched.

## Progress and next step
E1 done. The owner reviewed the trial on screen and kept it as built, hero included (the parent's leaning above to narrow it was not followed). It is merged into `develop` by fast-forward (pushed to `origin/develop` on 2026-10-01, released to `main` as `c62dfb4` on 2026-10-01). BRAND.md and DESIGN.md were updated on 2026-10-01 (decision date 2026-10-01). Known caveat carried forward: the pixel `e` is less legible at hero size; revisit with the minimal type scale. Next: the minimalist preset and smaller type scale (see `odd/tasks/elvinlab-site.md`). Engram mirror: `odd/pixel-display-font-experiment/tasks`.

## Route declaration
E1: delegated direct, one Claude writer; trigger evidence: more than four files (core token, layout, hero, section title component, config/package, tests).
