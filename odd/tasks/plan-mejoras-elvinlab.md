# Feature: plan-mejoras-elvinlab

Source: the owner's improvement plan `plan-mejoras-elvinlab.md` (a file in the owner's Downloads, dated 2026-10-01, not tracked in this repo). It proposes a professional-profile, Projects, Learning ("Formación") and "Ahora" evolution of the site plus a public learning practice. This document tracks only what is being executed from it.

## Objective
Execute the plan incrementally on `develop`, starting with what needs no new content from the owner, and keep an honest record of what is blocked on the owner.

## Constraints
- Owner decides content: credentials, projects, CV, "Ahora" text, the "eternal junior" wording. Nothing is invented to fill cards.
- Brand changes go to `docs/BRAND.md` first (CLAUDE.md). Email never in tracked files. Success criterion of the repo stays 3 published notes (2 live): flag if this work crowds out writing.
- Work on `develop`; commit and push only when the owner says so (each remote operation is authorized explicitly).

## Settings
- TDD: not applicable to docs and investigation tasks; code tasks later will resolve it then (source: project config says strict TDD for SDD only; ODD requires explicit choice). Runner for code tasks: Vitest (`mise exec -- pnpm test`), e2e Playwright (`pnpm test:e2e:quick` while iterating).
- RDD: off for this clone (clone-local). Delivery strategy: `ask-on-risk`; forecast of authored changed lines for the tasks below is under 100, so no slicing.

## Verified facts (2026-10-02, against `develop`)
- Stale delivery docs: `docs/CONVENTIONS.md` lines 83, 87 and 98 (staging, PR release, per-PR previews); `docs/TESTING.md` line 53 ("PR previews and branch deploys"); `docs/CONFIGURATION.md` and `.en.md` line 455 ("intentional on previews"). Current flow: CLAUDE.md, ADR 0011 and 0012.
- `nav.ts` already has an `experiments` entry (`/experiments/`) behind `features.experiments: false`; no page for it, nor for `projects` or `learning`.
- `recruiter.cvUrl` exists in the schema and `MeHero.astro`; not set in `site.config.ts`.
- `credentials.json` has two entries with issuer "Plataforma sin confirmar" (placeholder in production today).
- The plan's "No disponible" hiring-card item was already addressed on 2026-10-02 (`408f22b`, released in `8c7968a`).
- Confirmed live (not just in source): `https://elvinlab.dev/en/` links "All notes" to `/en/notes/`, which returns 404; the cause is `NotebookIndex.astro:19` and `MePage.astro:78` using `localizePath('/notes/', locale)` while the notes index is single-locale. Tracked in #58.

## Tasks
- [x] **T1** (EL-01a) Fix the stale delivery docs: CONVENTIONS git/delivery rows, TESTING line 53, CONFIGURATION line 455 (ES and EN). Check: `pnpm lint`; no remaining mention of staging or PR previews outside ADRs and history. Route: inline (a few lines per file, mechanical).
- [x] **T2** (EL-01b) `docs/BRAND.md`: let the "atemporal" voice rule admit a dated "Ahora" section, as the plan requires, without opening the door to time-dependent copy elsewhere. Route: inline (one decision, one file).
- [x] **T3** (16.5, issue #58) "All notes" link in the English UI. Reproduced live (`/en/notes/` 404) and fixed in `3c83905`; close #58 after the next release.
- [ ] **T4** (16.5) Investigate the late or faint block appearance when navigating: `fade-in-up` (300 ms from opacity 0) is the candidate, not a conclusion; measure before changing. Route: decide after measuring.
- [ ] **T5** (16.5) Language selector without translation: improve the label so it does not promise an English version that does not exist. Needs the owner's wording if it is user-facing copy.

### Added 2026-10-02 on the owner's instruction
- [x] **T6** Switch the site to the `full` appearance preset (`appearance: 'full'` in `site.config.ts`). The owner wants the fuller home back.
- [ ] **T7** The home "bitácora" (today `LabLog.astro`: since, cadence, languages) becomes **Ahora**: what the owner is investigating, doing, or focused on (building, exploring, learning; at most 3 entries; dated; hidden when empty). Issue #65. Allowed by the BRAND exception (`e4e80a0`). The text is the owner's; nothing invented.
- [x] **T8** Redesign the hiring card: the owner is not convinced by the current wording or how it looks (a pill with a dot next to the CTA). Design pass first, then wording confirmed by the owner. Tier 3 (design). Skill: `better-ui`.

### GitHub issues created from the plan (2026-10-02, T34 to T43)
#58 T34 EN "All notes" links 404 on `/en/notes/` (confirmed live bug: `/en/notes/` returns 404) · #59 T35 language switcher fallback · #60 T36 localize experience · #61 T37 credentials status and placeholders · #62 T38 Learning page · #63 T39 experiments schema for Projects · #64 T40 Projects routes · #65 T41 Ahora section · #66 T42 owner content pack · #67 T43 first research cycle. Map to plan packages: T34 and T35 = 16.5; T36 = EL-03; T37 = EL-02/EL-06; T38 = EL-06; T39 and T40 = EL-04; T41 = EL-05; T42 = EL-02 inputs; T43 = EL-09/EL-10. Dependencies are written in each issue.

Added after a second pass over the plan (gaps in the first issue set): #68 T44 contact alternative and form states (EL-07; LinkedIn is only in the navbar and footer, not beside the form) · #69 T45 motion and navigation pass (EL-07; the fade-in-up entrances are staggered 100 to 250 ms, 300 ms each, from opacity 0: measure before changing; six nav links at 768 px) · #70 T46 SEO, share cards, fixtures and docs for new pages (EL-08) · #71 T47 editorial review of the published notes (plan section 11, which the plan's own EL packages never assign).

### Plan review findings (2026-10-02)
- **Order matters:** per-locale text is needed by T36 (experience), T37 (credentials), T39 (projects) and T41 (Ahora). The plan asks for one common strategy (16.4). Do T36 first and extract a shared localized-text schema helper that the others reuse, instead of four ad hoc shapes.
- **Ahora placement tension:** plan 18.3 designs Ahora as one wide card with three columns in the main column. The owner decided Ahora replaces the sidebar "Bitácora" (a narrow column). Three columns do not fit there; use stacked rows with shorter entries (about 20 to 25 words, not 35 to 45) or move it under the hero. Owner to choose when T41 starts.
- **Naming:** `/experiments/` was never live (flag off, no page), so renaming the public route to `/projects/` breaks nothing. The internal collection can stay `experiments` for now; the UI label and URL become Projects.
- **First measurable baseline (plan Phase 0):** production Lighthouse mobile on 2026-10-02 is in "Status 2026-10-02" above.
- **Stale after switching to `full`:** BRAND, CONFIGURATION (ES and EN), DESIGN and the `appearance.ts` comment said this site uses `minimal`; fixed. Nine e2e specs assumed `minimal`; made preset-aware (T6, `df10396`).

### Blocked on the owner (not started, no content invented)
- EL-02 profile, credentials and CV: real issuer for the two "Plataforma sin confirmar" entries (or remove them), CV URL, English experience text.
- EL-04 Projects (2 real projects, screenshots, what is publishable), EL-05 "Ahora" text, EL-06 Learning, EL-09/EL-10 first research cycle.

## Progress
- 2026-10-02: document created.
- T1 done (`6dc4d09`): delivery docs aligned; found and fixed `CLAUDE.md` still giving the `git merge develop` release that fails with diverged histories. Route: inline (a few lines per file). Checks: lint, `docs:config` no drift.
- T2 done (`e4e80a0`): BRAND admits a dated Ahora section as the one exception.
- T6 done (`df10396`, `93b7398`): site on `full`. TDD: RED (`site-config.test.ts` expected full, got minimal), GREEN. The switch broke 9 e2e specs (16 results) that assumed `minimal`; a delegated writer (Claude subagent, sonnet; Tier 2; trigger: 4 spec files plus scripts) made them follow `html[data-appearance]` and added `FIXTURE_APPEARANCE` (registered in `ENV_VARS` after the registry unit test caught it, which the writer had not run in full). Reviewed by the parent: assertion counts did not drop (32 to 37, 9 to 9, 22 to 22, 8 to 8), skips unchanged. Verified by the parent: lint, typecheck 0 errors, unit 37 + 535, depcruise, e2e 426 passed under `full` and 426 under `FIXTURE_APPEARANCE=minimal` (141 skipped by design both times). Not re-run after the env-vars registry edit: e2e (no behavior change there). Review tier: RDD off for this clone.
- T8 done (`abbcc57`): the hiring card status is now a headline (first part of `recruiter.status`, parts separated by ` · `) plus short tags with a dot; the red dot is gone (brand accent when not open to work, green when open to work). TDD: `splitStatus` RED (3 failing) then GREEN. Added an e2e guard that tags stay on one line, and changed the smoke test that pinned `bg-danger`. Route: inline, Tier 3 (design); skill better-ui. Verified by the parent: lint, typecheck 0 errors, unit 37 + 538, depcruise, e2e 428 passed under `full` and under `FIXTURE_APPEARANCE=minimal`; screenshots at 1280 dark, 390 light, EN dark (scratchpad, not committed). The owner has not yet seen or approved the look.
- Changelog entries to add at the next release (dated that day): site back on the `full` preset; the hiring card layout (the existing 2026-10-02 entry covers only the wording).
- T3 done (`3c83905`), TDD: new `tests/browser/internal-links.spec.ts` crawls the internal links of 7 key pages and asserts each resolves; RED = exactly `/en/` and `/en/me/` failing with `/en/notes/ -> 404` (5 others passed), GREEN after pointing both links at `/notes/`. Parent verified: lint, typecheck 0 errors, unit 37 + 538, depcruise, e2e 435 passed (159 skipped by design). Route: inline, Tier 2-sized (two components and one spec).
- Owner decisions (2026-10-02): hiring card look approved; Ahora content is "focused on optimizing AI and personal projects", configurable from the central config (`site.config.ts`), replacing the Bitacora in the sidebar (the `labLog` home section key becomes `now`; deliberate breaking rename for forks); changelog entries for the `full` preset and the card layout at the next release: approved.
- T7 delegated (Claude subagent, sonnet; trigger: schema, preset, component, i18n, tests and docs together), in progress: optional `now` block `{ updatedAt, items[1..3] { kind, text localized, href? } }` in the central config, `NowCard.astro`, `labLog` removed.
- Issues created: #58 to #71 (see above). Nothing pushed since `506f0f7`.

## Next step
Owner reviews the T8 look. T7 (Ahora replaces the sidebar Bitacora). T7 needs the owner text and the placement choice (sidebar rows or under the hero).
