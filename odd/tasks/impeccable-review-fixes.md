# Feature: fixes from the Impeccable review (2026-10-08)

## Objective

Apply the owner-authorized fixes from the exhaustive Impeccable review of the live site (three isolated assessments: design critique, deterministic detector, technical audit). The owner likes the pixel face as the site's signature; the brand is settled and stays.

## Problem / why

Scores: design 23/32, audit 13/16 on four dimensions (accessibility 3, performance 4, theming 4, responsive 2), implementation integrity 3/4. Verified-by-code findings:
- Horizontal overflow on small screens: `/experiments/` thumbnails (80 px x 4 at 320 px), tooltip bubbles on `/me/` (`.info-tip-bubble`) and the home marks tooltip (`.mx`, 288 px in a 280 px sidebar), at 320 and 1024 px (WCAG 1.4.10).
- Touch targets under 44 px: tag chips (26 px), sidebar category links, the contact privacy link.
- The header overflows with a 200% root font (every control is `size-11` in rem, the brand cannot shrink).
- `/me` aside is sticky and taller than the viewport (and sticks at `top-4`, under the 72 px navbar).
- `docs/DESIGN.md` "Avoid" (no ALL-CAPS labels, no meta strings joined with a middle dot) and `docs/BRAND.md:113` are broken by `DecisionRecord`, the changelog kind headings, `NotePage`, `PrevNext`, `SubscribeLanding` and the subscribe eyebrow; `BRAND.md:182` contradicts line 113.
- Inner pages (Experiments, Contact, Changelog, Notes) have no common page-title rule; their H1 sits about 16 px under the navbar.
- Home on phones: no primary action in the hero ("Ver mi perfil" is about 2050 px down); the left column has a gap on desktop because "Ahora" lives in the sidebar.
- `/en/` shows Spanish notes with only a small chip as a cue; the 404 shows a subscribe band.

## Claims of the evaluators that the code contradicts (verify first, do not "fix" what already works)

- Contact form errors: the source already has `role="alert"` and `aria-describedby` on each error (`ContactForm.tsx`); only `required`/`aria-required` and an announced summary are missing. Verify in a browser before changing.
- Background picker under reduced motion: the button already has `motion-reduce:hidden`. Not reproduced in the source, left as is.
- Chip focus ring: chips inherit the global `:focus-visible` outline (2 px violet); left as is unless a test shows otherwise.
- "Todas las notas" links and the banner toggle already expand their hit area with pseudo-elements; left as is.

## Decisions

- Pixel stays and grows: page titles (Experiments, Contact, Changelog, Lab Notes) use the pixel display face with one shared header (`PageHeader`) and a new `--type-page-title` scale step. Rule: pixel for short, large text; grotesk for reading. Pixel preload on those pages is required (it is preloaded on the home only today).
- Typography rule reconciled with the code: no ALL-CAPS labels (language codes ES/EN are the only exception), no meta strings joined with a middle dot (spacing or separate elements instead), mono allowed for entry numbers, dates, counts, tags, code and short labels, never sentences. `DESIGN.md` Avoid and `BRAND.md` (lines 113 and 182) are edited first.
- `/me` aside: not sticky any more (it is taller than the viewport; stickiness would clip the tooltips if made scrollable).
- Left out on purpose: OG images and emails (their uppercase and middle dots are images and email footers), the pink blockquote bar, the banner grid, Space Grotesk, font subsetting, the home page-weight headroom (96%), real static frame for reduced motion, the locale-hint wording (the `/notes/` text is accurate: the index has no English version), `recruiter.status` and `me.languages` configuration separators (data-driven, rendered as separate blocks).

## Tasks

- [x] **I1** Responsive and accessibility: e2e guard against horizontal overflow (320, 390, 768, 1024; and a 32 px root font at 390) written first (RED), then fix thumbnails, `.info-tip-bubble`, `.mx`; 44 px hit areas for link chips, sidebar category/about/RSS links and the contact privacy link; header wraps at large fonts; `/me` aside not sticky; contact form `required`/`aria-required` plus a polite summary (after verifying what exists); 404 without the subscribe band; changelog counter `title`.
- [x] **I2** Typography and headers: `PageHeader` with pixel H1 and pixel preload on the four pages, `--type-page-title`; remove ALL-CAPS and middle-dot joins; align the contact side panel with the form top; update `DESIGN.md`, `BRAND.md`, the unit and e2e tests that pin the old text or classes (`calm-pages.spec.ts` counts `span.uppercase`).
- [x] **I3** Home: mobile-only primary CTA in the hero, "Ahora" card moved to the main column, one-line note on `/en/` that notes are written in Spanish.
- [x] **I4** Release preparation: changelog entry, page-weight budgets, full e2e at three viewports, push and release only with explicit authorization.

## Route record

Mapping: one read-only explorer. Writing: one bounded writer per unit, run one after another (they share files such as `i18n/index.ts`), parent reviews each full diff, reruns the checks and commits per unit. Native subagents were chosen over herdr/opencode because the specs contain design decisions.

## Authorized scope

I1 to I3 on `develop`, local commits. Owner message 2026-10-08: "ayudame con todo eso tenes mi permiso para las mejores decisiones", plus "me gusta mucho usar pixel". Push and release stay a separate decision, asked at the end.

## Acceptance criteria

- No horizontal overflow at 320, 390, 768 and 1024 px on `/`, `/me/`, `/experiments/`, `/notes/`, `/contact/`, `/changelog/`, and at 390 px with a 32 px root font.
- Tag chips, sidebar links and the privacy link are at least 44 px tall in their hit area.
- No `text-transform: uppercase` labels (except language codes) and no `·`-joined meta strings on pages; docs and tests agree.
- Page titles on the four pages are pixel, share spacing and keep LCP and CLS within the repo gates (Lighthouse in CI, page-weight and JS budgets).
- Full unit tests, typecheck, biome, depcruise, docs:config, build and the full e2e suite pass.

## Progress and evidence

2026-10-08, local on `develop`, not pushed. One bounded writer per unit, parent review of each diff and own checks, one commit per unit: `4ecbfa8` and `3bbbebf` (I1 and the `/me` budget), `2de9b8b` and `9938917` (I2 and the verification map entry), the I3 commit, `0df19da` (test and changelog).
- I1: overflow guard spec written first (RED 8 of 31), then fixes; thumbnails, tooltips and `DecisionRecord` grid clamped; 44 px hit areas for link chips, sidebar and privacy links; header wraps at a 200% root font (the test measures the menu button staying on screen; a whole-page overflow at a 32 px root font also hits the notes cards and `/me`, a harsher case than real zoom, left out and not claimed); `/me` aside no longer sticky; contact fields `required` plus a polite summary (the existing per-field `role="alert"` and `aria-describedby` were already there: the evaluators' claim was wrong); 404 without the subscribe band; changelog counters with `title`. Budget: `/me` HTML 121145 B against 120900 B, raised to 126000 B with the measurement (full-stack story plus hit areas).
- I2: `PageHeader` and `text-page-title` (pixel H1) on Experiments, Contact, Changelog and Notes; pixel preloaded where an H1 uses it (tests `performance` and `pixel-display` updated to that policy); ALL-CAPS labels and middle-dot meta strings removed on pages (language codes ES/EN kept); `DESIGN.md` and `BRAND.md` reconciled (BRAND line 182 contradicted line 113); contact header spans both columns so the panel aligns with the form; `interaction-polish.spec` now looks for the contact intro under the shared header.
- I3: phone-only "Ver mi perfil" in the hero (compact: `calm-pages` caps the 360 px hero at 28 rem, about 1.5 px of slack), "Ahora" moved under the pillars, a line on `/en/` that the notes are written in Spanish (`Intl.DisplayNames`, pure helper tested first).
Checks (parent, after all units): biome and typecheck clean, depcruise clean, `docs:config` up to date, unit 1312 tests, build, `check:js-budget` and `check:page-weight` (26 pages) pass, `test:white-label` pass, full `pnpm test:e2e` at three viewports 1147 passed (the first full run had 2 failures in `interaction-polish.spec`, fixed), Lighthouse mobile local 1 run: all pages pass, LCP 1966 to 2421 ms (gate 2500), CLS 0 except the smoke note 0.015.
Closest to the line: `/me/` LCP 2421 ms (79 ms of margin, one local run; CI does three), `/notes/` HTML at 98% of its budget, `/experiments/` 97%.
Not done on purpose: OG images and emails (uppercase and middle dots), the pink blockquote bar, banner grid, font subsetting, a real static frame for reduced motion, home pills and pillars wording (BRAND.md first), dark theme and `/en/*` re-review, real screen reader and touch testing.

## Next step

Record the result of the CI rerun (below), then verify the live site read-only and close I4.
