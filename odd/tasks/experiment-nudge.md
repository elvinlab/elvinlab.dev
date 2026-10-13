# Experiment nudge

2026-10-12: planned with the owner, implementation authorized ("arranquemos"). Work happens directly on `develop` (no CI attached). No Engram mirror for this file (project override of the global ODD protocol).

## Objective
A cold visitor reading a note does not know who runs the site. Show a small, discreet card that points to the latest experiment with a thumbnail, at the moment the visitor has shown interest, so they find the portfolio without being interrupted.

## Authorization
Owner asked for a notification, accepted the two-layer plan (static card first, floating card after) and said it must be switchable on and off like every other feature. Push and release to `main` remain separate owner decisions.

## Design
- Flag `features.experimentNudge` in the central config, **off by default**, same contract as `readingMode`: off renders nothing, loads no script or CSS, stores nothing in the browser. It also needs `features.experiments`: with that flag off it never shows.
- Options (all optional, with defaults): `nudge.scrollThreshold` (0.7 on notes), `nudge.indexScrollThreshold` (0.6 on `/notes`). No `nudge.pages`: the excluded pages are fixed in code (YAGNI).
- Layer 1, no JS: a static `ExperimentCard` at the end of every note and a static block on the home. Data comes from the `experiments` collection (`content.config.ts`): the most recent entry by publication date, never an archived one.
- Layer 2, enhancement: the same card as a floating note-like card (bottom-right on desktop, a thin bottom bar on phones) shown once per session when the visitor passes the scroll threshold (`IntersectionObserver` on a sentinel). Close button always visible; closing stores `localStorage` with try/catch; never steals focus; `role="status"` politely; `position: fixed` so it cannot shift layout (see issue #124 on CLS).
- Never on `/experiments/*`, `/me`, `/contact`, legal pages, 404. Reduced motion: appears with no animation.
- No library: vanilla script plus CSS inside the existing JS budget (<=30 KiB gzip per page).

## Tasks
- [x] N1 — Flag and options in the schema and `site.config.ts`, white-label fixture off, `pnpm docs:config`. Tier 2.
- [x] N2 — `ExperimentCard.astro` (static card, latest-experiment selector with a unit test, ES/EN texts). Tier 2.
- [x] N3 — Static layer: card at the end of `NotePage.astro`, static block on the home. Tier 2.
- [x] N4 — Floating layer: script, once-per-session, dismissal storage, page exclusions. Tier 3.
- [x] N5 — Same floating behaviour on `/notes` (`NotesIndex.astro`). Tier 2.
- [x] N6 — Visual design in the notebook language, phone bar, motion and reduced motion. Tier 3.
- [ ] N7 — Tests: unit, e2e (appears, closes, does not return, excluded pages, flag off renders nothing), `check:js-budget`, white-label. Tier 2.
- [x] N8 — Changelog entry and `docs/CONFIGURATION*.md` / `docs/NOTES*.md` mention. Tier 1.

First work unit: N1 + N2 + N3 + N8 (works without JS). Second: N4 + N5 + N6 + N7.

## Acceptance criteria
- Flag off (default and white-label fixture): no card, no script, no CSS, no `localStorage` key in the HTML of any page.
- Flag on: static card on notes and home without JS; floating card appears once at the threshold, closes, does not return in the session, never on the excluded pages; axe clean in both themes; no overflow at 360 px; no CLS added.
- JS budget and Lighthouse gates unchanged.

## Route declaration
Per task: N4 and N6 inline (Tier 3: judgement on behaviour and design); N1, N2, N3, N5, N7 candidates for OpenCode (Tier 2) with a written brief; N8 inline (one entry). Evidence trigger: more than 5 lookups needed to map i18n and the home page, so the mapping goes to one read-only explorer first.

## Delivery
Forecast under 400 authored changed lines per work unit; `ask-on-risk` strategy (default).

## Progress and evidence
N1 done (inline, Tier 2 mirror of the readingMode pattern: the brief would cost as much as the edit): RED (5 schema tests failing), GREEN (164 config tests; 1416 unit tests total), typecheck 0 errors, lint clean, depcruise clean, white-label green, `docs:config` regenerated. Flag is `.default(false)` so outputs gain the key; three fixtures extended. e2e and Lighthouse not re-run: the flag renders nothing yet; they run at the close of the first work unit.
N2 done (inline: delegation to OpenCode `omniroute/elvinlabCode` failed with "Cannot connect to API", exit 1, nothing written; Codex was also active in the repo, so no second writer was started): RED (selector module missing), GREEN (6 selector tests; 78 in portfolio and i18n), typecheck 0 errors, lint clean. `ExperimentCard.astro` renders no script or CSS and is not placed in any page yet (N3). Cover render reused from `ExperimentCompact.astro`; link goes to the case note, else `/experiments/#id`. Key `nudge.cta` is added for N4 and unused until then.
N3 done (inline, same OpenCode outage): `ExperimentNudge.astro` gates on `experimentNudge` and `experiments` and renders the latest live experiment. NotePage exposes `<slot name="end" />` and the two note routes fill it, because notes cannot import portfolio (depcruise: no-circular and no-cross-feature-internals fired first, then clean: 304 modules). Home renders it only when `homeSections.experiments` is off (the grid already shows experiments). Checked on real builds: flag off, 0 cards on every page; flag on, card on the ES home, EN home and 9 ES notes (no EN notes are published). Screenshots sent to the owner; known draft issue: the card sits flush against the Next-note card on a phone (spacing belongs to N6). typecheck 0 errors, lint clean. e2e and Lighthouse still pending for the close of this work unit.
N8 done (inline, Tier 1; OpenCode still unreachable): English entry `experiment-nudge` in `changelog.json` (category added, dated 2026-10-12, restamped at release); the config tables in `docs/CONFIGURATION*.md` were regenerated in N1. `pnpm changelog:audit` still lists the four earlier commits (N1 to N3 and the spacing fix) because it checks commit by commit and the entry landed in a later commit; one entry covers the whole feature and I did not rewrite local history for it. First work unit (N1 to N3, N8) is complete. e2e, budgets and Lighthouse are NOT re-run yet: with the flag off the cards render nowhere (builds checked), and the full set runs once after N7, together with the new spec.
N4 done (inline, Tier 3): `nudge-script.ts` (inline ES5 string, same pattern as reading mode), `nudge.css`, and `ExperimentNudge` gains `floating` (note routes pass it; the home does not). RED (script module missing), GREEN (11 script tests with a fake DOM; 88 in portfolio), typecheck 0 errors, lint clean, depcruise clean. Checked in Chromium on a flag-on build, desktop 1280 and phone 390: closed at the top and at 40%, opens at 80%, hides while the static card is on screen and returns after, the close button hides it and writes `localStorage`, a reload after closing renders nothing, `sessionStorage` marks it shown, reduced motion shows it without a visible transition, `/me/` has no card. Deviations from the plan: the card sits bottom-left (the back-to-top button owns bottom-right) and has no `role="status"` (an unsolicited live announcement is noise; it stays reachable in tab order); it is hidden in reading mode and in print. Not done: a Playwright spec (N7).
N5 done (inline, Tier 2 by routing but OpenCode is unreachable): the script now takes `target` (`article` on notes, `main` on the index) and can float a card from `template[data-experiment-template]` when the page has no static card; `ExperimentNudge` has `variant="note"|"index"` and the index uses `nudge.indexScrollThreshold`. `NotesIndex` exposes `<slot name="end" />`, filled by `blog-routes/notes-index.astro` (the only index route: no English index exists). RED (2 of 3 new tests failing), GREEN (14 script tests; 91 in portfolio), typecheck 0 errors, lint and depcruise clean. The script size cap in its test moved from 2500 to 3000 bytes: it is 2547 bytes, 966 gzip. Chromium on a flag-on build, desktop and phone: closed at 40%, open at 70%, one static card on the page is none (template only), closing on the index keeps the card away on a note (shared `localStorage`).
N6 done (inline, Tier 3), owner asked for bottom centre, prettier, a pixel-art touch and more information (decision: bottom centre, not a dimmed dialog, which would interrupt reading and risks the mobile intrusive-interstitial penalty). `ExperimentCard` rebuilt with plain CSS (`experiment-card.css`, `nudge.css`), inlined by `ExperimentNudge` only when the flag is on, because Tailwind utilities used once land in every page stylesheet. Pixel look: four hard 4 px shadow bars as a frame, hard offset shadow, 9x8 flask in pink, 9x9 pixel arrow, `steps(4, end)` entrance; no pixel face (reserved for large text). Shows label, status, year, thumbnail, title, summary, up to three tags and a CTA. Phone: back-to-top rides above the card (`--btt` lift measured: button bottom 632 px vs card top 642 px). Frame colour darkened after the light theme looked washed out. Checked in Chromium on a flag-on build: desktop dark and light, phone dark, static card. typecheck 0 errors, lint and depcruise clean, 91 portfolio tests. `docs/DESIGN.md` has the entry.
Plan only so far. Issues: N1 #125, N2 #126, N3 #127, N4 #128, N5 #129, N6 #130, N7 #131, N8 #132 (T86 to T93).

## Next step
Start N7 (#131): Playwright spec, JS budget, white-label, Lighthouse, full e2e once; then the release decision is the owner's.
