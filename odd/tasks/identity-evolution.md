# Identity evolution: less "AI-looking", more authored

Status: in progress (started 2026-10-10). Branch: `develop` (project rule: work directly on `develop`).

## Objective

Visitors say the site (colors, type, motion, copy, layout) reads as AI-designed. Evolve the identity so it feels authored, while keeping the pixel signature the owner likes.

## Problem and evidence

Reviewed in a real browser (production, light and dark, desktop; home also mobile) plus source, detector and history (2026-10-10):

- Dark theme: near-black violet, star field, faint grid and cyan/violet nebula is the stock "AI product" look (`Banner.astro:104` grid, `BackgroundCanvas.astro`).
- The banner's right half is empty on every page; the WebGL effect says nothing about the content.
- Home stacks seven equal-weight rounded cards plus pills and four slogan pillars (`Home.astro`), so hierarchy is flat.
- Hero headline is a category label ("Full-stack engineer building with AI agents"). Copy tells: three-part taglines, slogan pillars.
- Space Grotesk is both display and body (`fonts.css:62`, detector `overused-font`).
- Not tells, keep: decision record (Context/Decision/Outcome), the drawn avatar, real captures in `/experiments`, note content.
- Origin: the v3 look came from an owner-approved Claude Design canvas (2026-09-28). No earlier owner complaint on originality is recorded.

## Decisions (owner, 2026-10-10)

- Scope: evolution, not a new visual world. Keep Pixelify, the pink cursor block and the decision record as signature.
- BRAND.md and DESIGN.md are editable (the previously "settled" palette and WebGL banner included). Edit them first, then the surfaces.
- Method: generate variants live in the browser (Impeccable `generate`), owner picks by seeing them.

## Constraints

White-label (semantic tokens only, no hex in components), `packages/core` stays presentation-only, WCAG AA both themes, reduced motion, 44 px targets, JS budget 30 KiB gzip, page-weight and LCP gates, Spanish default with `/en/`. Many unit and e2e tests pin styles (`type-scale`, `calm-layout`, `calm-pages`, `pixel-display`, `mobile-ux`, `background`). Touch-scoped verification per `CLAUDE.md`. Release to `main` only with explicit owner authorization.

## Tasks

Route per task: parent (Tier 3, design judgment); tests or docs may go to a worker. Planning heuristic about 400 changed lines per task.

- [x] T0 Note page: decision record moves into the banner to the right of the title from `md` up (owner picked this composition from live variant 2, for notes, not for home). Route: delegated writer (2+ non-trivial files), parent reviewed diff and rendered result at 1440 and 390 px. Evidence: typecheck, lint, vitest (notes, styles: 89 passed), e2e quick (calm-pages, reading-mode, notes-layout, no-horizontal-overflow: 62 passed, 1 skipped), `check:page-weight` all PASS (note html headroom as low as about 840 B on `vibe-coding-o-especificar-primero`). Not re-run: e2e at 390 and 768 projects, a11y, Lighthouse.
- [ ] T1 Hero banner (home): the three live variants (evidence headline, asymmetric record, log index) were shown on 2026-10-10 and NONE was accepted for the home; home is unchanged. Needs a new direction and a new round.
- [ ] T2 Home hierarchy: one dominant block, fewer equal cards, cut repeated slogan sections (pills, pillars). Live variants.
- [ ] T3 Dark theme surface and accent hierarchy; body/display type pairing (Space Grotesk is the detector hit).
- [ ] T4 Update `docs/BRAND.md`, `docs/DESIGN.md` (and English twins where they exist), changelog entry in `apps/web/src/content/changelog.json`, fix pinned tests.
- [ ] T5 Touch-scoped verification (`pnpm verify`), record in `odd/verification-ledger.md`, report skips as "not re-run".

## Authorized scope

Visual identity surfaces of `apps/web` and `packages/core` tokens, the two design docs, changelog and the tests that pin changed styles. Not authorized: push, release to `main`, deleting remote branches, new dependencies.

## Acceptance

- Owner accepts the chosen variants for T1 to T3 in the browser.
- No new JS over budget; typecheck, lint, touched unit tests and the e2e specs for touched pages pass.
- Docs match the shipped look; changelog entry present.

## Progress and evidence

- 2026-10-10: diagnosis done (browser captures, detector: 5 findings of which 1 false positive, history mapped). Plan created.

- 2026-10-10: live mode needed a manual fallback (the helper's scaffold matched the wrong file by generic classes) and a token refresh after a helper restart (`live-inject --port 8400`). `.impeccable/` is excluded locally in `.git/info/exclude`; the helper also created an untracked `apps/web/.gitignore` that is NOT part of the work.

- 2026-10-10 `5e6e250` feat(notes): decision record beside the note title (T0).
- 2026-10-10 `c0b2433` feat(home): new hero headline "Construyo con agentes de IA y escribo lo que sale mal." (owner picked option A of four) with its own i18n keys; desktop measure 24ch (two lines), phone hero 29rem; BRAND.md records it. Evidence: typecheck, lint, vitest (styles, i18n, content), e2e quick plus 360 px for calm-pages, mobile-ux, pixel-display, home-sections, type-scale, smoke.
- 2026-10-10 home hero avatar (owner picked "your avatar in the hero" to use the empty right half): figure at the right from `md`, centered over the sidebar column from `lg`, inside `[data-hero-content]`; sidebar card hides its photo from `md` while the banner is expanded and shows it again when collapsed; both ease in with `fade-in-up`. Route: delegated writer, parent fixed the smoke locator and restored the large card photo, reviewed renders at 1440 (expanded and collapsed) and 390. Evidence: typecheck, lint, e2e quick (145 passed) and 360 px (27 passed), `check:page-weight` all 26 pass (style margin on `/` is about 358 B), LCP element stays the h1 (dev-server measurement). Not re-run: a11y, Lighthouse, e2e at 390 and 768 projects.

- 2026-10-10 hero cleanup (T1 closed): removed the home kicker, turned the slogan pills off with `home.heroPills: false`, expanded banner `clamp(440px, 56vh, 520px)` (504 px at the test viewport, was 594), tests and docs updated. Evidence: typecheck, vitest (styles, config: 185 passed), e2e quick on calm-pages, home-sections, pixel-display, mobile-ux, smoke, performance, and 360 px on calm-pages, mobile-ux, smoke, home-sections. One intermittent failure of `calm-pages` "the note header keeps date and reading time" in a six-spec batch; it passed alone and in two reruns of the whole file. Not re-run: `check:page-weight` (the change only removes markup), a11y, Lighthouse.

- 2026-10-10 banner background (T3 background part): owner picked "lab paper" (option 1 of 3). Static CSS paper in `Banner.astro` (16 px minor and 80 px major grid, left ruler, three registration crosses, ink from `--color-text` at low alpha), stars and glows removed, owner default `background: { galaxy: false, cursorWaves: false }`; galaxy and waves stay in the picker. Route: delegated writer, parent reviewed renders (home dark, light, 390 dark). Evidence: typecheck, lint, vitest (web 368, core 37), e2e quick on six specs (106 passed, 1 skipped), 360 px on background, calm-pages, a11y (55 passed), `check:page-weight` 0 FAIL (style margin on `/` is 238 B), `docs:config` unchanged. The writer saw one reading-mode test fail once because it assumed the galaxy default; fixed. Not verified: contrast (lines about 5 and 10 percent alpha, behind all text), Lighthouse, e2e at 390 and 768, the other six screenshots.

- 2026-10-10 home hierarchy (T2): owner picked "menos cajas". Latest note, notebook index and Now lost their card chrome (dashed hairline plus `gap-10`/`pt-10`, not the planned 12, because `gap-12`/`pt-12` pushed 12 pages over the style budget), latest note title is `text-note-title` and turns primary on hover, pillars off with `home.pillars: false`. Route: delegated writer; parent reviewed `fewer-1440-dark`, `fewer-1440-light`, `fewer-390-dark`. Evidence: typecheck, lint, vitest (256 passed), e2e quick (156 passed, 1 failed, 1 skipped) plus 360 px (40 passed), `check:page-weight` passes (`/` 58307 of 58500 B style). The one failure was an axe `color-contrast` on `/contact/` dark (`hover:bg-button/90`) outside this task, intermittent (passed in two reruns). The hero avatar looked faint in the writer's full-page screenshots only because the capture restarted the fade; at a normal viewport its opacity is 1. Not verified: Lighthouse, e2e at 390 and 768, `fewer-390-light`. Review gate: RDD is disabled for this clone (`rdd_disabled`), so delivery is `disabled/unmanaged`.

- 2026-10-10 notes index kicker removed (`/notes/` banner "elvinlab / lab notes"), plus the dead `notes.eyebrow` i18n keys and an unused import. While running the related specs two stale expectations from my earlier commits surfaced and were fixed: `mobile-ux` "background picker icon" expected a circle in the off state (the icon is a grid now) and `type-scale` pinned the latest-note title to the card step (it is the note-title step since the home lost its cards). The earlier touch-scoped runs had not included those specs. Full `test:e2e:quick` (1280 px) afterwards: 549 passed, 13 skipped, 0 failed (1.8 min), including the `/contact/` axe test that had flaked in batches. Not run: 390 and 768 px projects, Lighthouse.

- 2026-10-11 typeface (T3, last piece): owner picked IBM Plex Sans (option 1 of 3) and authorized installing `@fontsource-variable/ibm-plex-sans` 5.3.0; `@fontsource-variable/space-grotesk` removed. Route: delegated writer, parent reviewed screenshots (note 1440, /me 1440, home 1440). The writer's whole-stack run found two problems: `test:white-label` failed because my earlier commit `5e6e250` leaked `html[data-reading]` CSS into `calm-layout.css` (fixed in `83c5877`), and Lighthouse LCP on the note page was 2582 to 2588 ms (gate 2500) because Plex Latin is 46 KB versus 22 KB. Measured fix: stop preloading JetBrains Mono (LCP 2261 to 2437, CLS 0.015). Final tree: full `test:lighthouse` exit 0, `test:e2e:quick` 549 passed. Ledger entry added.

## Release 17 status (2026-10-11): DEPLOYED, production on f9467c5

Release commit `f9467c5` (built with `commit-tree` from `develop` `93c42bd`, parent `88527c4`, tree equal to `develop`, 66 files) was pushed to `main` on the owner's explicit authorization. CI run 38169618321 passed on the first attempt, no reruns: static, e2e x4, lighthouse x2, checks and deploy (smoke check included). Live check: `/version.txt` = `f9467c5`; `/`, `/en/`, `/notes/`, a note, `/me/`, `/en/me/`, `/experiments/`, `/contact/`, `/subscribe/`, `/changelog/`, `/privacy/`, `/terms/` answer 200 and the 404 page answers 404; `<title>` on `/me/` is "Elvin Gonzalez · elvinlab.dev"; `/` preloads one font (the pixel face); `/privacy/` renders the banner. Only `main` was pushed; `develop` (with the docs commits after `93c42bd`) lives only locally unless the owner asks to push it.

The steps below are kept as the record of how it was done.

## Release 17 publish steps (record)

Production is on `88527c4` (release 16). `develop` (tip `0ff31e9` plus the commit that records this section) holds 11 unreleased commits (counted with `git log --oneline <develop sha recorded in the last release commit>..develop`; `git rev-list origin/main..develop` is meaningless because the two histories diverged): metric-matched fallback font, refreshed experiment screenshots, compact paper banner on every page (`PageHeader` renders `Banner`, `BannerToggle` split), `/me` flattened, middle dot in titles (rule in DESIGN.md), home on phones, tablet sidebar grid, softer light paper, darker light muted text (`#4f5862`), quieter phone author card, the grid overflow fix and the ledger. All changelog entries are dated 2026-10-11 (nothing to stamp). The full pre-release battery is in `odd/verification-ledger.md` ("Release 17 candidate"): everything passed, the one real e2e failure (`home-marks` at 768 px) was fixed, `font-swap.spec.ts` is intermittent.

Steps to publish (each push needs the owner's explicit authorization; do not reuse the one given for release 16):
1. `git fetch origin`; check `git status` is clean and `git rev-parse --short origin/main` is `88527c4`.
2. `DEV=$(git rev-parse develop); SHA=$(git commit-tree develop^{tree} -p origin/main -m "release: <summary>" -m "<detail>" -m "develop: $DEV")`; confirm `git rev-parse $SHA^{tree}` equals `git rev-parse develop^{tree}`.
3. `git push origin $SHA:refs/heads/main`, then `git fetch origin; git branch -f main origin/main` (no checkout: the dev server runs on `develop`).
4. Follow the run: `gh run list --branch main --limit 1`, then `gh run view <id> --json jobs`. A failing gate blocks the deploy, not the push; production keeps serving the previous version. Intermittent jobs seen so far: `back-to-top.spec.ts:201` and `font-swap.spec.ts` (rerun failed jobs once: `gh run rerun <id> --failed`); Lighthouse LCP is the real gate (CI runs about 150 to 380 ms slower than local and takes the worst of 3).
5. Verify live: `curl -s https://elvinlab.dev/version.txt` equals the release commit, and open `/`, `/me/`, `/experiments/`, `/contact/`, `/subscribe/`, a note, in light and dark.
6. Record the release commit, the run id and the live check in this file and in the ledger (a doc commit on `develop`; push `develop` only if the owner asks).

Pages to watch in the CI Lighthouse (thinnest): `/experiments/` (local worst 2343 ms), `/me/` (2190), `/en/me/` (2116), `/notes/smoke-es/` (2266). If one fails by a few tens of ms in one run, rerun once and compare; if it fails again, options in the "Release 16 status" section still apply (shrink the font, render the decision record once in the note DOM, revert the fallback font).

Still open after this release (details in "Open items" below): dark-theme decision-record contrast; experiments gallery on phones (slides small, always the Spanish UI on `/en/`, faint thumbnails 2 to 4); privacy and terms keep a narrow 680 px column; `/notes/` index still has boxed sidebar cards and the badge under the date; note pages: "Notas relacionadas" repeats prev/next, a title can break as "multi-/agente", the middle of the phone note pages was never reviewed; `/changelog/` (ES) line length about 150 characters; the RSS feed title still uses an em dash; JetBrains Mono has no fallback face (small label shift on swap); the decision record is rendered twice in the note DOM (about 1.3 KB, LCP margin); `page.pdf()` renders only the hero on `/me/` (print not investigated); `odd/verification-state.json` was not refreshed (`pnpm verify --run --record` not run); flaky specs: `font-swap.spec.ts` (3 times in batches), axe `color-contrast` on `/contact/` (dark), `back-to-top.spec.ts:201` (once in CI); page-weight headroom is thin on `me` (style budget 55700), `result` pages (about 164 B) and note pages.

## Release 16 status (2026-10-11): DEPLOYED, production on 88527c4

`main` is at `88527c4` (release commits built with `commit-tree` from `develop`: `425665a`, `ddc91cc`, `88527c4`). CI run 38160032169 passed every job (static, e2e x4, lighthouse x2, checks, deploy and smoke check); `/version.txt` serves `88527c4`, and `/`, `/en/`, `/notes/`, a note, `/me/`, `/experiments/`, `/contact/`, `/subscribe/`, `/changelog/` answer 200 with the new home headline.

How the two blocked runs were resolved
- Run 38118267154: `chromium-768` `marks.spec.ts` shifted 68 px because the note banner was content-driven at 768 px; fixed by showing the decision record in the banner from `lg` (`70badab`). Full `pnpm test:e2e` locally afterwards: 1164 passed.
- Run 38118950321: Lighthouse LCP over 2500 ms on `/me/` (2510, 2513) and `/notes/smoke-es/` (2580), twice; `back-to-top.spec.ts:201` failed once (intermittent, passed on rerun). Fix (`perf(fonts)`): stop preloading both big fonts (Plex Latin 46 KB, JetBrains Mono Latin 41 KB), which sat on the simulated critical path. Local Lighthouse after: home 1556-1971 ms, `/me/` 1665-2115 ms, note 1818-2266 ms, CLS 0.025 on the note page. Experiment with `fetchpriority="low"` instead gave smaller gains (note worst case unchanged at 2271 ms), so it was not used.
- Trade-off to know: with no font preload and `font-display: swap`, a first visit can show a system font for a moment before Plex or JetBrains Mono swap in. A metric-matched fallback (`@font-face` with `size-adjust` and ascent/descent overrides) would hide the swap; not done (pending, listed below).

Still open from this release
- DONE (commit after release 16, not yet released): metric-matched fallback `IBM Plex Sans Fallback` (size-adjust 102%, ascent 100.49%, descent 26.96%); note h1 at 390 px went from +61.8% width and a 37.5 px paragraph shift to -0.6% and 0; JetBrains Mono has no fallback (page-weight budget); Lighthouse note-page CLS 0.025 to 0.0148, LCP unchanged; pages about 60 B lighter. Evidence: typecheck, lint, vitest (web 369, core 38), e2e quick on six specs plus the new `font-swap.spec.ts` (95 passed), `check:page-weight` all 26 within budget. Not re-run: the full e2e matrix and white-label (the CI does).
- The note-page LCP margin in CI stays thin (runs at 2274 to 2580 ms were seen with the old preloads); the decision record is rendered twice in the note DOM (about 1.3 KB), a candidate to render once.
- `develop` was not pushed to `origin`; only `main` was (release commits). The docs commits after `88527c4` live only in local `develop`.

## Open items (visual audit of 2026-10-11, 20 routes x 4 views; not blocking the release)

Source: two read-only reviewers looked at 80 full-page screenshots (dark and light at 1440, dark at 390 and 820). The two P1 findings (header wraps to two rows at 820 px in Spanish; hero avatar caption clipped and under the collapse button at md to lg) are being fixed before the release and are listed here only for the record. Everything below is pending.

Content and consistency
- DONE (after release 16, not yet released): the five gallery images (`elvinlab-dev/{cover,me,contact,note}.jpg`, `agentic-dev-setup/cover.jpg`) were retaken from the current build at 1280 x 800, dark theme, with the Astro dev toolbar and the Cloudflare beacon blocked, so file names, alt and captions did not change. Evidence: viewed all five, `experiments`, `me-photo`, `performance`, `no-horizontal-overflow` specs (79 passed), build and `check:page-weight` (26 pages within budget). Still open from that item: on phones the slides are small (about 330 px wide) and the slides are always the Spanish UI even on `/en/`; thumbnails 2 to 4 are faint in dark.
- DONE (after release 16, not yet released): the compact lab-paper banner is now on every page: `PageHeader` renders the existing `Banner` (not expandable, no canvas) through the `banner` slot on Experiments, Contact, Changelog, Privacy, Terms, the Subscribe landing and its confirm and unsubscribe pages, and the 404 (es and en); the expand button and its script moved to `BannerToggle.astro` (only the home fills it). The subscribe pixel envelope was dropped. Budgets: changelog style 56500 to 58700 and html 110000 to 113000 (exact measured cost), a new `result` page type (confirm, unsubscribe, 404: style 54300, html 79100), `/404/` is now measured. Style bytes went down about 600 B on most pages. Evidence: typecheck, lint, web vitest (1096) and scripts vitest (219), full `test:e2e:quick` 587 passed, 360 and 768 px key specs 274 passed, build, `check:page-weight` (27 pages), `check:js-budget`, `test:white-label`; local Lighthouse after: `/contact/` 1365-1663 ms, `/en/contact/` 1363-2113 ms, `/experiments/` 1966-1968 ms, `/subscribe/` 1963-1966 ms, `/me/` 1666-2127 ms, CLS 0. Print: privacy and terms keep their title (an e2e asserts it); they are not `printable` because that removes the footer subscribe form the specs require. Not verified: the 3-viewport matrix and CI Lighthouse (the CI runs 150 to 380 ms slower; `/me/` and `/en/contact/` are the thin ones).
- DONE (after release 16, not yet released): `/me` flattened like the home: Experiments, Experience, Notes, Certificates and AtAGlance lost their `Card` (column `gap-10`, dashed hairline plus `pt-10` per section), "Que aporto" is a stacked list without icons or tiles, AtAGlance is three quiet rows (fact in medium weight, label in body weight, no big numerals); sidebar and hero unchanged. `CertificatesByYear.astro` (features/credentials) was also flattened. Page weight `/me/` style 55488 to 55066 and html 120600 to 119072 (`me` budget lowered to 55100 and 119100, so headroom is about 30 B). Lighthouse local `/me/` and `/en/me/` unchanged (bimodal 1665 or about 2113-2128 ms, worst case equal to before), CLS about 0. Evidence: typecheck, lint, vitest (src 1096, scripts 219), full `test:e2e:quick` (590 passed, 13 skipped; one `/contact/` a11y dark failure that passes alone, the known batch flake), 360 and 768 px key specs 77 passed, build, `check:page-weight`, `check:js-budget`, `test:white-label`. Print: sections print readably under `emulateMedia`; `page.pdf()` renders only the hero here, before and after (not investigated). Not verified: the 3-viewport matrix and CI Lighthouse.
- **`/subscribe/`:** the content column is off the page grid (starts at x=400 at 1440, x=90 at 820 while header and footer start at 136 and 16); the pixel envelope above the title is decoration the redesign removed elsewhere.

Layout
- **Note banner at 820 px:** the title column is about 300 px and wraps to 6 lines beside a wide decision-record box. Change the ratio (title about 55 percent, record about 45) or keep the record below the title until about 900 px.
- DONE (after release 16, not yet released; the last item below is not done): home on phones. Notebook rows (`NoteIndexRow`, shared with `/me` and `/notes/`) wrap titles to two lines with the date under them below md; the hiring card hides its duplicate "Ver mi perfil" below md (the hero CTA stays); footer links wrap in a row (2 rows at 360 px); one short language-strip copy everywhere ("Also in English / Read in English", "Tambien en espanol / Ver en espanol", the `language.hint.home*` keys were removed); footprint caption "Se el primero en dejar tu huella" / "Be the first to leave your mark". NOT done: making the phone author card quieter (a smaller photo cost about 80 B of shared CSS and `/me/` has about 30 B of headroom). Evidence: typecheck, lint, vitest (src 1094, scripts 219), full `test:e2e:quick` 599 passed, 360 and 768 px six specs 113 passed, build, page weight (`/` 57151 to 57168 style, no budget raised), js budget, white-label; Lighthouse local `/` 1558-1973 ms and `/en/` 1972-1975 ms, CLS 0; desktop (1440) and tablet (820) page heights identical to the baseline. Not verified: the 3-viewport matrix and CI Lighthouse; the live footprint card (the dev marks backend returns 503, checked on a revealed clone).
- DONE (after release 16, not yet released): tablet sidebar. From md to lg the aside is an auto-fit grid (`repeat(auto-fit,minmax(14rem,1fr))`), so 2 or 3 cards fill the width; phones and lg-up unchanged. The empty-space-under-the-cards and phone-author-card notes are resolved too: below md the author card is a compact row (4 rem photo beside name and bio, icons in one row, no box).
- **Note pages:** the "Notas relacionadas" block repeats the previous or next note; a note title can break as "multi-/agente" (use text-wrap balance); large gap between the banner and the article card. Phone note pages were reviewed only at their top and bottom (9,000 to 12,500 px tall); the middle was not read.
- **`/changelog/` (ES):** entry text is about 150 characters per line; cap near 75 ch.
- **`/notes/` index:** boxed sidebar cards and search while the home is flat; the ES/EN badge sits under the date and makes a ragged column.

Colour and contrast
- DONE (after release 16, not yet released): light theme. Paper line alpha in light only 5 to 3.5 percent (minor) and 10 to 7 percent (major); light `muted` `#57606a` to `#4f5862` (5.63 to 7.23:1 on every light surface, before it already passed AA at 4.98 to 6.39; `contrast.test.ts` pins 5:1); axe contrast passes in both themes. Dark decision-record box contrast is NOT done.
- Dark theme: the decision-record box barely differs from the page background and its dashed dividers are very faint, so it does not read as "the one boxed piece"; raise the surface or border by one step.

Checked and NOT a bug (do not re-raise)
- "Notas escritas en ingles" above the Cuaderno list is accurate: the list really contains English notes. The role line in English on Spanish pages is the configured positioning line (BRAND.md keeps it identical everywhere). `/en/notes/` is 404 by design. The Astro dev toolbar pill in the screenshots is a dev-only artifact.

Process
- `pnpm changelog:audit` flags `83c5877` (fix of the reading-mode CSS scope) because its entry landed in the next commit (`docs(changelog)`), not in the same one. The audit works per commit and is not run by CI; the entry exists. History was not rewritten.
- Flaky: axe `color-contrast` on `/contact/` (dark), failed only in batched runs.
- The page-weight style budget on `/` has under 200 B of margin.

## Next step

Ask the owner what to tackle next (nebula and grid background, slogan pills and kicker, or the card hierarchy of the home), then release only with explicit authorization.
