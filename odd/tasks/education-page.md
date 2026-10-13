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
- [ ] E2 — Nav item, `/me` "Formación reciente" block, SEO (title, description, OG, hreflang, sitemap), Lighthouse URL, verification map, e2e profiles, white-label, docs ES/EN, changelog.

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
