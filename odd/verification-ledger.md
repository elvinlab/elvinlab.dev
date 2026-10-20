# Verification ledger

## /me portfolio M4–M6 (2026-10-16)

Experience contributions (M4), curated notes with an "Article in Spanish" label (M5) and a specific `/me` title and description (M6) delivered on `develop` (commits bc9b476, 289a6b9, c7b873a). Layout-wide verification (`pnpm verify --since 581819e --run --record`) ran three times: lint, typecheck, depcruise, docs:config, unit (1750), build, js-budget, page-weight (47 pages), white-label and e2e (71 specs) green each time; `/me` and `/en/me` Lighthouse green. The only recurring failure is `/education/` performance 0.94 vs 0.95 on the local 1-run Lighthouse — pre-existing and untouched by this work, green on the 3-run median for both `/education/` and `/en/education/`. Not recorded (the run was not green); CI runs 3 runs per URL and is the backstop.

## CI recovery candidate evidence (2026-10-13)

Candidate: the interrupted release fix and notes-only lane hardening, including the feature-aware navbar specs and the documented changelog HTML allowance. These are observed local results, not a claim that a new production release or GitHub profile job has passed.

- Independent verification: full unit suite passed (44 core + 1727 web tests); focused nine-file script run passed 147 tests; changelog browser spec passed 6 tests.
- Full typecheck initially found two TS4111 errors in the new smoke test. Bracket property access fixed them; the rerun passed with zero errors, warnings or hints, and all 47 affected script tests passed.
- Direct Biome checks passed (602 files), architecture passed (332 modules / 877 dependencies), actionlint and shell syntax passed, and the source diff is whitespace-clean. RTK's Biome parser produced unusable failures; the identical direct commands passed without source fixes.
- Fresh build, JS budget and page-weight budget passed for 42 pages. Compiled-note validation passed for nine enabled notes with three explicit pre-existing link warnings (the English 404 and subscribe-result note-index targets).
- Changelog HTML: ES 128899 B and EN 128595 B, against a bounded 129000 B ceiling. The 128690 -> 129000 B change covers measured editorial markup growth from the release entries; CSS and JS ceilings did not change. ES headroom is 101 B after final wording.
- Smoke regressions cover blog-on/off, invalid feature flags, language fallback and missing index/feed/note failures using local HTTP only. Seven executions of the actual workflow selector with mocked compare responses proved notes-only selection, full-lane fallback, removed-note filtering, failed lookup rejection and the 300-file boundary.
- Owner explicitly deferred all four full profile suites and Lighthouse to real CI. Inspect every profile outcome separately: informational profile failures do not necessarily fail the aggregate gate.
- A mixed code release intentionally skips the actual `notes-gate` GitHub job. This record proves its components and selectors locally; execution of that conditional job requires a genuine future notes-only publication. No synthetic production push was made solely to exercise it.

The forthcoming main CI run is the source of truth for profile, Lighthouse and deployment outcomes. This pre-release record does not convert those deferred checks into local passes.

## Historical release evidence (2026-10-12)

2026-10-12 reconciliation: release `ce5bdeb` matches the audited local tree. Existing [CI run 38322066089](https://github.com/elvinlab/elvinlab.dev/actions/runs/38322066089) passed its required gates and deploy. This is existing CI evidence, not a new local run.

- The CI run provides current release proof for static checks, browser shards, Lighthouse shards, required checks and deploy. It does not convert earlier failed/partial local runs into new local passes.
- Lighthouse note-fixture exception lifted on 2026-10-20 (after the deferred code stylesheet): `/notes/smoke-es/` is back to performance ≥ 0.95 and LCP ≤ 2700 ms like every other path. Since 2026-10-13 LCP and the performance score gate on the median of the three runs (owner decision), the other categories stay pessimistic. Follow-up: #119.
- The seeded per-family table and measurements below are historical local evidence, not the latest CI baseline. Consult the current release run and scope fingerprints in `odd/verification-state.json` before deciding whether local checks need rerunning.
- This reconciliation changes passive documentation only; its focused documentation checks are recorded in the reconciliation task tracker, not as an application-wide verification run.


The repository rule is in [`docs/TESTING.md`](../docs/TESTING.md), section "Touch-scoped verification": verify what a change touches, record it, and do not repeat a check whose scope was untouched since its last green entry. Update this file in the same commit as the change it records.

## Historical local seed: last green commit per check family (2026-10-05)

A check is **stale** when files in its scope changed after its last green commit: `git diff --name-only <sha>..HEAD -- <scope>` prints something. Seeded on 2026-10-05 from the records of that day (commits are exact where a run was made on a clean commit; the Lighthouse and e2e rows were run on the working tree of that commit).

| Check | Last green | Result | Scope (a change here makes it stale) |
| --- | --- | --- | --- |
| `typecheck` | `9cc53c1` | 0 errors | `**/*.ts`, `**/*.tsx`, `**/*.astro`, `tsconfig*.json`, `package.json`, `pnpm-lock.yaml` |
| `lint` | `9cc53c1` | clean | any file Biome checks (`*.ts`, `*.tsx`, `*.astro`, `*.json`, `*.css`) |
| `unit` (`pnpm test`) | `9cc53c1` | 37 + 780 passed | the files each test imports (`vitest related`) |
| `depcruise` | `9cc53c1` | 0 violations (196 modules) | added, moved or removed source files and edited imports |
| `docs:config` | `9cc53c1` | no drift | `shared/config/schema.ts`, `env-vars.ts`, the notes frontmatter schema |
| `build` | `9cc53c1` | complete | source, content (`content/**`), config of Astro, Vite, Tailwind, Wrangler |
| `check:js-budget` | `addc4ac` | 17 pages PASS; note pages 12.84 KiB (22.56 with the Preact island, before the rework) | client JavaScript, islands, scripts, client dependencies |
| `test:white-label` | `9cc53c1` | passed (with the no-marks-markup assertion) | schema, `site.config.ts`, fixtures, identity text in templates |
| `check:dev-cold-start` | `07ae27d` | 7 routes | dev dependencies, Vite configuration |
| `test:e2e` (whole suite, 3 viewports) | `61ae176` | 548 passed, 247 skipped by annotation | the area each spec covers (see the impact map). Since then only the notes area and the privacy page were re-run, see the rows below |
| `test:lighthouse` | `addc4ac` | worst LCP `/notes/smoke-es/` 2268 ms, performance 97 to 99 | HTML or CSS bytes of a gated URL |

Lighthouse baseline at `addc4ac`, with the footprint button (document size, worst LCP of 3 runs; before the button, at `61ae176`, in brackets): `/` 74.1 KB, 2213 ms (74.0, 2215); `/en/` 74.0 KB, 2189 ms (73.9, 2189); `/contact/` 66.8 KB, 1815 ms (66.7, 1813); `/en/contact/` 66.6 KB, 1962 ms (66.6, 1814); `/notes/` 69.3 KB, 1962 ms (69.2, 1961); `/notes/smoke-es/` 87.8 KB, 2268 ms (83.0, 2265). Budget 2500 ms. The contact pages sit on a byte boundary: about 100 bytes of global CSS flip them by about 150 ms (it was `/contact/` once, `/en/contact/` now), still far from the budget; the note page is the one to watch (about 230 ms of margin).

## Verified changes

| Date | Commit | Change | Ran | Not re-run (why it was safe) |
| --- | --- | --- | --- | --- |
| 2026-10-05 | `07ae27d` | pre-release baseline | the whole battery, 11 steps, all green | none |
| 2026-10-05 | `304b309` | note 003 (content, changelog, trackers) | `docs:config`, typecheck, lint, unit, depcruise, real build, js-budget (17 pages), quick e2e 256, simulated-phone LCP of the new note | white-label, cold start, Lighthouse: no code, schema or shared markup changed |
| 2026-10-05 | `88f054a`, `79bdde3` | `og:title` without the site suffix; framed images (`.prose img`) | typecheck, lint, unit, depcruise, full e2e 540, Lighthouse (worst LCP unchanged at 2265 ms), `docs:config` | white-label, cold start: schema and build graph unchanged |
| 2026-10-05 | `744a833`, `61ae176` | X and WhatsApp share links, two-row panel | lint, typecheck, unit, depcruise, full e2e 548, Lighthouse (note document 80.8 to 83.0 KB, worst LCP 2265 ms) | js-budget: the share script did not change; white-label, cold start |
| 2026-10-05 | `7ab9c9c`, `ae87ccd` | `features.marks` flag and block; marks server, D1 adapter, actions | typecheck, lint, unit 729, depcruise, `docs:config`, build, white-label | e2e and Lighthouse: no page markup, CSS or JavaScript changed yet (the flag renders nothing until the UI exists) |
| 2026-10-05 | `f78a087`, `addc4ac` | marks UI (plain script component, no island, CSS inlined once; privacy tooltip), privacy reassurance next to the comments, privacy page section, ADR 0013 | typecheck, lint, unit 780, depcruise, `docs:config`, build, js-budget (17 pages), white-label; e2e at 1280: notes-layout, note-share, link-previews, note-translations, reading-mode, calm-pages, card-links, focus-not-obscured, a11y, comments, legal, internal-links, smoke, mobile-ux, external-links (174 passed); marks spec at 3 viewports (130 passed, 32 skipped by annotation); Lighthouse once (table above) | contact, home and `/me` e2e specs: their code did not change (their pages only grew about 100 bytes of global CSS, covered by Lighthouse); the whole 3-viewport suite; cold start: no dependency added |
| 2026-10-05 | `dcc82c7`, `9cc53c1` | marks table, binding and migration renamed for the site-wide database `elvinlab-dev-db` (`SITE_DB`, `note_footprints`); D1 database created and migrated in the owner's Cloudflare account | typecheck, lint, 249 related unit tests, `docs:config`; remote: tables and row counts of the new and the old database before deleting the old one | e2e and Lighthouse: no page markup, CSS or JavaScript changed; build and white-label were re-run in the release preparation below |
| 2026-10-05 | release preparation on `9cc53c1` plus the changelog text | what the ledger showed stale since the last release (`079674b`): typecheck, lint, the whole unit suite (37 + 780), depcruise, `docs:config`, build, white-label; changelog audit of the `feat` commits since `2412177` (all covered, one entry extended for forks) | none of the fixture-visible checks | js-budget, Lighthouse, cold start: scope untouched since `addc4ac` and `07ae27d` (no client JavaScript, page bytes or dependency changed); the e2e specs of unrelated areas; the CI on `main` runs the whole stack before it deploys |
| 2026-10-05 | `950e582` (release) | the release to `main` | CI on `main` ran the whole stack once: `static`, `e2e`, `lighthouse`, `checks` and `deploy`, all success (run `37390786594`); then read-only checks on production (below) | none |
| 2026-10-05 | `0422bdb`..`aa34e2d` | tooltip dismissal, `pnpm verify`, brand icon (terminal), pixel heart and favicon, home footprint card, heartbeat | the whole battery once (`pnpm verify --all --run --record`, 344 s, all green; it seeded `odd/verification-state.json`), then focused e2e (marks, home-marks, brand-mark, smoke, favicon) and Lighthouse of `/` and `/notes/smoke-es/` after the last CSS change: worst LCP 2295 ms and 2286 ms (budget 2500) | nothing skipped; the heartbeat commit only re-ran its own scope |
| 2026-10-05 | verification speed-up (CI shards, workers 100%, layout-wide plan, `--runs 1`) | tooling and CI, no site code | biome, typecheck, unit 823, e2e twice at `workers: '100%'` (253 passed, 57 s and 55 s), a simulated layout-wide plan (115 s against the 340 s baseline); CI changes unmeasured until the release run | the full Lighthouse and the 3-viewport reruns: tooling does not change a page |
| 2026-10-05 | phone fixes (hero padding clear of the expand button, shorter footprint cap and tooltip copy) | CSS in `Banner.astro` and two i18n strings | biome, e2e of `mobile-ux`, `marks`, `home-marks`, `calm-pages` (224 passed) | the rest of the battery: the owner asked to ship; CI on `main` runs the whole stack |
| 2026-10-05 | `24fa280`..`a`-series (email subscription, flag off) and the a11y helper fix | `features/subscribe` (domain, D1, Resend, actions, pages, form, privacy section), migration 0002, `SUBSCRIBE_RATE_LIMITER`; the axe helper now waits for Expressive Code to make scrollable blocks focusable | the whole battery, green: `pnpm verify --all --run --record` (247 s, 47 checks recorded): lint, typecheck, depcruise, docs:config, unit 914, build, JS budget (`/notes/` 8.99 KiB), white-label, dev cold start, e2e 32 specs (1280 px, 3 viewports for 12), Lighthouse 6 URLs, 1 run: worst LCP `/` 2285 ms, note 2265 ms, `/notes/` 2113 ms (was 1962 ms, +150 ms with the form on in the fixture), contact 1811 ms; two full e2e runs with 848 passed after the helper fix | nothing skipped; the local D1 acceptance flow through wrangler and an English notes index are not covered (see `odd/tasks/subscribe.md`) |
| 2026-10-05 | footer subscription band (global, pixel style, calmer variant) and its a11y fix | `shared/layout/Footer.astro` and `BaseLayout.astro` (layout-wide), `shared/layout/subscribe-cta.ts`, BRAND row | `pnpm verify --stale --run --record` green (223 s, 45 checks recorded): lint, typecheck, depcruise, unit, build, JS budget, white-label, e2e 32 specs (628 passed), Lighthouse 1 run: `/` 2284 ms, note 2262 ms, `/notes/` 2112 ms, contact 1962 ms (was 1811: the known 150 ms byte-boundary step of the contact pages, far under 2500) | docs:config and the dev cold start: untouched since the last full run |
| 2026-10-05 | subscription form moved into the global footer (`shared/subscribe/`), consent copy for notes and project announcements, approved `/privacy` text, terminal-style email field, distinct footer label and honeypot name | `shared/subscribe/**`, `Footer.astro`, `BaseLayout.astro`, i18n, privacy content, resend adapter copy, tests | `pnpm verify --stale --run --record` green (228 s, 46 checks recorded): lint, typecheck, depcruise, docs:config, unit 918, build, JS budget, white-label, e2e 32 specs, Lighthouse 1 run: `/` 2288 ms, note 2263 ms, `/notes/` 2113 ms, contact 2112 ms (budget 2500); CLS 0.041 on the note equals the earlier baseline. Earlier red runs were two real collisions with the contact form (shared accessible label, a placeholder containing an at-sign, a shared honeypot name), fixed, and one self-inflicted `test-results/` clash from running two Playwright processes at once | cold start: untouched since the last full run |
| 2026-10-06 | designed HTML and text emails, the global daily cap of 30 confirmations with the shared 100-a-day pool, the real site identity in the emails, a deterministic heartbeat test | `features/subscribe/**` (templates, quota, runtime), migration 0002 (adds `subscribe_quota`), i18n, actions, tests | `pnpm verify --stale --run --record` green (236 s, 46 checks recorded): lint, typecheck, depcruise, docs:config, unit 951, build, JS budget, white-label, e2e 32 specs (637 passed), Lighthouse 1 run. An earlier run failed once on the first-view heartbeat test (a slow-poll window, not a product bug) and is fixed | cold start: untouched since the last full run |
| 2026-10-06 | `bc0b0c8` (release) | the release to `main` with the email subscription on | the whole battery green before pushing (`pnpm verify --stale --run --record`, 235 s); CI on `main` ran the whole stack once: `static`, three `e2e` shards (172, 181, 219 s), `lighthouse` (273 s), `checks` and `deploy` (37 s), all success (run `37476449379`) | nothing skipped |
| 2026-10-06 | `83ee054` (release) | the owner trigger to send a note, and two timing-sensitive e2e tests made deterministic | the whole battery green before pushing (`pnpm verify --stale --run --record`, 265 s, 47 checks); CI on `main` ran the whole stack once: `static` 52 s, three `e2e` shards (169, 181, 189 s), `lighthouse` 266 s, `checks` and `deploy` 62 s, all success (run for `83ee054`). Two earlier red runs were test timing windows (the first-view heartbeat and the reserved box while a 503 is pending), not product bugs | nothing skipped |
| 2026-10-06 | `8307525` (release) | a Promotions hint for new subscribers (confirmation email and confirmed page), the footer domain as an explicit violet link in the emails, the subscription guide in ES and EN | the whole battery green before pushing (`pnpm verify --stale --run --record`, 249 s, 45 checks); CI on `main` ran the whole stack once: `static` 65 s, three `e2e` shards (143, 143, 222 s), `lighthouse` 265 s, `checks` and `deploy` 59 s, all success (run `37482889047`) | nothing skipped |
| 2026-10-06 | `bbeb672` (release) | back-to-top button (hides itself after 2.5 s), subscription form fixes (Turnstile checkbox announced, 25 s time-out, error codes, 1.5 s fill time, own rate-limit message, Contact fallback), 8-bit confirm and unsubscribe pages, Lighthouse in 2 shards and e2e in 4, violet footer link and Promotions hint in the emails | the whole battery green before pushing (`pnpm verify --stale --run --record`, 245 s, 46 checks); CI on `main` ran the whole stack once: `static` 40 s, four `e2e` shards (130, 158, 178, 179 s), two `lighthouse` shards (158, 160 s), `checks` 5 s, `deploy` 41 s, total 237 s, all success (run `37493726013`) | nothing skipped |
| 2026-10-06 | `e3dedd6` (release) | the Turnstile messaging keeps its instruction when the button is pressed and the fallback after the time-out, a clearer used-link message on the confirm page, and two fixes to `pnpm verify` (a FULL-wide change is no longer hidden by freshness, and FULL-wide files are part of every fingerprint so `--stale` sees toolchain edits) | the whole battery green before pushing (`pnpm verify --stale --run --record`, 272 s, 48 checks, the registry re-baselined by the fingerprint change); CI on `main` ran the whole stack once: `static` 50 s, four `e2e` shards (150, 151, 173, 173 s), two `lighthouse` shards (152, 153 s), `checks` 3 s, `deploy` 35 s, total 221 s, all success (run `37497270008`) | nothing skipped |

Production checks after the release at `e3dedd6` (read only, plus a headless Android visit that blocks the final subscribe call so nothing is stored or sent): `version.txt` `e3dedd6`; after pressing the button the form shows "Marca la casilla de abajo para verificar que eres una persona." at 0.5 s, at 25 s the time-out message with the Contact fallback, and it stays; a used confirmation token shows "Este enlace ya se usó, lo reemplazó uno más nuevo o venció…".

Production checks after the release at `bbeb672` (read only, plus a headless visit that blocks the final subscribe call so nothing is stored or sent): `version.txt` `bbeb672`; the back-to-top button is in the home HTML; the confirm page carries `data-state`; with a headless Android user agent the form showed "Verificando…", at 25 s the time-out message and then the checkbox instruction again, which exposed a defect (the instruction was overwritten when the button was pressed and the fallback message was hidden by a later challenge request), fixed in the next commits.

Production checks after the release at `8307525` (read only plus one request without a token): `version.txt` `8307525`; the Promotions hint is in the confirm page content of both languages; the footer band is on `/`; `POST /api/subscribe/notify` without a token answers 401. No email was sent for this release.

Production checks after the release at `83ee054` (read only plus one request without a token): `version.txt` `83ee054`; `POST /api/subscribe/notify` without a token answers 401 with an empty body, `GET` answers 404; the footer band is still present on `/`. No note was sent and no subscription was made.

Production checks after the release at `bc0b0c8` (read only, public GET requests; no subscription was made): `version.txt` `bc0b0c8`; the footer band and the email field are present on `/`, `/en/`, `/contact/`, `/notes/`, a note and `/privacy/`; absent on `/me/`, `/subscribe/confirm/` and `/subscribe/unsubscribe/` (both `noindex`); `/privacy/` has the `subscribe` section; `/email/logo.png` answers 200 `image/png`.

Production checks after the release at `950e582` (read only: no footprint was left on a real note): `version.txt` `950e582`; `/`, the note, `/en/`, `/contact/`, `/privacy/`, `/en/privacy/`, `/rss.xml`, `/changelog/` and `/favicon.ico` answer 200; the note carries 2 marks instances, the tooltip text and the `/privacy/#marks` link, the comments reassurance, and the X and WhatsApp share links; `/privacy/` has the marks section and the 2026-10-05 date; the `marks.get` action on a published note answers `{"total":0}` from D1 (HTTP 200), an unknown slug answers 400 and a foreign origin 403.


## Experiments X8/C1 documentation and stopped full-wide attempt (2026-10-07)

Candidate: existing dirty pagination/config implementation on `develop` HEAD `a43790d`, plus closure documentation. This record is **partial/failed**, not a new green boundary. No source logic changed during the documentation pass, and no meaningful runnable unit RED applies to schema-description/documentation accuracy.

| Command/check | Observed result |
| --- | --- |
| `mise exec -- pnpm docs:config` | Passed; regenerated `docs/CONFIGURATION.md` and `docs/CONFIGURATION.en.md` before execution checks. |
| `git diff --check` | Passed before full-wide launch. |
| `mise exec -- pnpm verify --run --record` | One foreground attempt; lint failed first. Runner then started typecheck; interrupted owned run on observed lint failure, exit 130. No completed typecheck or remaining family result claimed; state registry gained no green entry. |
| `mise exec -- pnpm exec biome check . --reporter=json --max-diagnostics=100` | Parent-requested read-only diagnostic: exit 1; 440 unchanged files, 6 errors, 0 warnings, no writes. |

Lint diagnostics: `apps/web/scripts/stress-experiments.test.ts` has unsafe optional chaining at line 45 and a formatting error; `apps/web/scripts/stress-experiments.ts`, `apps/web/src/experiments-routes/static-paths.ts` and `apps/web/src/shared/config/schema.test.ts` have formatting errors; `apps/web/src/features/portfolio/lib/pagination.test.ts` has an import-order error. These five existing implementation paths were not editable in the documentation phase. No runtime semantic fix is indicated.

Not completed in this attempt: typecheck, architecture, generated-doc drift check, full units, build, JS budget, white-label, cold-start, all e2e and Lighthouse. Existing focused proof remains 9 Vitest files/199 tests; 30-entry (3 pages per locale) and 100-entry (9 pages per locale) HTML assertions; 390 px ES/EN light/dark Enter/current/no-overflow checks and four axe scans with zero violations. Required wider screenshots and stressed Lighthouse remain pending; prior X2 full/focused checks are historical evidence only.

Preflight found ports 4321-4323 free and left the owned 100-entry preview on 4324 unchanged. No owner service was stopped, no harness/config was changed, and no commits, release refs, credentials or remote operations were used. Next: parent-authorized narrow normalization/test-expression correction, followed by authorized verification; commit/release preparation follows applicable proof. Planned changelog dates for the missing cache/image-policy entries remain provisional until the actual production release.

## Experiments X8/C1 normalized full-wide proof (2026-10-07)

Candidate: dirty implementation on `develop` HEAD `a43790d`, documentation accuracy pass, and the parent-authorized five-path normalization/fixture-entry guard. The earlier stopped attempt above remains historical evidence; this is a separately authorized normalized candidate. No product logic or test harness changed. No functional RED is claimed; the prior six-error Biome diagnostic supplied lint RED.

| Command/check | Observed result |
| --- | --- |
| `mise exec -- pnpm exec biome check --write` on the five diagnosed paths only | Normalized 5 files; explicit missing-entry guard preserves failure instead of masking it. No source writes afterward. |
| `mise exec -- pnpm lint` | Passed, 440 files, no fixes. |
| `mise exec -- pnpm --filter web exec vitest run scripts/stress-experiments.test.ts src/features/portfolio/lib/pagination.test.ts src/shared/config/schema.test.ts` | Passed, 3 files / 139 tests. |
| `git diff --check` | Passed before final battery. |
| `mise exec -- pnpm verify --run --record` | Passed, exit 0, 351 s; recorded 54 checks in `odd/verification-state.json`. |

Full-wide native results: lint clean; typecheck 363 files / 0 errors; dependency boundaries and docs drift passed; core units 4 files / 37 tests plus web units 113 files / 1181 tests; production build passed; JS budget max 19.94 KiB gzip (30 KiB limit; experiments 5.47 KiB, `/me` 8.39 KiB); white-label passed; dev cold start 7 routes; E2E 806 passed across 35 specs (1280 px plus three viewports for 12 width-dependent specs, 178.4 s); Lighthouse 10 URLs × 1 local run passed all assertions (117.3 s).

Lighthouse: performance 0.96-0.99; accessibility and SEO 1.0; best practices 0.96-1.0; LCP 2113-2421 ms; CLS 0-0.0406. `/experiments/`: performance 0.98 / LCP 2274 ms / CLS 0; `/me/`: 0.98 / 2269 ms / 0; `/en/me/`: 0.97 / 2421 ms / 0. Reports: `.lighthouseci/`, `playwright-report/`, full command output `rtk recall 57789e586405`.

Remaining acceptance evidence: parent-reviewed changed-screen screenshots at 390/820/1440 px in ES/EN and both themes, and stressed-fixture Lighthouse (ordinary full-wide fixture results do not cover the 30/100-entry stress builds). Commit/local release preparation and explicitly authorized remote publication remain separate pending steps. The owned preview on 4324 was preserved; no owner server, credential, remote operation, commit or release ref was used.

## Confirmed exhibition CSS correction (2026-10-07)

Correction proof (2026-10-07): two local CSS fixes, no global clipping/new colors. Overflow RED 4 failures (828 > 820), then GREEN 27 experiments tests including those four. Lint 440 clean; typecheck 363 files / 0 errors. Native `mise exec -- pnpm verify --stale --run --record` passed, exit 0, 114 s, 23 checks recorded: 1218 unit tests, 213 e2e tests (15 specs), build/boundaries/JS budget/white-label green; `/experiments/` Lighthouse performance 0.98, accessibility 1.0, LCP 2133 ms, CLS 0. Full output: `rtk recall 8cb0935b5183`.

Independent corrected-stress proof remains pending; ordinary Lighthouse does not cover compact stress cards. Prior full-wide proof is historical; unaffected scopes remain fresh in the registry.

## Closing battery for the Experiments release candidate (parent, 2026-10-07)

Candidate: `develop` at `05ddec5` (listing kit, sorting, cleaner Experiments design) plus the changelog cleanup committed after it. Full-wide scope (the verification map, `astro.config.ts`, `fixture-workspace.ts` and the white-label script were edited).

| Command | Result |
| --- | --- |
| `mise exec -- pnpm verify --stale --run --record` (everything was stale) | Passed, 339 s (the full-stack baseline is 340 s); 54 checks recorded in `odd/verification-state.json`. |
| `mise exec -- pnpm verify --stale --run --record` after the changelog edit | Passed, 84 s (75% saved); 20 checks recorded: lint, typecheck, unit, build, JS budget, white-label and 14 e2e specs. |

Results: lint clean (449 files); typecheck 0 errors; core units 4 files / 37 tests and web units 114 files / 1225 tests; build, JS budget (max 19.94 KiB gzip against 30 KiB; `/experiments/` and `/changelog/` 5.47 KiB), white-label and dev cold start passed; e2e: 35 specs at 1280 px plus 3 viewports for 12 of them, passed (168 s).
Lighthouse (10 URLs, 1 run each, mobile): performance 0.96-0.99; accessibility 1.0 on every URL; LCP 2110-2420 ms (gate 2500 ms); CLS 0 except `/notes/smoke-es/` 0.0406 (gate 0.1, already present before this release). `/experiments/` 0.97 / 2276 ms / 0; `/me/` 0.98 / 2269 ms / 0; `/en/me/` 0.97 / 2420 ms / 0.
Independent proofs of the parent (not part of `verify`): stress build with 30 generated experiments served on port 4331: 78 checks (11 pages including both alternate sorts, ES and EN, 390/820/1440 px, both themes) with 0 horizontal overflow, 0 axe `color-contrast` nodes, exactly one h1 per page and correct `noindex`/canonical/prev/next; Lighthouse with 3 runs on `/experiments/`, `/me/` and `/en/me/`: all assertions passed (see the X8b section of `odd/tasks/me-portfolio-update.md`).
Not run: the stress builds are not covered by Lighthouse (only by the HTML/axe/overflow checks above); the release itself (push to `main`) is a separate step that needs the owner's explicit authorization.

## Release attempt 1 of the Experiments candidate (2026-10-07): rolled back, then fixed

CI run 37645609673 on `main` at `ad741a6`: static, lighthouse (2), e2e (4) and checks passed; deploy failed at the smoke check (`/_astro/*.webp` not served with `cache-control: public, max-age=31536000, immutable`) and the workflow rolled back to the previous Worker version; production verified at `41a31af`. Cause: the project rule added in `37e79fb` switched off the adapter default. The local battery did not catch it because it cannot observe the headers Cloudflare serves (the `astro preview` fixture does not apply `_headers`); the smoke check against the deployed Worker is the only check of that behavior. Fix and re-verification are recorded in `odd/tasks/me-portfolio-update.md` ("Release attempt 1").

## LCP margin and page-weight guardrails, issue #87 (parent, 2026-10-07)

Candidate: `develop` plus the uncommitted change of this task (experiments page CSS, listing parts, `check:page-weight`). Full-wide scope (verification scripts, `package.json`, CI workflow).

| Command | Result |
| --- | --- |
| `mise exec -- pnpm verify --stale --run --record` | Passed, 336 s, 12 checks including `page weight budget`; 55 checks recorded in `odd/verification-state.json`. |
| `mise exec -- pnpm check:page-weight` | All 24 built pages within budget. |

Unit 117 files / 1261 tests; lint, typecheck, dependency boundaries, docs drift, JS budget, white-label, dev cold start and e2e (35 specs) passed; Lighthouse 10 URLs passed. Independent measurements: `/experiments/` LCP 2117-2123 ms in 6 runs (before 2271-2273), `/me/` 2419-2430 and `/contact/` 2112-2117 unchanged; 30-entry stress build 78 checks with 0 overflow and 0 contrast nodes. Not run: the CI itself (it runs on the next push to `main`, which is the owner's decision).

## Release 13 candidate: changelog by production day and the LCP margin work (parent, 2026-10-07): essentials only

Owner decision: skip the full battery ("quita demasiado tiempo, solo lo esencial"); the CI on `main` runs the whole stack on the push.

| Check | Result |
| --- | --- |
| `pnpm lint` / `pnpm typecheck` | clean (468 files) / 0 errors. |
| `vitest run` | 119 files, 1288 tests passed. |
| `pnpm depcruise`, `pnpm test:white-label`, `pnpm docs:config` | no violations, passed, up to date. |
| `pnpm --filter web build` then `pnpm check:page-weight` | all 26 pages within budget (`changelog` type: 105,715 of 110,000 B HTML, 54,304 of 56,500 B style). |
| `pnpm test:e2e:quick changelog.spec.ts a11y.spec.ts` | 39 passed. |
| `pnpm changelog:audit` / `pnpm changelog:stamp --dry-run` | exit 0, every feat/fix/perf commit has an entry / nothing to stamp. |

Not re-run, by owner decision: `pnpm verify --run` (the registry in `odd/verification-state.json` reflects the full battery of `f59a459`, 336 s, 55 checks; the changelog commit is not recorded), dev cold start, JS budget, Lighthouse (the changelog pages are not in `lighthouserc.json`), and the wider e2e batch. The CI on `main` re-runs everything before the deploy.

Release 13 (`30ccbf9`, 2026-10-07): CI run 37656030923 ran the whole stack on `main` (static, e2e x4, lighthouse x2, checks, deploy and smoke check): all green. The checks listed above as "not re-run, by owner decision" were covered by that run.

## Identity evolution candidate: lab-paper banner, hero, home hierarchy and IBM Plex Sans (parent and writers, 2026-10-10 to 2026-10-11)

The typeface swap changes a dependency, so it ran the whole stack once (writer), then the parent re-ran the parts the later changes touched.

| Check | Result |
| --- | --- |
| `pnpm typecheck` / `pnpm lint` | 0 errors / clean (477 files). |
| `pnpm test` (all vitest) | 1312 passed. |
| `pnpm depcruise`, `pnpm docs:config` | no violations, up to date. |
| `pnpm --filter web build`, `pnpm check:js-budget`, `pnpm check:page-weight` | ok, pass, all 26 pages within budget. |
| `pnpm test:white-label` | passed after moving the `html[data-reading]` rules from `calm-layout.css` to `reading-mode.css` (it failed before: commit `5e6e250` leaked them into global CSS). |
| `pnpm test:e2e` (3 viewports, writer, before dropping the JetBrains preload) | 1158 passed, 528 skipped, 0 failed. |
| `pnpm test:e2e:quick` (1280 px, parent, final tree) | 549 passed, 13 skipped, 0 failed (1.8 min). |
| `pnpm test:lighthouse` (10 URLs, 3 runs, final tree) | exit 0, every gate passes. Worst LCP: `/notes/smoke-es/` 2412 ms, `/` 2266 ms, `/en/` 2341 ms; CLS 0 except 0.014 on the note page. |

Findings worth keeping: with both fonts preloaded the note page LCP was about 2585 ms (gate 2500, reproduced twice: 2582 and 2588); dropping the JetBrains Mono preload gave 2261 to 2437 ms. The axe contrast test on `/contact/` (dark) failed twice only in batched runs and passed alone 4 of 4 times; it did not fail in the final full runs. Not run: the 390 and 768 px e2e projects after the final tree, `pnpm verify --run --record` (the registry in `odd/verification-state.json` was not updated), dev cold start. The CI on `main` re-runs everything on the push, which is the owner's decision.

## Release 16 candidate: identity evolution, final tree (parent, 2026-10-11)

Run on the tree that is published (`develop` at the changelog stamp commit), sequentially, all exit 0.

| Check | Result |
| --- | --- |
| `pnpm typecheck` / `pnpm lint` | 0 errors / clean (477 files). |
| `pnpm test` (all vitest) | 122 files, 1312 tests passed. |
| `pnpm docs:config`, `pnpm test:white-label`, `pnpm check:dev-cold-start` | up to date, passed, 7 routes rendered with no late dependency discovery. |
| `pnpm --filter web build`, `pnpm check:js-budget`, `pnpm check:page-weight` | ok, pass, all 26 pages within budget (changelog pages 56,059 of 56,500 B style; `/changelog/page/2/` 107,997 of 110,000 B html). |
| `pnpm test:e2e:quick` (1280 px) | 555 passed, 13 skipped, 0 failed (1.8 min). |
| `node apps/web/scripts/run-lighthouse-ci.ts --url / --url /en/ --url /notes/smoke-es/` | exit 0. Worst LCP: `/` 2265 ms, `/en/` 2342 ms, `/notes/smoke-es/` 2411 ms; CLS 0 (0.014 on the note page); performance 0.95 to 0.98. |

Notes: before the changelog stamp, `/changelog/page/2/` and `/en/changelog/page/2/` were over their html budget by about 3 KB because the unreleased entries had distinct days (2026-10-10 and 2026-10-11) and created one more release day; the stamp put them all on 2026-10-11 and the budget passes with about 2 KB of margin, so adding many more entries per day will need a budget review. `pnpm changelog:audit` still flags `83c5877` (fix of the reading-mode CSS scope): its entry exists but landed in the next commit; the audit works per commit and CI does not run it. Not run: the 390 and 768 px e2e projects, `pnpm verify --run --record` (the registry in `odd/verification-state.json` was not updated). The CI on `main` re-runs the whole stack before the deploy.

### Release 16, first CI run failed (2026-10-11, run 38118267154): deploy skipped, fixed forward

The CI ran what the local closing run had not: `e2e (2)` failed on `chromium-768` `marks.spec.ts` ("an unavailable store ... shifts nothing beyond the reserved box": 68 px against 60) because from 768 px the note banner was content-driven by the title column; fixed by moving the decision record into the banner from `lg` (1024 px) instead of `md`. Full `pnpm test:e2e` (all projects) afterwards: 1164 passed, 540 skipped, 0 failed (3.6 min). Lighthouse failed on `/notes/smoke-es/` (LCP 2429, 2431, 2579 ms; performance 0.94 once) and `/en/me/` (LCP 2122, 2501, 2503 ms), both by the usual thin margin of this gate; locally after the `lg` change the same URLs measure 2263-2268 ms and 2118-2120 ms (the `lg:` utilities already existed, so the inline CSS shrank). The local Lighthouse runs are about 150 to 380 ms faster than the CI runner, so margin there stays thin.
\n
### Release 16 deployed (2026-10-11, run 38160032169)

Release commit `88527c4` (tree equal to `develop`). CI: static, e2e (4 shards, all projects), lighthouse (2 shards), checks and deploy all green; production `/version.txt` = `88527c4`. The earlier two runs (38118267154, 38118950321) were blocked by the gates and fixed forward as described in the plan. Local evidence before the push: `pnpm lint`, `pnpm test:e2e:quick performance.spec.ts pixel-display.spec.ts` (45 passed), vitest `src/content src/styles src/shared` (372 passed), Lighthouse on `/`, `/me/`, `/notes/smoke-es/` (worst LCP 1971, 2115, 2266 ms). Not re-run locally for this last commit: the full e2e matrix and `test:white-label` (the CI ran both).

## Release 17 candidate: the rest of the redesign (parent, 2026-10-11), NOT pushed

Content since release 16 (`88527c4`): metric-matched fallback font, refreshed experiment screenshots, compact paper banner on every page, `/me` flattened, middle dot in titles, home on phones, tablet sidebar grid, softer light paper, darker light muted text, quieter phone author card. Ran sequentially on the tree at `164ae98` plus the grid fix below; every command exit 0 except the e2e matrix.

| Check | Result |
| --- | --- |
| lint, typecheck, `pnpm test` (all vitest), `docs:config`, `depcruise` | clean, 0 errors, passed, up to date, no violations. |
| build, `check:js-budget`, `check:page-weight` | ok, pass, 27 pages within budget (changelog pages within their raised budget). |
| `test:white-label`, `check:dev-cold-start`, `changelog:audit` | passed, passed (7 routes), every feat/fix/perf commit has an entry. |
| `pnpm test:e2e` (all projects, 3 viewports) | 1220 passed, 619 skipped, 6 failed (see below). |
| `pnpm test:lighthouse` (10 URLs x 3 runs) | exit 0, every gate passes. Worst LCP per URL (ms): `/contact/` and `/en/contact/` 1813, `/en/` 1970, `/` 1972, `/subscribe/` 1965, `/notes/` 2116, `/en/me/` 2116, `/me/` 2190, `/notes/smoke-es/` 2266, `/experiments/` 2343. CLS 0 except 0.006 (`/en/me/`) and 0.014 (note). |

The 6 e2e failures and what was done:
- `home-marks.spec.ts` at `chromium-768` (4, `/` and `/en/`): REAL. With the footprint card on (the spec mocks the marks API) the new tablet aside grid `repeat(auto-fit,minmax(14rem,1fr))` made the page 5 px wider than the viewport. Fixed by `minmax(15rem,1fr)` (same size, no extra bytes); `home-marks` and `home-sections` then passed at 768, 360 and 1280. The writer of that change only ran six specs at 360 and 768; this spec was not among them.
- `font-swap.spec.ts` at `chromium-1280` (2, the note page at 820 and 390 px): intermittent under load; it passed alone twice right after (6 of 6). Third time it was seen failing only in a batch.

`/experiments/` LCP runs were 2343, 1966, 1968 ms (FCP 1968, 1520, 1368): bimodal run-to-run noise; before the banner work it measured 2273 ms in the worst case, so the thin spot is the same as before. The CI runs about 150 to 380 ms slower than local, so `/experiments/`, `/me/`, `/en/me/` and `/notes/smoke-es/` are the pages to watch in the next CI run. Not run for this candidate: nothing skipped, but the CI re-runs everything on the push.

### Release 17 deployed (2026-10-11, run 38169618321)

Release commit `f9467c5`. CI: static, e2e (4 shards, all projects), lighthouse (2 shards), checks and deploy all green on the first attempt, no reruns; production `/version.txt` = `f9467c5`. The local candidate verification above (full 3-viewport e2e after the `home-marks` fix, full Lighthouse, white-label, cold start) matched the CI result. The pages flagged as thin (`/experiments/`, `/me/`, `/en/me/`, `/notes/smoke-es/`) passed their CI Lighthouse gate. Known intermittent specs did not fail in this run.

### Release 18 deployed (2026-10-12, run 38276546818)

Release commit `5912ab9`. Local battery before the release (delegated, GREEN): lint, typecheck, vitest (1373), depcruise, docs:config, build, page-weight (37 pages), js-budget, white-label, full e2e (1289 passed; one `font-swap` intermittent, since fixed in `7269237`), full Lighthouse (11 URLs, worst LCP 2344 ms on `/experiments/`), dev cold start, changelog audit. CI: static, e2e (4 shards) and lighthouse (2 shards); `lighthouse (1)` failed once (performance score under 0.95 on `/notes/smoke-es/`), the re-run of the failed job passed, deploy green. Production `/version.txt` = `5912ab9`; `/notes/`, two topic pages and `/rss.xml` answer 200. Not re-run since the release: nothing in the shipped tree changed after `26adb42`.

### Experiment nudge, turned on for this blog (2026-10-12, local, not released)

Candidate: `develop` after N1 to N7 of `odd/tasks/experiment-nudge.md` (`features.experimentNudge: true`). Full battery run twice (the first run found real defects, fixed and re-run): lint, typecheck, vitest (1442 across 129 files), depcruise (307 modules), build, white-label (asserts the flag-off build ships no card, script or CSS), js-budget, page-weight (38 pages within budget after the three budgets were raised with the measured cost), full `test:e2e:quick` (774 passed at 1280 px), the new `experiment-nudge.spec.ts` at 3 viewports (96 passed) and Lighthouse (1 run, 11 URLs, assertions passed). Defects the first run found and that were fixed: the floating card covering the footer links (the script ran before the footer was parsed), opening on load on short pages, covering the keyboard-focused element, fading out while still catching clicks, and an `<aside>` that broke the home and reading-mode locators. Not run: the 360 and 768 px projects of the whole suite (only the new spec ran at 3 viewports), real-device checks, and CI on `main` (nothing is pushed or released).

### Release 19 deployed (2026-10-12, run 38340323460)

Release commit `3c2ba0d` (the experiment card, turned on for this blog). CI: static, e2e (4 shards), lighthouse (2 shards), checks and deploy all green on the first attempt, no reruns; `notes-gate` skipped (not a notes-only push). Production `/version.txt` = `3c2ba0d`; `/`, `/en/`, `/notes/` and a note answer 200 and carry the card markup. Not checked by hand: the floating card on a real phone, and the link-preview caches (no new share links were added).

### Experiment nudge: a close expires (2026-10-12, local, not released)

Change: `nudge.reappearAfterDays` (default 30, 0 = for good); the script stores the time of the close instead of a flag. Touched: schema, script, wrapper, e2e spec, docs, changelog, two page-weight budgets. Ran: 265 vitest in config and portfolio (RED first: 2 schema and 5 script tests), typecheck, lint, `docs:config`, build, `check:page-weight` (38 pages; `notes-index` and `note` html budgets raised by the measured 186 and 248 B), `test:white-label`, `experiment-nudge.spec.ts` at 3 viewports (96 passed). Not re-run: the rest of the e2e suite, `check:js-budget` and Lighthouse (the change adds about 300 B of inline script and no layout or CSS; they ran green on `3c2ba0d` and CI on `main` runs them again at the next release). Not pushed, not released.

### Adopter experiment: six features off (2026-10-12, local, config restored)

Question: can someone adopt the project, switch features off from `site.config.ts` and keep the CI green? Temporarily set `readingMode`, `marks`, `contact`, `changelog`, `experimentNudge` and `themeToggle` to `false` (uncommitted; restored from a backup and confirmed identical to `HEAD`). Static gates all passed: typecheck, lint, vitest, depcruise, build, js-budget, page-weight, white-label. `test:e2e:quick` failed: 208 failed, 568 passed, 13 skipped (marks 48, experiment-nudge 25, page-stamps 21, reading-mode 16, a11y 16, contact 14, subscribe 11, home-marks 10 and a long tail). Cause: no spec under `tests/browser/` reads `site.config.ts` or skips by flag (they only skip by viewport), and 26 specs assume features and URLs of this site; some also read UI strings. Consequence: the CI `checks` gate would block the deploy of an adopter's site. Lighthouse was not run in this experiment. Not tested: turning off `blog` or `me`, and changing colors or UI texts. Documented as a known limit in README(.en) and section 10 of `docs/CONFIGURATION(.en).md`; also added the missing `experimentNudge` row to section 6.2.

### Release 20 candidate: the CI follows the site config (2026-10-13, local, before the release)

Candidate: `develop` after E1 to E9 of `odd/tasks/e2e-follows-config.md`. Full battery on the final tree: typecheck 0 errors; lint clean; vitest 1532 (web) and 44 (core); depcruise (308 modules); `docs:config --check` up to date; build; `check:js-budget`; `check:page-weight` (38 pages); `test:white-label`; `test:e2e` at 360, 768 and 1280 px: 1604 passed, 778 skipped, 0 failed (4.5 min); `pnpm test:profiles`: quiet 564 passed, blog-only 526, me-only 295, bare 221, each 0 failed (37 s to 97 s per profile at 1280 px); `FIXTURE_APPEARANCE=minimal`: 775 passed, 0 failed; Lighthouse 3 runs per URL for this site's config, and 1 run per URL for each profile with its own URL list (11, 9, 6, 5 and 2 URLs), all passing. Experiments: a valid alternative palette (teal accent with matching `chip` and `card-hover`) passed the whole suite (776); an alternative that did not move the chips failed 9 accessibility tests, as designed; both left the tokens reverted. Flakes found and fixed with a reproduction under saturated CPU: axe contrast on `/contact/` (a11y 340 of 340 after, was 1 of 244 failing) and the back-to-top reveal gesture (270 of 270 after). Not run: real devices; CI on `main` runs it all once more at release, with the `profiles` job in parallel and non-blocking.

### Release 20 deployed (2026-10-13, run 38381361129)

Release commit `87f53b8` (the CI follows the site config). CI: static, e2e (4 shards, 3 viewports), lighthouse (2 shards), checks and deploy all green on the first attempt; production `/version.txt` = `87f53b8`; `/`, `/en/`, `/notes/`, `/me/`, `/contact/`, `/experiments/` and `/rss.xml` answer 200. Total 355 s (previous release 336 s). The new `profiles` jobs (non-blocking) ran in parallel: quiet 239 s success, blog-only 165 s success, me-only 149 s success, **bare 110 s failure**: 2 tests failed of 662 (`font-swap.spec.ts` `/` at 1280 and 820 px): the document height moves 8 px (before 1190, after 1182) when Plex Sans and JetBrains Mono replace the fallback; at 390 px it moves 8 px too but that width allows 24. It does not fail locally in any font setup tried (system fonts, DejaVu as fallback). Hypothesis: in `bare` the main column is the tallest, so a font-swap height change of the main column shows in the document height, while with this site's config the taller sidebar hides it. Action: `font-swap.spec.ts` now names the elements whose height changed in its failure message and annotations, so the next CI run says which one.

### Release 21 candidate: reduced-motion entrance and sidebar flake (2026-10-13, local, before the release)

Candidate: `develop` after `fix(a11y)` (no fade-in entrance with reduced motion) and `test(e2e)` (home sidebar columns skip detached nodes). Root cause of the sidebar flake: the marks card is removed from the sidebar when the counter is unavailable (stubbed API), so it could be detached between lookup and read. Verified: `test:profiles` 4 of 4 green, default e2e 3 viewports 1633 passed, 0 failed before the spec fix; after it `test:e2e:quick` three full runs, 786 passed each, 0 failed.

### Note 011 author voice and editorial guide (2026-10-17)

See odd/tasks/note-author-voice.md for touched files, evidence and full run/skip details. Passed: docs-quality 16 tests, lint, standalone final-note schema and MDX compile, diff whitespace. Production build blocked during Cloudflare prerender startup by uv_interface_addresses; built-output and weight validation remain pending. No production deploy or visual verification claimed.

### Subscribe backfill: state verified on production D1 (2026-10-19, issue #147)

What was run: read-only `SELECT` counts through the owner's authorized `wrangler` session against `elvinlab-dev-db` (remote); nothing was written and no address was read. Result: `subscribers` has 4 `confirmed` and 1 `unsubscribed`; all 5 have a `subscriber_notes` row for `vibe-coding-o-especificar-primero`, and the table holds exactly 5 rows for that slug. This proves the backfill's effect is present, not when or how the `INSERT OR IGNORE` ran: the individual execution still has no recorded evidence, and the statement was not re-run.

### DMARC policy p=none -> p=quarantine (2026-10-19, issue #91)

Changed by the owner's authorization: the single `_dmarc` TXT record of `elvinlab.dev`, only `p=none` to `p=quarantine`, report address unchanged; confirmed in public DNS afterwards. Evidence before: a Gmail "Show original" of the 2026-10-06 note email with SPF pass, DKIM pass (aligned, `d=elvinlab.dev`) and DMARC pass. Verified after the change: a Gmail "Show original" of a confirmation email sent 2026-10-19 21:02 UTC (after the change) shows SPF pass, DKIM pass (aligned, `d=elvinlab.dev`) and DMARC pass with `p=QUARANTINE`. Not verified: Outlook. The few weeks of reports the issue asked for were not waited out.

### SEO and metadata (2026-10-19)

Run after commit 8d19384 plus the spec updates: unit tests over `shared`, `features/{me,contact}` and `integrations`; typecheck 0 errors; Biome clean; `docs:config`; indexable build crawled (43 pages); full `test:e2e:quick` 1096 passed; `test:white-label` ok. Not re-run: Lighthouse and the JS budget (no script or layout change), cold start (no toolchain change). Not verified: how Google or the AI engines render it, which needs a recrawl.

### Paper grid on every banner (2026-10-19)

Run on the uncommitted work before its commit: typecheck 0 errors; Biome clean; depcruise clean; `pnpm test` 1780 passed; `check:page-weight` 50 of 50 within budget (inner-page budgets raised, see the dated notes in `page-weight-budget.json`); `check:js-budget` pass; `test:white-label` ok; full `test:e2e:quick` 1096 passed. Gotcha found by the weight check: importing `Ink.astro` or `ink-underline.css?inline` into `PageHeader.astro` made Astro emit the global stylesheet twice on every note page (+58 KB), so the underline rules live in the file's own `<style is:global>`. Not re-run: Lighthouse (CI runs it on the release push), the three-viewport `test:e2e`, cold start (no toolchain change). Not verified: visual check on phone widths beyond the e2e overflow checks.
