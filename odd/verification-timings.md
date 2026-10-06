# Verification timings

Owner, 2026-10-05: verification time is the biggest development bottleneck. This file records the baseline, what changed, the target and the measurements. Rule: no gate got weaker. CI thresholds, budgets, assertions and `numberOfRuns: 3` of `lighthouserc.json` are unchanged; only local cost and CI start-up cost went down.

## Baseline, local (2026-10-05)

Measured on 12 cores with `pnpm verify --all --run`.

| Check | Seconds | Target |
| --- | ---: | --- |
| Lighthouse, 6 URLs x 3 runs | 198 | 6 URLs x 1 run, about 66 (layout-wide: 2 URLs, about 30) |
| e2e at 3 viewports (11 specs) | 64 | one invocation, `workers: '100%'` |
| e2e at 1280 px (20 specs) | 33 | merged into the line above (one fixture server) |
| dev cold start | 25 | skipped by layout-wide changes |
| typecheck | 11 | unchanged |
| everything else (lint, unit, depcruise, docs:config, build 4.7, budgets, white-label) | under 5 each | unchanged |
| **Total** | **340** | **about 140 for a full local run; about 115 for a layout-wide change** |

## Baseline, CI (2026-10-05)

Run `37390786594` on `main`, read with `gh`. Critical path: e2e, then `checks`, then `deploy`, about 6.5 min.

| Job | Seconds | Notes |
| --- | ---: | --- |
| e2e | 355 | `pnpm test:e2e` 306, Chromium install 21 |
| lighthouse | 259 | budgets 222, Chromium install 25; parallel, not on the critical path |
| static | 44 | typecheck 17 |
| checks | 4 | |
| deploy | 32 | |

## What changed

1. `pnpm verify` runs Lighthouse with `--runs 1` (new option of `run-lighthouse-ci.ts`; the default stays 3, so `pnpm test:lighthouse` and CI are unchanged). The per-URL scoping stays.
2. The wide list is split. Full-wide (dependencies, toolchain and config, the verification scripts) still selects everything. Layout-wide (global CSS, tokens, `shared/layout/**`, i18n structure) selects the cheap families, every e2e spec at 1280 px and Lighthouse for `/` and `/notes/smoke-es/` only: no three-viewport reruns, no dev cold start. `--all` and `--viewports all` remain the explicit way to run everything.
3. One Playwright invocation per plan instead of two (`E2E_WIDE_SPECS` narrows the 360 and 768 px projects to the width-dependent specs; unset, nothing is narrowed). `workers` went from `'50%'` to `'100%'`; two consecutive runs of 4 spec files stayed green (253 passed each, 57 s and 55 s).
4. `pnpm verify --run` prints `elapsed <n>s (full stack baseline 340 s: saved <p>%)`; `--files <paths>` simulates a change set.
5. CI: pnpm store cache (key: `pnpm-lock.yaml`), Playwright browser cache (key: Playwright version), the e2e job sharded with `--shard=N/3` (since 2026-10-06: 4 shards, see below) (white-label, `version.txt` and the image check run in shard 1 only; `checks` still needs the whole matrix), and each job appends its duration to the run summary.

## Measured after

| Scenario | Seconds | Saved vs 340 s | Date and notes |
| --- | ---: | ---: | --- |
| Layout-wide plan (simulated `shared/layout/Navbar.astro`, `--files`), build family fresh in the registry so not run | 115 | 66% | 2026-10-05: lint 0.2, typecheck 11, unit 3, e2e 31 specs at 1280 px 70, Lighthouse 2 URLs x 1 run 30 |
| Full local stack (`--all`) | 247 | 27% vs 340 s | 2026-10-05 after the speed-up: one merged e2e run (122 s instead of 33 + 68) and Lighthouse at 1 run (72 s instead of 199 s); typecheck 12, cold start 25. The saving of `--all` is modest by design: the big wins are the change-scoped plans |
| (note on the row above, original text) | | | the speed-up targets the change-scoped plans; `--all` still runs everything on purpose (about 344 s on 2026-10-05, before the change) |
| CI e2e critical path (slowest shard) | 163 | 54% vs 355 s | 2026-10-05, run 37396687889 on `4910e5d`: shards 122, 152 and 163 s (was one job of 355 s) |
| CI whole pipeline (slowest gate + checks + deploy) | 326 | 17% vs 391 s | static 46, lighthouse 275, e2e 163 (slowest shard), checks 2, deploy 49. Lighthouse is now the longest gate; this was the first run, with cold caches, so the cache saving is not yet visible |

## CI durations

Each job writes `<job>: <n>s` (the e2e shards one line each) to its run's step summary, so every run on `main` records its own timings. The CI baseline above is the only CI number so far; the first after-numbers are above; compare the next run, when the caches are warm, the first run with the caches warm (the first run populates them and will not show the saving). No CI figure here is estimated.

## CI baseline of 2026-10-06 and sharding (V7)

Baseline, run 37482889047: `lighthouse` 265 s (about 70 s setup, about 195 s for 6 URLs x 3 runs), `e2e` shards 143, 143 and 222 s, `static` 65 s, `deploy` 59 s; whole pipeline 328 s.

Change: Lighthouse runs as 2 shards (`--shard N/2`, every 2nd URL of `lighthouserc.json`; still 3 runs per URL, no threshold or assertion touched) and `e2e` goes from 3 to 4 shards. Local `pnpm test:lighthouse` and `pnpm verify` are unchanged.

Expected effect (not measured): Lighthouse about 170 s per shard (setup plus half the URLs). The e2e total is about 530 shard-seconds; divided by 4 plus setup, the critical path should be about 150 to 170 s. Playwright shards by test, but if its assignment is by file the balance may again be uneven. Whole release expected to gain roughly 100 s over the 328 s pipeline once both changes are measured.

| Scenario | Seconds | Notes |
| --- | ---: | --- |
| CI after (Lighthouse 2 shards, e2e 4 shards) | pending | first CI run on `main` after this change; the 4-shard timings are pending |
