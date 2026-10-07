# Feature: /me portfolio update (evidence, projects, clarity)

Feature id: `me-portfolio-update`. Engram mirror topic: `odd/me-portfolio-update/tasks`.
Source plan: `~/Downloads/plan-portafolio-elvinlab.md` (owner-supplied, 2026-10-06, local only, not committed).

## Objective

Turn `/me` and `/en/me` from a web CV into a page that shows evidence: what was built, the owner's own part, and how to start a conversation. Understandable by a recruiter, an engineer and a non-technical visitor, without visual overload.

## Problem / why

Observed on a local build (2026-10-06): the tagline is English on the Spanish page; availability, stack and contact land about 5000 px down on mobile; roles have duties but no outcomes; there is no projects section; 27 stack chips with jargon; raw tag ids (`dotnet`, `reactjs`); CV button says "Descargar" but opens a Drive viewer; languages are written twice with different detail. Research notes: Engram `odd/me-redesign/research`.

## Owner decisions (2026-10-06)

- Implement all improvements of the plan, on `develop`, task by task.
- Availability: **only collaborations and projects** (not open to full-time roles). Replaces "Abierto a charlar". Engram `odd/me-redesign/availability`.
- The site `me.intro` already says "frontend focus"; the canonical brand line "Full-stack engineer building with AI agents." stays on brand surfaces (BRAND.md unchanged unless a later owner decision changes it).
- Primary CTA is contact; the CV is secondary.

## Scope

In: hero, CV label, languages source, humanized tags, availability wording, mobile order of essentials, projects (data + cards + case pages), experience contributions, stack regrouping, curated notes, credentials order, SEO meta, Lighthouse coverage of `/me`, docs, changelog.
Out (deferred by owner earlier): Learning page, credentials in-progress status, navbar growth (#69), commercial template, extracting `core`.

## Constraints

No raw email; no private repos; own screenshots only; no invented numbers, users, savings or team size; white-label (no owner strings in components, sample-profile build must stay clean); `prefers-reduced-motion`; <=30 KiB JS gzip; Lighthouse mobile >=95, LCP <=2.5 s, CLS <=0.1 (LCP byte margin is thin: re-run `test:lighthouse` for any HTML/CSS byte change); Pixelify Sans only for short large headings; touch-scoped verification (`pnpm verify`), light local checks per unit. Changelog entry per shipped change. ~400 authored changed lines per task is a planning heuristic only, never a gate.

## Quality bar (owner, 2026-10-06: "dejarlo todo super bien y bonito")

Every UI task (M2, M2b, M3, M4, M5) closes only after the parent has looked at local screenshots of the changed screens at 390, 820 and 1440 px in both themes (ES and EN where copy differs), and fixed what looks off, not only after tests are green. Design stays inside `docs/DESIGN.md` and `docs/BRAND.md` (existing tokens, components and the marks tooltip pattern; no new visual language). Copy is checked in context, not just for length.

## Pending owner inputs (do not block planning)

- Own contributions and publishable outcomes for Buo, Blue Zone, CNET, Orosi (drafts will be flagged "owner to validate", never presented as fact).
- agentic-dev-setup case: what is the owner's own work vs third-party tools.
- Course years and exact degree name; real, publishable screenshots (own site screenshots can be generated from a local build).
- Public/permissions check of the two CV links.

## Delivery

Work directly on `develop` (CLAUDE.md workflow), one or more work-unit commits per task, Conventional Commits, no AI attribution. Push and release to `main` stay the owner's decisions. Forecast: ~1500-2500 authored changed lines across 6 tasks (above the 400 heuristic); strategy `ask-on-risk`; no pull requests in this repo's flow (ADR 0012), so slice boundaries are the task commits recorded below.

## Tasks

- [x] **M1 Data and common facts (done 2026-10-06).** One source for languages (native Spanish / English B1), availability wording (collaborations and projects), `lookingFor` rendered, CV label "Ver CV (PDF)" / "View CV (PDF)", years from a single computed fact, humanized tag display (`.NET`, `React`, `Spring Boot`, `SQL Server`). Route: delegated writer (2+ non-trivial files).
- [x] **M2 Hero and first screen (done 2026-10-06).** Localized role and value sentence, CTAs (Contact primary, View projects, View CV secondary), LinkedIn/GitHub with visible names, essentials (location, mode, language, availability) near the hero on mobile, icons decorative with text, one at-a-glance block instead of repeated facts.
- [x] **M2b Sidebar explanations (owner request 2026-10-06; done).** Every item of the right column (quick facts rows, stack groups, contact card) gets its own icon and a short hover/focus explanation of what it is, inside the existing design (reuse the marks tooltip pattern: `role="tooltip"`, `aria-describedby`, CSS-only, shown on hover AND keyboard focus, reachable on touch by tap/focus, `prefers-reduced-motion` respected, 44 px targets, no new JS island). Copy short, ES/EN, from i18n. Starts after M1 (same file `MeSidebar.astro`, one writer at a time). Watch the Lighthouse byte margin.
- [x] **M2c Performance headroom: closed WITHOUT code change (2026-10-06).** The sprite hypothesis was measured by the writer and refuted: `/me` has only 20 SocialIcon uses (14 distinct, 6 repeat because QuickFacts renders twice), sprite plus uses came to 110,878 B against 111,026 B (about 150 B), so it was reverted and not shipped. CSS coverage on `/me` (mobile load): the main inline stylesheet is 80% used, so there is no dead CSS to cut (#72 has no cheap win). Fonts are already pruned to 2.4 KB of `@font-face`. Original idea, for the record: Replace repeated inline SVG icons with one sprite per page (`<symbol>` defined once, `<use href>` at each site) so `SocialIcon` output shrinks (~8 KB on `/me`), identical visuals in both themes and print, no dangling references on any page (an e2e check walks the main pages and verifies every `use` target exists). Measure before/after with a built-HTML size script and `pnpm test:lighthouse --url /me/ --url /en/me/`. Touches the shared `SocialIcon` (footer and home too): run the wider touched-scope e2e subset.
- [x] **M3 Projects (M3a done 2026-10-06; dedicated case pages dropped because the two published notes are the cases; owner says the projects block takes too much room on `/me`, to be reworked by the experiments/credentials plan).** Schema/collection evolution for localized problem, contribution, result, status, links, screenshot; `elvinlab.dev` and `agentic-dev-setup` entries; two cards on `/me`; public projects route and case pages (ES/EN), sitemap only for published pages; honest attribution (own scripts/config vs third-party tools).
- [ ] **M4 Experience.** Optional localized `contributions` (max entries) next to the 280-character `summary`; `ExperienceTimeline` renders them; Blue Zone ETL explained in plain words; drafts flagged for owner validation.
- [ ] **M5 Stack, notes, credentials.** Stack grouped by what the owner does (about 10 items visible, rest in `<details>`); notes curated by capability with one-line framing and "Article in Spanish" label on `/en/me`; degree first, courses after; Udemy "Master" shown only as a course name.
- [ ] **M6 SEO, measurement, docs.** Specific `/me` title and description, OG consistent with the role, `lighthouserc.json` covers `/me` and `/en/me`, `verification-map`, docs ES/EN regenerated (`pnpm docs:config`), changelog entries, final touched-scope verification recorded in `odd/verification-ledger.md`.

## Acceptance criteria

1. After a first read, a visitor can say what the owner does, the focus and how to make contact.
2. A project that backs the experience is reachable without opening GitHub first.
3. Each strength has accessible proof; own contribution is distinguished from tools and team work.
4. CV, dates, English level and availability agree across surfaces.
5. Links say the real action and never point to missing pages.
6. Usable on mobile (360-1280 px), keyboard, zoom and reduced motion; print stays clean.
7. Configurability and budgets preserved (white-label build clean, JS <=30 KiB, Lighthouse gate).

## Routing record

Exploration: done in-session by delegated explorers (map of `/me`, project context, local screenshots) plus parent spot checks. Per-task route and trigger evidence are recorded under each task as it starts.

## Progress / evidence

- 2026-10-06: document created before the first source write. Engram mirror holds a summary plus the file locator (the file is the full source).
- M1 route: delegated writer (2+ non-trivial files, precise spec; trigger: Writer trigger). Parent review: read the full diff, re-ran `vitest run src/features/me src/shared/config` (150 passed), then closed three gaps inline as mechanical edits (document icon `file` in `SocialIcon.astro` used by `MeHero`, home-card label `recruiter.cv` to "Ver CV" / "View CV", smoke spec assertion).
- M1 checks observed: tag-label test RED then GREEN; `pnpm typecheck` 0 errors; `pnpm lint` clean (409 files); `pnpm docs:config` up to date; `pnpm depcruise` clean; `pnpm test:e2e:quick tests/browser/smoke.spec.ts` 18 passed at 1280 px. Not run: Lighthouse, full e2e (text-only change; Lighthouse is measured once at M6 and after M2/M2b/M3 which change layout/bytes).
- M1 decisions: `me.languages` is optional in the schema because `tests/fixtures/site.config.alt.ts` must keep parsing; the sidebar availability row now shows `lookingFor`; `status` (home card, OG) now reads "Abierto a colaboraciones y proyectos".
- M1 commit: `17291e0` on `develop` (16 files, +192/-23, tracker included; about 190 authored lines, under the 400 heuristic). Running count: about 190.
- M1 review: receipt-driven development is off (decided by clone_local), so no native review was started: `disabled/unmanaged`. `gentle-ai review assess --base-ref HEAD~1 --committed-only` reported `high` / `high_risk` only because `odd/tasks/me-portfolio-update.md` matches a hot-path signal (the tracker file, not code); recorded, not acted on. Ordinary checks above stand.

- M2+M2b route: one delegated writer (Writer trigger: 14 files) with a precise design brief, then a polish pass through the same writer after the parent's screenshot review (QuickFacts as label-over-value rows, tooltip contained in its card via container query, duplicated intro replaced by a one-line lead). Parent: read screenshots at 390/1440 in both themes and ES/EN (files in the session scratchpad), ran the checks below.
- M2+M2b checks observed: vitest me/config/i18n 160 passed; typecheck 0 errors; lint clean (412 files); docs:config up to date; depcruise clean; e2e at 1280 px: me-hero-tips, a11y (axe on /me both themes), calm-pages (banner height caps, no horizontal overflow), cv-and-credentials, smoke, me-experience-locale, me-photo: 60 passed in the last run. Tooltip: hover, focus, tap, Escape (`me-hero-tips.spec.ts`).
- M2+M2b Lighthouse (fixture build, mobile, 3 runs, `lighthouserc.json` now lists `/me/` and `/en/me/`, which advances M6): before M2 (M1 state) LCP 2263-2286 ms, 214.6 KB; after M2 LCP 2411-2436 ms, 228.1 KB, perf 0.97, a11y/BP/SEO 1.0, CLS 0, TBT 0. Passes the 2500 ms gate with only ~65 ms of margin. LCP element is now the hero pitch paragraph (render delay, not an image). Lab server does not compress, so each raw KB costs ~11 ms. HTML of `/me`: 111 KB raw / 23.4 KB gzip; 32 inline SVG icons = 11.5 KB, one inline style block = 52.8 KB, 15 tooltips.
- Decision: buy headroom before M3-M5 add bytes: task M2c (icon sprite, keep the same visuals).
- M2+M2b commit: see below (recorded after the commit).

- Headroom policy after M2c: LCP margin on `/me` is about 65 ms (about 6 raw KB, the lab server does not compress by documented design: `docs/TESTING.md`). Every remaining task must be byte-neutral on `/me` or offset: no per-chip icons or tooltips (27 chips would cost about 7 KB), project cards kept to a few KB, the long stack folded into `<details>`, any added block paid for by removing duplicated text. Re-measure with `pnpm test:lighthouse --url /me/ --url /en/me/` after M3 and M5. Open owner decision (not taken): making the lab server compress like production would give large headroom but changes the measurement harness, so it needs the owner's call.
- Drift guards: adding `/me/` and `/en/me/` to `lighthouserc.json` and the new `me-hero-tips.spec.ts` broke two `verification-map` guard tests; fixed in `verification-map.ts` and the shard list in `docs/TESTING.md` (scripts tests 148 passed). Editing the verification script is a full-wide change per `docs/TESTING.md`: the whole stack (`pnpm verify --run`) is NOT run yet; pending for the closing battery (owner prefers one heavy run at close).
- Owner stack list (pasted 2026-10-06) is the current content of the six stack groups; used for M5.

- M3a route: explorer mapped the `experiments` model first (Mapping trigger), then one delegated writer (24 tracked files plus new ones) with a precise brief. Parent: read `ProjectCard.astro` and the `fixture-workspace.ts` edit (outside the brief's list, justified: fixture builds hold only fixture notes, so a strict `note` check would fail every e2e/Lighthouse build; the helper drops dangling `note` in fixture copies only), looked at screenshots of `/me`, `/projects/` (ES, EN, 390/820/1440, both themes) and fixed an empty-gap defect (`items-start` on both grids).
- M3a found and fixed my own M1 regression: the long `recruiter.status` text became one wrapping tag on the home hiring card (2 `home-sections` tests failed); status is now `Actualmente en Buo · Colaboraciones y proyectos` (headline plus short tag, the format `splitStatus` expects).
- M3a checks observed: vitest 109 files / 1123 tests passed; typecheck 0 errors; lint clean (425 files); docs:config up to date; depcruise clean; `test:white-label` passed; e2e at 1280 px (projects, smoke, a11y, mobile-ux, internal-links, home-sections, me-hero-tips, calm-pages): 107 passed after the status fix (2 pre-existing failures were mine from M1, fixed); navbar with five links fits at 768/820/900 px; home keeps no Projects grid (`home: { experiments: false }` kept on purpose).
- M3a Lighthouse (`/me/`, `/en/me/`, 3 runs): perf 0.97, a11y 1.0, CLS 0, LCP 2415-2428 ms (unchanged from 2411-2436 before M3: the cards are below the fold and the screenshot is lazy), total bytes 258 KB; gate margin about 75 ms.
- Owner-to-validate (draft claims on the page): the "Mi parte" / contribution texts of both projects, and the `elvinlab.dev` screenshot (generated from a local build of the home).
- Full-wide changes made (`astro.config.ts`, `verification-map.ts`, `fixture-workspace.ts`, `white-label-check.ts`): the whole stack (`pnpm verify --run`) is still pending for the closing battery.

## Second plan (owner, 2026-10-06): Experiments and Formación

Source: `~/Downloads/plan-experiments-formacion-elvinlab.html` (local, not committed; the embedded mockup is a visual reference, not a pixel spec). It supersedes: the public name "Proyectos" and `/projects/` (now **Experiments**, `/experiments/` and `/en/experiments/`), the deferral of Formación (now a page, **Formación / Education**, `/education/` and `/en/education/`), and M5's credentials ordering ("degree first") for the `/me` credentials block (full page is ascending, the `/me` summary is descending, up to three items each). Nav becomes six links (Inicio, Notas, Experiments, Sobre mí, Formación, Contacto) with a mobile menu when they do not fit (issue #69 now in scope).

Owner feedback on M3a: the projects block takes too much space on `/me`. Parent proposal (pending owner approval): replace the tall cards with compact rows, and show "Experiments recientes" and "Formación reciente" side by side as one two-column block (stacked on mobile), each with up to three rows (small optional thumbnail, name, status/type, one line, link), and drop the separate long certificates section.

Owner decisions after the proposal (2026-10-06): the visual design of the new pages is left to the parent, inside the current design system with the lab touch (mono indices, dashed lines, sober frames); image policy is defined by the parent (written in `docs/DESIGN.md`, "Images of experiments and credentials"); until a real image exists a card shows a CSS-only typographic cover (no fake screenshot). Names chosen by the parent from the owner's suggestion: nav and page labels ES **Experimentos** and **Formación**, EN **Experiments** and **Education**; route slugs stay English like `/notes/` and `/contact/`: `/experiments/`, `/education/` (and `/en/...`). Labels live in i18n, so a rename is one dictionary edit. The Formación link and its `/me` summary are not shown until the education page exists.

Proposed tasks (X1 and X5a approved by delegation, started 2026-10-06; the rest follow): X1 rename Projects to Experiments (routes, nav, i18n, sitemap, tests, docs) and the six-link nav with the mobile-menu breakpoint; X2 Experiments data model (explicit `publishedAt`, status published/in development/archived, editorial visibility, single featured, gallery images with caption, per-project case body) and the index page as exhibition pieces; X3 case pages `/experiments/<slug>/` (sections render only when they have content, no placeholders; MDX body); X4 Formación data model and ascending timeline page (type badge, document thumbnail with `contain`, details accordion without JS, stable ids); X5 compact `/me` summaries; X6 certificate viewer (native dialog, only on the education page); X7 SEO, Lighthouse URLs (`/experiments/`, `/education/`), verification map, docs, changelog.
Blocked on owner inputs: public copies of the three certificate files (no ID numbers or signatures), real screenshot for agentic-dev-setup or an approved exact diagram, validated "Mi aporte", decisions, challenges and learnings, and what each course taught and where it was applied.

## Next step

Owner to answer the proposal for `/me` and approve X1-X7; (old line follows) Review the owner's new plan `~/Downloads/plan-experiments-formacion-elvinlab.html` (projects block too tall on `/me`; experiments and education); then M4, M5, M6 adjusted to it. (Old line follows.) M3 projects (byte-conscious), then M4, M5 (stack: core chips visible, rest folded, jargon explained at group level), M6, then one closing battery.
