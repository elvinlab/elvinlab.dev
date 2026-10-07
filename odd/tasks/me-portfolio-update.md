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
- [ ] **M2c Performance headroom (found while measuring M2).** Replace repeated inline SVG icons with one sprite per page (`<symbol>` defined once, `<use href>` at each site) so `SocialIcon` output shrinks (~8 KB on `/me`), identical visuals in both themes and print, no dangling references on any page (an e2e check walks the main pages and verifies every `use` target exists). Measure before/after with a built-HTML size script and `pnpm test:lighthouse --url /me/ --url /en/me/`. Touches the shared `SocialIcon` (footer and home too): run the wider touched-scope e2e subset.
- [ ] **M3 Projects.** Schema/collection evolution for localized problem, contribution, result, status, links, screenshot; `elvinlab.dev` and `agentic-dev-setup` entries; two cards on `/me`; public projects route and case pages (ES/EN), sitemap only for published pages; honest attribution (own scripts/config vs third-party tools).
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

## Next step

M2c (performance headroom: one SVG sprite per page instead of 32 inline icons; target document back at or below the M1 baseline of 214.6 KB total, LCP back near 2.3 s), then M3 projects.
