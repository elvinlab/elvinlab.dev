# Notes discovery (issues #121 and #122)

Objective: help a visitor who is not drawn to the newest notes (curated start path, static topic pages), with strict performance (no new JS, no net bytes on note pages). Strategy and decision record: `odd/tasks/elvinlab-site.md` (2026-10-12 entries).

## Owner decisions (2026-10-12)

- Start-here notes, in order: 1 `como-construi-este-sitio`, 2 `vibe-coding-o-especificar-primero`, 3 `el-lcp-se-pierde-en-el-head` (replaces the 002 proposal in the issue).
- Topics: "Agentes de IA", "Rendimiento y verificación", "Arquitectura de este sitio"; intros drafted by the assistant, owner approves them.

## Tasks

- [x] T83 (#121) Start here: schema `startHere`/`startHereNote`, selection function, build guard, `/notes/` block, "Sigue leyendo" block, docs, changelog, tests.
- [x] T84 (#122) Topic pages `/notes/tag/<topic>/`: topics content file, routes, guard, sitemap, JSON-LD, chip links, "Temas" list, page-weight type `topic`, docs, changelog, tests. Starts after T83.

## Route

Delegated direct: one writer per task (multi-file, schema + pages + tests). Parent reviews each diff and measures bytes.

## Checks

Per issue (unit, build guard cases, page-weight, js-budget, white-label, notes e2e at 360/768/1280, a11y, Lighthouse before/after on `/notes/` and a note). Full battery at release.

## Evidence

T83 (writer, delegated, 2026-10-12): lint, typecheck, vitest notes (81) + scripts (231), build, page-weight (32 pages, no budget changed, CSS identical), js-budget, white-label, depcruise, e2e quick whole (611 passed, 3 failed: mobile-ux nowrap fixed, font-swap intermittent passes alone), notes-start-here + mobile-ux + notes-layout re-run green after fix, Lighthouse local /notes/ and /notes/smoke-es/ all assertions pass (no before-baseline run). RED observed on start-here.test.ts (module missing).
Bytes: /notes/ +1733 B HTML (target ~900; ~700 B is visible text); note pages -18..+664 B (+~330 B per extra "Sigue leyendo" item). "No net increase" target NOT met on pages that gain items; accepted tradeoff pending owner view.
Gaps: test fixtures carry no startHere, so e2e covers only the fallback; flagged path is unit-tested. Whole e2e not re-run after the nowrap fix (affected specs re-run).

T84 (writer, delegated, 2026-10-12): lint, typecheck, whole-web vitest (1373), build, page-weight (35 pages; new `topic` budget style 54200 / html 84800 = measured rounded up), js-budget, white-label, depcruise, docs:config, e2e quick whole twice (623 passed; only font-swap failed, passes alone), topic/tag-filter/card-links re-run after last edit (23 passed), Lighthouse local /notes/ and /notes/tag/pruebas/ all assertions pass. RED on topics.test.ts and tagHref; jsonld/schema tests written alongside.
Bytes: note pages +33..+98 B (longer chip hrefs); /notes/ +1835 B (119915 / 120200 budget); topic pages ~83-85 KB, same stylesheet. fixture-workspace.ts changed (full-wide script): topics fixture swapped in for fixture builds.
Owner approved the three intros verbatim (2026-10-12).
