# Experiments: notebook cue on the piece panel (critique P2)

## Objective and authorization
2026-10-13, owner chose "no box + number" for P2 of the impeccable critique of `/experiments/`: in dark mode the text panel of each piece is an identical dark card, so the lab-notebook identity (design v3) does not show. Local commits on `develop`; push and release stay the owner's call. Out of scope: P3 hover polish, screenshot content, anything outside `/experiments/`, the compact tier and `/me`.

## Design (decided with the owner)
- Drop the card box of the piece panel (no fill, no radius): the text sits directly on the page like the home main column and `/notes/` ("fewer boxes", decided 2026-10-10), separated by space and the dashed hairline between pieces.
- Add a mono entry label "Experimento 001" / "Experiment 001", the counterpart of "Nota 003" on notes (number in the pink accent, the one accent), above the status pill. The number is stable: the 1-based position of the experiment in publication-date order (oldest = 001, id as tie-break), never the position in the current sort or page. Document it in `docs/PORTFOLIO.md` and `docs/PORTFOLIO.en.md`.
- Keep Problema / Mi parte / Resultado (with the hierarchy of X13), the chips and the actions (X10/X11) as they are.

## Tasks
- [x] X14 — Stable experiment number: pure function with a unit test (oldest = 001, tie-break by id, same value in every sort and page, three-digit padding), i18n label ES/EN within text limits.
- [x] X15 — Boxless panel with the numbered label: both image-left and image-right variants, solo (no image) variant, both locales, both themes, phones and desktop; text contrast at least 4.5:1 on the page background in both themes; no overflow at 360 and 390.

## Acceptance criteria
- Only `/experiments/` changes; home, `/me`, `/education/`, `/changelog/` look exactly as before.
- Tokens only, no hard offset shadows, no ALL-CAPS labels, no new JS, no gradients or glows.
- The writer looks at screenshots (desktop and phone, dark and light) and the parent reviews them again.
- Touch-scoped checks per `docs/TESTING.md`; heavy battery once at close.

## Progress and evidence
Route: delegated writer; parent reviews the diff, re-runs checks and looks at screenshots.

### X14 + X15 (delegated writer, 2026-10-13, uncommitted)
- Files: new `features/portfolio/lib/experiment-number.ts` (+ test; `experimentNumbers` exported through the barrel), `experiment.entry` i18n ES/EN (limit 32), `ExperimentPiece.astro` (`number` prop, `.xp-num` label above the pill), `ExperimentsPage.astro` (numbers over ALL experiments), `experiment-styles.ts` (+ test), new `tests/browser/experiments-panel.spec.ts` (mapped in `verification-map.ts`), `docs/DESIGN.md`, `PORTFOLIO.md`, `PORTFOLIO.en.md`, changelog `experiments-notebook-panel`, budget (changelog html only).
- Design: `.xp-panel` has no fill, radius or padding; `.xp-num` shares the existing mono rule of the fact labels (selector grouping, no new font variable text), 0.875rem, muted, number in `<b>` with the pink token; `.xp-top` is a column (label, then pill). All scoped to `xp-` classes of the experiments stylesheet; home, `/me`, case pages untouched.
- RED: vitest `experiment-number` failed (module missing, observed by moving the file away); `experiment-styles.test.ts` 2 failed before the CSS (panel no background/radius/padding, pink number). The e2e spec was written after the implementation, so no e2e RED was observed (gap).
- Changed existing assertions: `experiments-images.spec.ts` thumbnail-edge test compared the edge to the `.xp-panel` card fill; the panel is now transparent, so it checks the page background only (3:1 still).
- GREEN: biome clean; typecheck 0 errors; depcruise no violations; vitest 1640/1640 (141 files); build ok; `check:js-budget` pass; `check:page-weight`: experiments passes (style 65672/65900, html 101260/101400, no raise), changelog raised html 120850 -> 121350 (measured 120948); no privacy/subscribe/home/me/education leak; 9 `/notes/<slug>/` pages fail by +9 B style (69009/69000) but fail identically on the base commit (verified with stash), unrelated; `test:white-label` pass; `docs:config` up to date; `test:e2e:quick` batch (experiments, buttons, images, panel, no-horizontal-overflow, a11y, mobile-ux, home-sections, me-hero-tips, reduced-motion, calm-pages): 255 passed, 1 skipped, 0 failed; panel spec alone 24/24.
- Visual review (preview build, reduced motion, 1280 and 390, dark and light): label, pill, title, facts and chips read cleanly on the page background; image-left and image-right alternate correctly; hairline sits centered between pieces; no widows or misalignment found, so no visual fix was needed. Numbers: agentic-dev-setup 001, elvinlab.dev 002 (same date, id tie-break).
- Gaps: solo variant exercised by removing the media in the DOM (real CSS), not rendered by Astro; panel contrast asserted at 1280 px only; 360/390/768 checked for overflow only; no Lighthouse, no full e2e battery.
