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
- [ ] E1 — Flag `features.education` + config block + schema fields + `/education/` and `/en/education/` routes + timeline page (tests first).
- [ ] E2 — Nav item, `/me` "Formación reciente" block, SEO (title, description, OG, hreflang, sitemap), Lighthouse URL, verification map, e2e profiles, white-label, docs ES/EN, changelog.

## Acceptance criteria
- Flag on: ES and EN pages render the three credentials ascending by year with type badge and issuer; nav link present; `/me` shows the compact block; no overflow at 360 px; axe clean in both themes; JS budget holds (no new JS expected).
- Flag off: no route, no nav link, no `/me` block, not in sitemap (white-label asserts it).
- Touch-scoped checks; heavy battery once at close.

## Progress and evidence
Route: delegated writer per task; parent reviews diffs and re-runs checks.
