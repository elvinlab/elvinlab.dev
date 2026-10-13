# Education page (`/education/`, issue #82)

## Objective and authorization
2026-10-13, owner: build the Education (ES "Formación") page now with the data we already have (title, issuer, type, year); documents and learnings come later from the owner. Prior planning: `odd/tasks/me-portfolio-update.md` (lines ~100-200), `odd/issues-to-create.md` T53/T54/T58/T59, `docs/PORTFOLIO.md` section 6. Work on `develop`, local work-unit commits; push and release stay the owner's call.

## Defaults decided by the parent (owner may overrule)
- Separate flag `features.education` (page, nav link and `/me` block); `features.credentials` stays for the current `/me` section. Education block config in `site.config.ts` (`education: { perPage, sortFrom, meRows, intro }`), same pattern as `experiments`.
- Page: timeline ascending by year, grouped by year, single side, type badge (degree / course certificate; "professional certification" added to the schema but unused). Order inside a year = array order in `credentials.json` (explicit editorial order, no invented months).
- Optional fields (document image, learnings, applied-where, verify link, expiry) are in the schema and render only with real content. No placeholders, no invented text.
- Reuse the listing kit (`shared/lib/listing.ts`, `shared/ui/Pager|SortSwitch|ListingSummary`); alternate sorts hidden below `sortFrom`, noindex when exposed.
- `/me`: compact "Formación reciente" block (3 newest, descending, link to `/education/#<id>`), replacing the long certificates list when `features.education` is on.
- Nav: add Formación/Education link when the flag is on. Mobile menu breakpoint stays as is (768 px); the 1024 px change is a separate decision.
- Out for now: certificate viewer `<dialog>` (X6, needs documents), thumbnails, credentials in-progress status.

## Tasks
- [x] E1 — Flag `features.education` + config block + schema fields + `/education/` and `/en/education/` routes + timeline page (tests first).
- [x] E2 — Nav item, `/me` "Formación reciente" block, SEO (title, description, OG, hreflang, sitemap), Lighthouse URL, verification map, e2e profiles, white-label, docs ES/EN, changelog.

## Acceptance criteria
- Flag on: ES and EN pages render the three credentials ascending by year with type badge and issuer; nav link present; `/me` shows the compact block; no overflow at 360 px; axe clean in both themes; JS budget holds (no new JS expected).
- Flag off: no route, no nav link, no `/me` block, not in sitemap (white-label asserts it).
- Touch-scoped checks; heavy battery once at close.

## Progress and evidence
Route: delegated writer per task; parent reviews diffs and re-runs checks.

### E1 (writer, 2026-10-13)
- RED: new tests for the config block and flag, the credentials schema fields, the education lib and the routes list failed first (12 failures in 4 files: missing `education` config/flag, missing fields, missing `education.ts` and `education-routes.ts`). GREEN after implementation.
- Checks observed: typecheck 0 errors (455 files); lint clean; vitest 139 files, 1588 tests pass; `docs:config` regenerated CONFIGURATION(.en).md; depcruise no violations; `--filter web build` ok and `check:js-budget` all 40 pages PASS (education pages 5.54 KiB gzip, no new JS); `test:white-label` ok (now also asserts no education route/markup with the flag off); `test:e2e:quick` education + cv-and-credentials + no-horizontal-overflow: 53 passed (education spec: ES+EN render, ascending order, anchors, vertical line, 360/390 no overflow, axe both themes, alternate order and page 2 are 404 below thresholds).
- Not run: full e2e, Lighthouse, `test:profiles` (owner asked for light local runs).
- Deviations: (1) no `verifyUrl`: the existing `url` already is the verification link, so the timeline reuses it. (2) Added optional `order` (int >= 0): the content store does not return the JSON array order (it came back alphabetical by id), so the order inside a year is `order`, then id; no data was edited. (3) Alternate sort is only `newest` (default `oldest`); no `title` sort.
- Image rendering (`assets/education/<file>`, build fails if missing) is implemented but untested: no document images exist yet.
- E2 must pick up: nav link and `routeNeeds`/`PATH_ROUTES` in `tests/browser/helpers/features.ts` plus an `education` entry in `E2eRoutes` (`e2e-features.ts`, `e2e-features.test.ts`); sitemap-filter must hide `/education/newest/...` (noindex alternates) and the flag-off paths (`sitemap-filter.ts`); `/me` block should link to the page holding the entry (use `loadEducationPages`, entries are paged); no-horizontal-overflow and a11y specs path lists, Lighthouse URL, page-weight budget entry, `assets/education/**` in the verification map once images exist, docs ES/EN (PORTFOLIO, CONFIGURATION prose, DESIGN), changelog entry.

### E2 (writer, 2026-10-13)
- Route: delegated writer; tests first for the pure logic (RED seen for `navItems` education entry: 8 failures; `recentEducationRows` and sitemap rules were written together with their tests, so their RED was not observed separately). The e2e additions passed on first run.
- Done: nav item `education` between About and Contact (flag-gated); `/me` "Formación reciente" block (`EducationRecent.astro`, plain rows, no JS, no CSS file) with links to `/education/[page/N/]#id` built from `loadEducationPages` and a closing link; the long certificates list stays when the flag is off and `credentials` is on; sitemap filter (flag off, alternate order); `education` in `E2eRoutes`, `PATH_ROUTES`, `LIGHTHOUSE_NEEDS`, `lighthouserc.json`, verification map (lighthouse entries; no `assets/education/**` glob, no image exists), a11y and overflow path lists, new `education` page-weight type; white-label asserts no `data-me-education`; docs ES/EN (PORTFOLIO section 6, CONFIGURATION rows, DESIGN, README), changelog `education-page`.
- Profiles: `bare`, `blog-only` already had `education` off; `quiet` and `me-only` keep it on (they keep `credentials`). `test:profiles` (all 4 profiles) passed.
- Deviation 1: with six sections the header wrapped at 768 px (92 px, `mobile-ux` tablet header guard). The breakpoint is unchanged; between `md` and `lg` the handle next to the brand mark is visually hidden (`md:sr-only lg:not-sr-only`, still the link name). Costs about 270 B style and 90 B html per page, so the page-weight budgets of all types were raised with dated reasons (also absorbing small style overshoots that already failed on the base commit E1).
- Deviation 2: `lighthouserc.json` (outside the stated surface) got the two URLs; `page-weight-budget.test.ts` got classification rows.
- Checks observed: typecheck 0 errors; lint clean; depcruise no violations; docs:config up to date; vitest 139 files, 1600 tests pass; build ok; `check:js-budget` 40/40 PASS; `check:page-weight` 40/40 within budget; `test:white-label` ok; `test:e2e:quick` (education, cv-and-credentials, no-horizontal-overflow, a11y, me-hero-tips, mobile-ux) 154 passed; `test:profiles` 4/4 profiles passed.
- Not run: Lighthouse, full e2e at 3 viewports (profiles ran the full set at 1280 px).
- Gaps: no document images (no thumbnails on `/me`); mobile menu not visually reviewed beyond the e2e link check.

Parent review: re-observed typecheck, lint, depcruise, build, check:page-weight (40/40), e2e:quick education + mobile-ux (69 passed). Writer also ran vitest (1600), js-budget, white-label, 6-spec e2e quick (154) and test:profiles (4 profiles). Not run: Lighthouse, 3-viewport e2e battery.

## Follow-up with the owner (2026-10-13)
- Real data loaded: seven credentials (3 DevTalles, 2 Udemy, 1 Platzi, 1 university degree) with verification links, document images (six) and learnings (six; the Udemy full-stack bootcamp has none: only third-party snippets found). The degree has no image yet: the page shows a ruled-paper typographic cover (CSS plus a pixel SVG, `aria-hidden`) until the owner provides it.
- Decisions: default order is newest first (`/education/oldest/` is the alternate, from `sortFrom` entries); inside a year `order`, then month (unknown month = start of the year), then id; entries sit in two columns from 768 px. Keep the current pagination (`perPage` 12 + pager); no infinite scroll or lazy-load-with-animation: it would break `#id` anchors, SEO, the no-JS page and the JS budget. Images already lazy-load.
- Checks observed after the last change: vitest 1602, typecheck, lint, e2e:quick education + overflow + a11y + cv-and-credentials + mobile-ux + view-transitions (161), check:page-weight 42/42, white-label, docs:config. Not run: Lighthouse, full 3-viewport e2e. The default flip and its tests were edited together (no separate RED).
- Gotchas: (1) text of a pixel-font CSS variable written inside any file Tailwind scans (even a budget JSON) makes Tailwind emit it on every page (+24 B); (2) the white-label check now empties `credentials.json` because verification links carry the owner's handle; (3) a failed e2e leaves `test-results/` behind: remove it before measuring page weight.
- Pending: public copy of the university document (owner), the Udemy bootcamp learnings (owner), visor `<dialog>` (X6) once documents are final.

## Design critique pass (2026-10-13, owner chose: images + viewer, only /education/, top 3 findings)
Source: impeccable critique (dual-agent: design review + detector; 23/32). Contrast and target-size doubts were measured by the parent: sort options 9.6-10.5:1, meta 6.4:1, issuer 10.8:1 (the detector's 2.14:1 was a false positive); the only element under 44 px is a 190x24 `<input>` (not verified which one).
- [x] E3 — P1 thumbnails unreadable and not expandable: smaller thumbnail (about 20rem) that opens a native `<dialog>` viewer with the full image (no JS: plain link to the image); Esc and a visible close button close it; focus returns to the trigger; viewer code only on `/education/` and only when an entry has an image.
- [x] E4 — P1 dead space beside the text on desktop: text block centered vertically against the document column (wrapper `.ed-body`, mobile order unchanged).
- [x] E5 — P2 "Verificar" vs "Qué aprendí" look alike: visible disclosure marker on the accordion, both targets at least 44 px, links stay underlined, the disclosure does not.
- [x] E6 — Pixel identity for the buttons of `/education/` only (owner feedback 2026-10-13: generic buttons, the viewer close above all): pixel X and notched corners on the close button, thumbnail brackets and plus, pixel arrow on Verificar, pixel chevron and tinted pill on the disclosure, notched sort switch (`.ed-page` overrides, shared file untouched), stepped motion only under `no-preference`.
Out of scope this pass: the typographic-cover note and rule contrast (P2), frame language shared with Experiments (P3), and the `/experiments/` findings.

### E3-E5 (writer, 2026-10-13)
- RED: `education-viewer.test.ts` (new) and three new cases in `education-styles.test.ts` failed first (missing module; missing `.ed-viewer`, `.ed-body{display:contents}` and the summary marker): 2 files, 3 failed + import error. GREEN after implementation (18 tests in `src/education-routes` + `shared/i18n`). The e2e cases were written in the same pass as the code, so their RED was not observed separately.
- Done: thumbnail is a `data-ed-open` link to a 1600 px webp, one shared `<dialog class="ed-viewer">` and a delegated inline script (`education-viewer.ts`) only when an entry has an image; `.ed-body` wrapper, 20rem document column from 768 px, phone order kept with `display: contents` plus `order`; chevron marker on the learnings summary, `Verificar` and the summary share weight 700.
- Gotcha found by e2e: the global reset zeroes the UA `margin: auto` of `<dialog>`, so the viewer sat at the top-left and a corner click hit the form, not the backdrop; `.ed-viewer` sets `margin: auto` itself. Padding lives on the form (not the dialog) so a click on the dialog element is always the backdrop.
- Checks observed: biome clean; typecheck 0 errors; vitest all pass; build ok; `check:js-budget` no FAIL; `check:page-weight` no FAIL after raising only `education` (style 61100 -> 62400, html 98200 -> 102100; others unchanged, so no theme-variable leak); `test:white-label` ok; `docs:config` up to date; `test:e2e:quick` education + no-horizontal-overflow + a11y + cv-and-credentials + mobile-ux + view-transitions: 172 passed (new: viewer open/Esc/button/backdrop/focus return, no-JS link, link counts, 44 px targets, axe with the viewer open in both themes, desktop/phone layout order).
- Not run: Lighthouse, full 3-viewport e2e, `test:profiles`.

### E6 (writer, 2026-10-13)
- RED: 7 new style-part unit cases in `education-styles.test.ts` failed first (pixel parts missing, no motion block); 12 new e2e cases failed first (close glyph, thumbnail brackets, verify arrow, sort/disclosure clip-path, reduced-motion and dissolve checks; the no-layout-shift and focus-ring cases already passed on the old CSS). GREEN after implementation: 20 tests in `src/education-routes`, education spec 59 passed.
- Done: `--ed-notch` (4 px two-step polygon) written once on `.ed-page`; `.ed-viewer-close` (pixel X inline SVG, notch, hover/focus glyph turn `steps(3,end)` 160 ms and 1 px nudge, active nudge down); dialog and backdrop dissolve `steps(4,end)` 240 ms (`ed-pop`, `ed-fade`); `.ed-doc` brackets (3 px bars, 12 px arms, primary) and pixel plus, `steps(2,end)` opacity, `pointer-events: none`; `.ed-verify` pixel arrow (ExternalHint is visually hidden text only, so there is one arrow); disclosure pixel chevron (clip-path) plus tinted notched pill on hover/focus; sort options notched, active filled, hover nudge. Clipped controls set `clip-path: none` on focus-visible so the outline is never cut.
- Deviations: glyphs are single `<path>` of 1-unit squares instead of separate `<rect>` (smaller HTML, same crisp result); the X is symmetric under 90 degrees, so the turn is only visible mid-animation; the site-wide reduced-motion reset leaves `1e-05s` instead of `0s` on transition durations, so the e2e treats <= 0.001 s as zero.
- Budgets: `education` style 62400 -> 66900 (measured 66623), html 102100 -> 108350 (measured 108037); `changelog` html 118300 -> 119550 (measured 119135, the new `education-pixel-buttons` entry). No other type moved. Gotcha repeated: the first measure showed +3..+29 B on home/contact/changelog because a unit test wrote the pixel font variable name literally; the test now builds the string.
- Checks observed: biome clean; typecheck 0 errors; vitest 140 files, 1619 tests; build ok; `check:js-budget` no FAIL; `check:page-weight` no FAIL after the two raises; `test:white-label` ok; `test:e2e:quick` education + overflow + a11y + cv-and-credentials + mobile-ux + view-transitions + reduced-motion: 198 passed (axe clean in both themes with the dialog closed and open).
- Not run: Lighthouse, full 3-viewport e2e, `test:profiles`, screenshots (parent reviews visually).
