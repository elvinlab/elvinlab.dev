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
- [ ] N2 — `ExperimentCard.astro` (static card, latest-experiment selector with a unit test, ES/EN texts). Tier 2.
- [ ] N3 — Static layer: card at the end of `NotePage.astro`, static block on the home. Tier 2.
- [ ] N4 — Floating layer: script, once-per-session, dismissal storage, page exclusions. Tier 3.
- [ ] N5 — Same floating behaviour on `/notes` (`NotesIndex.astro`). Tier 2.
- [ ] N6 — Visual design in the notebook language, phone bar, motion and reduced motion. Tier 3.
- [ ] N7 — Tests: unit, e2e (appears, closes, does not return, excluded pages, flag off renders nothing), `check:js-budget`, white-label. Tier 2.
- [ ] N8 — Changelog entry and `docs/CONFIGURATION*.md` / `docs/NOTES*.md` mention. Tier 1.

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
Plan only so far. Issues: N1 #125, N2 #126, N3 #127, N4 #128, N5 #129, N6 #130, N7 #131, N8 #132 (T86 to T93).

## Next step
Start N2 (#126): ExperimentCard and the latest-experiment selector.
