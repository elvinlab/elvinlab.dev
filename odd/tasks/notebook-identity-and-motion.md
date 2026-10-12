# Feature: notebook identity and motion, site-wide

## Objective

Make the whole site feel designed and alive, like a native app, with one recognizable signature: the lab notebook ("I write down what goes wrong"). Fluid, purposeful motion and a handmade ink layer on every page, without looking like a template and without breaking the byte, LCP and CLS budgets.

## Problem / why

A reviewer called the site template-like and forgettable (2026-10-12): identical dark cards with a violet glow, small text, nothing memorable. A third-party redesign of the same site (reviewed locally, not adopted) answered with a "data to screen" concept and heavy motion, but with no tests, no budgets, hardcoded identity and a Node-only runtime. Owner decisions 2026-10-12: the notebook is the signature (not the data layer, which stays on `/me` only), fluid motion is wanted ("animaciones fluidas"), and existing written brand rules may change ("no te cases con lo que ya tenemos escrito").

## Prototype evidence (uncommitted, 2026-10-12)

Two components, `Fix` (struck-through mistake plus the correction) and `Ink` (hand-drawn underline or circle), seen in `apps/web/src/content/drafts/prototipo-tinta` at 390 and 1280 px, light and dark. Owner approved the direction. Known limits: scoped component CSS is not emitted in dev for components used inside draft MDX (prototype CSS was moved to `global.css`); production build not verified; the circle grazes the line above on a wrapped mobile heading.

## Scope (to be confirmed by N1)

- Brand and design docs first: `docs/BRAND.md`, `docs/DESIGN.md` (motion language, ink system, what replaces the "steps(4) only" rule).
- `Fix` and `Ink` as real components with a decided CSS home, i18n for the screen-reader label, tests.
- Cross-page transitions (CSS view transitions) with graceful fallback.
- Per-page application of the signature on every page type: home, notes index and note, `/me`, experiments, changelog, contact.
- Native-app feel that costs no JavaScript: touch feedback, safe-area insets, overscroll, theme-color, optional web app manifest.
- Page-weight and Lighthouse budgets raised only consciously and recorded.

## Constraints

- White-label: no owner literal in components; copy through config and i18n. Reduced motion: every animation off or shown in its final state. No JS added for motion; 30 KiB JS gzip stays.
- LCP: never animate opacity on the LCP element; transform only (DESIGN.md). CLS: nothing may change layout (open issue #124 on `/me/`).
- Stylesheet and per-page HTML budgets are nearly exhausted: every addition is measured and the raise is written down.
- Firefox does not support cross-document view transitions (verified 2026-10-12 via search; recheck caniuse before documenting): navigation must stay correct without them.
- Do not run `build`, `typecheck` or e2e while the owner's dev server is up (it returns 500 until restarted).
- Touch-scoped verification per CLAUDE.md. Memory rule: the full e2e quick plus white-label run once at close for visual work. Stays on `develop`; push and release only on explicit authorization. No Engram mirror of this file.

## Tasks

- [x] **N1** Map every page type, the shared layout and motion tokens, the budgets and the view-transition feasibility; return a per-page proposal. Route: delegated read-only explorer (mapping trigger: more than 5 sequential lookups across all pages).
- [x] **N2** Docs first: BRAND.md and DESIGN.md decisions from N1 and the owner. Route: inline or one writer, decided after N1.
- [x] **N3** `Fix` and `Ink` production components: CSS home, production build check, i18n, a11y, unit and e2e tests. Route: delegated writer.
- [ ] **N4** Cross-page transitions with fallback. Route: delegated writer.
- [ ] **N5** Per-page signature, one page type per commit. Route: delegated writer per page type.
- [x] **N6** Native-feel layer (touch, safe-area, overscroll, theme-color, manifest if approved). Route: delegated writer.
- [ ] **N7** Close: full `test:e2e:quick`, white-label, budgets, mobile Lighthouse once. Route: delegated verification worker; parent reads the report.

## Authorized scope

Owner decision 2026-10-12: the brand is meant to evolve in this feature, so changing BRAND.md and DESIGN.md rules (including the `steps(4)`-only motion rule) needs no per-rule confirmation; the docs are updated first, in the same task, and the change is recorded here. N1 now; N2 to N7 on `develop`, local commits only. Push, release and any chain-of-PRs strategy stay the owner's decision.

## Delivery

Forecast well above 400 authored changed lines: strategy `ask-on-risk`; chain strategy (`stacked-to-main` or `feature-branch-chain`) to be asked once before the next commit that crosses the line. Slice boundaries recorded here when set.

## Acceptance criteria

- Every page type shows the notebook signature in a way a visitor notices without interacting, in both themes and both locales.
- Page navigation animates in Chromium and Safari, and behaves normally in Firefox.
- No horizontal overflow at 360, 390, 768, 1280 px; no new CLS; reduced motion respected.
- All budgets pass, with every raise recorded; white-label passes.

## Progress and evidence

- 2026-10-12: feature opened after the owner approved the prototype. Related commits: `c00dde5` (home byline), `a6c512f` (`/me` raw-data block). Prototype files are uncommitted.

- N1 (2026-10-12): delegated read-only map done. Findings: no view transitions, ClientRouter or `view-transition-name` today; every page goes through `BaseLayout` and shares the `.banner-grid` lab paper; inner pages (experiments, changelog, contact, topic) are generic; only the note page, home banner and `/me` hero are distinctive; no `viewport-fit=cover`, `overscroll-behavior`, manifest or `apple-touch-icon`; motion has no tokens (literal easings), `fade-in-up` is the only entrance; reduced motion is one global block. Budgets: `/me/` and topic pages have about 0 B of style headroom; the uncommitted prototype adds about 3 KB to every page if left in `global.css`, so Fix and Ink must move to scoped component CSS (production build of that still to verify). Firefox "partial" for cross-document view transitions is unspecified on caniuse: treat as unsupported.
- Ranked proposal (rough bytes, not measured): 1 note page margin note and stamp; 2 Fix and Ink in prose; 3 home hero ink on one word (stroke only, text is the LCP); 4 notes index ruled rows; 5 `/me` ink tag on the portrait; 6 one shared stamp in `PageHeader` for topic, changelog, contact, experiments; 7 view transitions (high risk: LCP, CLS, double entrance); 8 native-feel layer (cheapest and safest).
- N2 (2026-10-12): docs first, one writer, docs only. BRAND.md: new section "Firma: el cuaderno de laboratorio" (Fix, Ink, stamp, margin note, ink rules, per-page plan, native-feel note, honest limit), stamp as a bounded all-caps exception, motion tokens (`ease.*`, `duration.*`, `motion.stepped`) and the two motion registers, glow tokens frozen, no-new-glow/gradient/loop rule, open item for the manifest. DESIGN.md: Direction bullet for the signature, Avoid exceptions, Motion rewritten into pixel and eased registers, "Page transitions: none" replaced by the allowed CSS view-transition rules, new Notebook ink system, Native feel layer and Signature plan sections. Contradiction searches over both docs: `steps(4`, `stepped`, `Page transitions`, `no motion`, `glow|resplandor`, `ALL-CAPS|mayúscula`, `sin bucle|loop`, `transition`: remaining hits are existing pixel-register uses, frozen glow uses (featured experiment piece, OG card, banner) or the new rules; no leftover conflict. Known unrelated stale text left alone: BRAND.md "Sí" list still says "Space Grotesk" for titles (font changed 2026-10-11).
- N6 (2026-10-12): native feel layer, delegated writer, no new motion JavaScript. `viewport-fit=cover`; `body` side insets, navbar top and footer bottom `env(safe-area-inset-*)` in `global.css` (all 0 on ordinary screens, overflow test green); `overscroll-behavior: contain` and transparent tap highlight on `html`; `active:scale-96` added to navbar links/brand/language link, footer links, standalone chips (3 call sites), back-to-top and the whole `NoteRow` (chips inside rows rely on the row, which saved about 1 KB on the notes index); `theme-color` metas now follow the toggle through a 6-line `syncThemeColor` in the existing `ThemeToggle` script (computed `--color-page`, on load and on switch; the two media tags stay as no-JS fallback). No manifest, icons or service worker (owner decision pending). RED: `native-feel.spec.ts` 6 failed, 1 passed (the no-overflow baseline, legitimately green before); GREEN: 7 passed. Budget raises (minimum measured overshoot, `why` updated in `page-weight-budget.json`): home html 101400 -> 101900; result style 54300 -> 54500, html 79100 -> 79600; changelog html 115800 -> 116600; me style 55712 -> 56000, html 122900 -> 123600; notes-index html 88200 -> 88700; topic style 54200 -> 54500, html 81000 -> 81700. Checks: biome, typecheck, depcruise, build, js-budget, page-weight, white-label, targeted e2e (8 specs) green; the `mobile-ux` "latest note near the fold" case failed once in the combined run and passed in two isolated reruns (flaky under load, not reproduced). Not run: Lighthouse, full e2e (N7).
- N3 (2026-10-12): `Fix` and `Ink` are production components with scoped CSS (nothing added to `global.css`; per-theme data-URI strokes are `:global([data-theme=...])` rules inside each component), label localized (`notes.fix.correctedTo`, ES/EN, from `Astro.currentLocale`), circle now keeps its SVG inside the line box (no graze), circle documented as short single-line only. Production-CSS finding: in a real `pnpm --filter web build` with both components temporarily appended to a published note (reverted afterwards), the scoped rules (`.fix-wrong[data-astro-cid]`, theme rules, `ink-draw` keyframes) are inlined in that note's HTML (130439 -> 134082 B, +3643 B including markup) and absent from `/me/` (123570 B) and `/notes/` (124628 B), both byte-identical before and after; so the missing scoped CSS in `astro dev` for MDX components is a dev-server quirk, not a production defect. No page-weight budget change (no published page uses the components). Fixture usage added to `tests/fixtures/notes/smoke-es` and `smoke-en` (not `fixture-workspace.ts`). RED: `ink.spec.ts` 7 failed, 1 passed (overflow baseline) before the components were styled; GREEN: 8 passed. Combined run (ink, no-horizontal-overflow, a11y, smoke): 92 passed, 80 skipped by design. Checks green: biome, typecheck, depcruise, build, js-budget, page-weight, white-label, docs-quality. Docs: NOTES.md/NOTES.en.md "ink in a note" block, DESIGN.md shapes and CSS home bullets. Changelog `notes-ink-components`. Not run: Lighthouse, full e2e (N7).

## Next step

N5: per-page signature, note page first (margin note and stamp for the decision record; use `Fix`/`Ink` in prose only when the owner writes a note that needs them). N4 (transitions) stays pending.
