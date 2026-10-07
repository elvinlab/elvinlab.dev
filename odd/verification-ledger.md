# Verification ledger

The repository rule is in [`docs/TESTING.md`](../docs/TESTING.md), section "Touch-scoped verification": verify what a change touches, record it, and do not repeat a check whose scope was untouched since its last green entry. Update this file in the same commit as the change it records.

## Last green commit per check family

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
