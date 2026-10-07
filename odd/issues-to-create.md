# GitHub issues to create (drafts, 2026-10-06)

Status: **CREATED on 2026-10-06 (owner-authorized: the `gh` session, repository `elvinlab/elvinlab.dev`, Project #2).** Result: 12 new issues #80 to #91 (T51 to T62), 18 retroactive records of delivered work #92 to #109 (T63 to T80, created and closed), and the 26 existing issues that were missing from the board (#43 to #51, #58 to #72, #77, #78) added with their status. The board now has 85 items: 61 Done, 2 In Progress (#80 epic, #81 pagination), 22 Todo, matching the 24 open issues of the repository. Drafts below that overlapped older issues were NOT created: T55 case pages (covered by #64), T59 SEO (#70) and T65 owner content pack (#66); the remaining drafts were renumbered T51 to T62 in the order above. The epic #80 links every open task. The text below is the original draft (kept for history). Creating issues and adding them to the GitHub Project (https://github.com/users/elvinlab/projects/2) are remote operations: they need the owner's explicit authorization for the destination (repository `elvinlab/elvinlab.dev` and the Project), the operations (list open issues to avoid duplicates, create issues, add them to the Project) and the credential (the `gh` session already configured on this machine; adding to a user Project may need the `project` token scope, which would be a separate authorization).

Format: the fields of `.github/ISSUE_TEMPLATE/task.yml` (Tier, Goal, Files, Conventions, Acceptance criteria, Verification, Constraints). Numbering continues the repo's `Txx` titles after T50 (issue #78). Before creating, compare with the open issues; older related ones: #61 credentials status, #62 Learning page, #63 and #64 Projects, #66 owner content pack, #69 navbar, #72 inline CSS, #77 commercial template. Where a draft overlaps one of them, comment on that issue (or link it) instead of duplicating.

Common Constraints line for every issue unless stated: "Do not commit, push, install dependencies or touch config or secrets unless stated here. One writer at a time; work on `develop`; Conventional Commits; no AI attribution."
Common Conventions: `CLAUDE.md`, `docs/CONVENTIONS.md`, `docs/DESIGN.md`, `docs/BRAND.md`; the feature tracker named in each draft.

---

## T51 Epic: `/me` update, Experiments and Education
- **Tier:** 3 (umbrella; each item below is its own issue).
- **Goal:** Make `/me` and the new Experiments and Education pages clear, fast and easy to maintain.
- **Files:** tracker `odd/tasks/me-portfolio-update.md`; plans from the owner (local files, not committed).
- **Acceptance criteria:** checklist of T52 to T65 closed. Done so far (commits on `develop`): M1 data and facts `17291e0`; M2 and M2b hero and sidebar tooltips `abf459f`, `8faed32`; M3 projects `75c1601`, `8794ad1`; X1 and X5a rename to Experiments and compact rows `8d539ff`; image policy and cover `8794ad1`; immutable cache for `/_astro/*` `37e79fb`; ADR 0015 `d1d9f62`; X2 exhibition page `4bdc1fc`.
- **Verification:** see the tracker; closing battery `pnpm verify --run` plus Lighthouse on every new URL.

## T52 Experiments: pagination, central configuration and authoring guide
- **Tier:** 3 (done today, tracked for history; close with the release commit).
- **Goal:** `/experiments/` paginates (12 per page) when there are many experiments, every tunable lives in `site.config.ts`, and a guide explains how to add or edit content.
- **Files:** `apps/web/src/experiments-routes/**`, `features/portfolio/**`, `integrations/experiments-routes.ts`, `sitemap-filter.ts`, `site.config.ts`, `shared/config/schema.ts`, `docs/PORTFOLIO.md` and `.en.md`, `docs/CONFIGURATION*.md`, `docs/DESIGN.md`, `docs/TESTING.md`, `CLAUDE.md`, `apps/web/scripts/stress-experiments.ts`.
- **Acceptance criteria:** pages exist only above the threshold; pager accessible and in the lab style; title, canonical, hreflang, prev/next per page; first `/me` rows always on page 1; stress run with 30 and 100 entries reported; sweep of hardcoded owner strings done.
- **Verification:** `pnpm lint`, `pnpm typecheck`, `pnpm --filter web exec vitest run`, `pnpm docs:config`, `pnpm depcruise`, `pnpm test:white-label`, `pnpm stress:experiments`, e2e for experiments, a11y, smoke, mobile-ux.

## T53 Education page (Formación) and the six-link navbar
- **Tier:** 3. Relates #61 and #69.
- **Goal:** `/education/` and `/en/education/`: ascending timeline of degrees and certificates, all milestones on the same side, document slot with `contain`, "Ver aprendizajes" accordion, type badge; add the link to the navbar and switch to the mobile menu from 1024 px.
- **Files:** `features/credentials/**`, new route and page components (page-only CSS, outside the feature barrel), `content/credentials.json`, `shared/layout/nav.ts` and the navbar, i18n, `site.config.ts` (`education` block), verification map, docs.
- **Acceptance criteria:** types (university degree, course certificate, professional certification) never mixed up; no invented learnings or applications (fields render only with real content); `object-contain` documents; works at 390, 820 and 1440 px, both themes and locales; six links never overflow.
- **Verification:** as T52 plus screenshots and Lighthouse on `/education/`.

## T54 `/me`: compact "Formación reciente" with a closing call to action
- **Tier:** 2. Depends on T53.
- **Goal:** Replace the long "Certificados y títulos" block on `/me` with up to three compact rows and a closing band linking to `/education/#<id>`.
- **Files:** `features/me/components/MePage.astro`, a row component in `features/credentials`, i18n, docs.
- **Acceptance criteria:** same pattern as "Experimentos recientes"; `/me` not taller or heavier than before; Lighthouse LCP gate holds.
- **Verification:** e2e for `/me`, a11y, Lighthouse `/me/` and `/en/me/`.

## T55 Experiment case pages (`/experiments/<slug>/`)
- **Tier:** 3. Blocked on owner content. Relates #63 and #64.
- **Goal:** One page per experiment: opening, problem, my part, gallery, decisions and challenges, technologies and their role, result, what I learned, what I would do differently, links; sections render only with real content.
- **Files:** collection or MDX body, route entrypoints, page components, sitemap, i18n, docs.
- **Acceptance criteria:** no placeholder text; ES and EN when content exists; sharable URL; cards link to the page instead of the note.
- **Verification:** as T52 plus Lighthouse on one case page.

## T56 Experience: contributions per role
- **Tier:** 2. Blocked on owner text.
- **Goal:** Optional localized `contributions` (max entries) next to the 280-character `summary`, rendered as short outcomes.
- **Files:** `features/me/schema.ts`, `ExperienceTimeline.astro`, `content/experience.json`, docs.
- **Acceptance criteria:** no invented numbers; schema docs regenerated; `/me` bytes within budget.
- **Verification:** `pnpm docs:config`, vitest, e2e `me-experience-locale`, Lighthouse `/me/`.

## T57 `/me`: stack folded, jargon explained, notes curated
- **Tier:** 2.
- **Goal:** Show about 14 core stack chips and fold the rest in `<details>`; explain jargon at group level; curate three notes with a one-line framing and an "Article in Spanish" label on `/en/me`.
- **Files:** `site.config.ts` (`me.stack`, notes selection), `MeSidebar.astro`, `MePage.astro`, i18n, docs.
- **Acceptance criteria:** fewer chips in the DOM; no per-chip tooltips; bytes neutral or lower.
- **Verification:** e2e, a11y, Lighthouse `/me/`.

## T58 Certificate viewer
- **Tier:** 2. Depends on T53 and the owner's public copies of the documents.
- **Goal:** Native `<dialog>` viewer on `/education/` (Escape closes, focus returns, visible close button), loaded only on that page.
- **Files:** the education page components, a small script, tests.
- **Acceptance criteria:** works without JS as a plain link to the document; keyboard and screen reader checked.
- **Verification:** e2e for the viewer, a11y, JS budget check.

## T59 SEO and share cards for `/me`, `/experiments/`, `/education/` and case pages
- **Tier:** 2.
- **Goal:** Specific titles and descriptions, OG cards per locale, `ProfilePage` with `Person`, hreflang, sitemap entries only for published pages.
- **Files:** `shared/seo/**`, `integrations/og-*`, pages, `lighthouserc.json`, verification map, docs.
- **Acceptance criteria:** structured data validates; Lighthouse SEO 1.0 on every new URL.
- **Verification:** `pnpm test:lighthouse` for the new URLs, `link-previews.spec.ts`.

## T60 Performance guardrails: HTML budget per page type and the inline CSS experiment
- **Tier:** 3. Relates #72.
- **Goal:** Fail the build when a page type exceeds its HTML weight budget, and A/B `build.inlineStylesheets: 'always'` against `'auto'` in the Lighthouse fixture.
- **Files:** `apps/web/scripts/` (new check next to `performance-budget.ts`), `astro.config.ts`, docs.
- **Acceptance criteria:** budgets documented and enforced; the CSS change kept only if LCP does not get worse.
- **Verification:** `pnpm test:lighthouse` before and after, `pnpm check:js-budget`.
- **Constraints:** touches `astro.config.ts` (full-wide): run alone.

## T61 Review the whole repository and decide what goes to `@elvinlab/core`
- **Tier:** 3. Tracker: `odd/tasks/core-extraction-review.md`.
- **Goal:** A written verdict per component (core now, core later with trigger, app, shared/ui, delete).
- **Files:** the review report only; no code moves until the owner approves.
- **Acceptance criteria:** every inventory item has a verdict and reason; boundaries, JS budget and white-label kept for any approved move.
- **Verification:** `pnpm depcruise`, `pnpm check:js-budget`, `pnpm test:white-label`.

## T62 Move image originals out of the repository (Cloudflare R2)
- **Tier:** 3. Tracker: `odd/tasks/images-to-r2.md`. Supersedes ADR 0015 when done.
- **Goal:** Originals in an R2 bucket on a public domain; the build downloads and optimizes them; the repo keeps only references and `images.baseUrl`.
- **Files:** `shared/lib/experiment-image.ts`, schema, `site.config.ts`, fixtures, docs, new ADR 0016.
- **Acceptance criteria:** no image originals in the working tree; a missing object fails the build; no performance change.
- **Verification:** build, `pnpm verify --run`, white-label, Lighthouse.
- **Constraints:** every Cloudflare operation (create bucket, public domain, upload) needs the owner's explicit authorization first.

## T63 Changelog redesign: releases, dates and kinds
- **Tier:** 3. Tracker: `odd/tasks/changelog-redesign.md`. Amends ADR 0010.
- **Goal:** Group the visitor changelog by release and date, and by kind inside each release (features, changes, fixes...), with icons, collapsed older releases and a scalable page.
- **Files:** `features/changelog/**`, `content/changelog.json` (migration of 81 entries), i18n, `CLAUDE.md` rule, docs, a `changelog:audit` script.
- **Acceptance criteria:** see the tracker; 200 generated entries keep the page fast.
- **Verification:** vitest, e2e for the changelog pages, Lighthouse on `/changelog/`.

## T64 DMARC: move to `p=quarantine` after some weeks of reports
- **Tier:** Human (DNS in the owner's Cloudflare account).
- **Goal:** Tighten the DMARC policy once the Cloudflare reports show clean alignment.
- **Files:** none in the repo; update `docs/SUBSCRIPTION*.md` and the tracker afterwards.
- **Acceptance criteria:** reports reviewed for a few weeks; policy changed; SPF, DKIM and DMARC still pass in Gmail and Outlook.
- **Verification:** send a test subscription email and check the headers.

## T65 Owner content pack for Experiments and Education
- **Tier:** Human. Relates #66.
- **Goal:** Provide what the structure cannot invent: public copies of the three certificates (no ID numbers, signatures or QR codes), exact degree name and course years, confirmation of the "Mi parte" texts of both experiments, decisions, challenges and learnings per experiment, what each course taught and where it was applied, contributions per role, and any extra screenshots.
- **Files:** `content/experiments.json`, `content/credentials.json`, `content/experience.json`, `apps/web/src/assets/**`.
- **Acceptance criteria:** nothing published that the owner has not confirmed.
- **Verification:** owner review on a local build.
