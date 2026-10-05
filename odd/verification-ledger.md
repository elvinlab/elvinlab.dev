# Verification ledger

The repository rule is in [`docs/TESTING.md`](../docs/TESTING.md), section "Touch-scoped verification": verify what a change touches, record it, and do not repeat a check whose scope was untouched since its last green entry. Update this file in the same commit as the change it records.

## Last green commit per check family

A check is **stale** when files in its scope changed after its last green commit: `git diff --name-only <sha>..HEAD -- <scope>` prints something. Seeded on 2026-10-05 from the records of that day (commits are exact where a run was made on a clean commit; the Lighthouse and e2e rows were run on the working tree of that commit).

| Check | Last green | Result | Scope (a change here makes it stale) |
| --- | --- | --- | --- |
| `typecheck` | `addc4ac` | 0 errors | `**/*.ts`, `**/*.tsx`, `**/*.astro`, `tsconfig*.json`, `package.json`, `pnpm-lock.yaml` |
| `lint` | `addc4ac` | clean | any file Biome checks (`*.ts`, `*.tsx`, `*.astro`, `*.json`, `*.css`) |
| `unit` (`pnpm test`) | `addc4ac` | 37 + 780 passed | the files each test imports (`vitest related`) |
| `depcruise` | `addc4ac` | 0 violations (196 modules) | added, moved or removed source files and edited imports |
| `docs:config` | `addc4ac` | no drift | `shared/config/schema.ts`, `env-vars.ts`, the notes frontmatter schema |
| `build` | `addc4ac` | complete | source, content (`content/**`), config of Astro, Vite, Tailwind, Wrangler |
| `check:js-budget` | `addc4ac` | 17 pages PASS; note pages 12.84 KiB (22.56 with the Preact island, before the rework) | client JavaScript, islands, scripts, client dependencies |
| `test:white-label` | `addc4ac` | passed (with the new no-marks-markup assertion) | schema, `site.config.ts`, fixtures, identity text in templates |
| `check:dev-cold-start` | `07ae27d` | 7 routes | dev dependencies, Vite configuration |
| `test:e2e` (whole suite, 3 viewports) | `61ae176` | 548 passed, 247 skipped by annotation | the area each spec covers (see the impact map). Since then only the notes area and the privacy page were re-run, see the rows below |
| `test:lighthouse` | `addc4ac` | worst LCP `/notes/smoke-es/` 2268 ms, performance 97 to 99 | HTML or CSS bytes of a gated URL |

Lighthouse baseline at `addc4ac`, with the footprint button (document size, worst LCP of 3 runs; before the button, at `61ae176`, in brackets): `/` 74.1 KB, 2213 ms (74.0, 2215); `/en/` 74.0 KB, 2189 ms (73.9, 2189); `/contact/` 66.8 KB, 1815 ms (66.7, 1813); `/en/contact/` 66.6 KB, 1962 ms (66.6, 1814); `/notes/` 69.3 KB, 1962 ms (69.2, 1961); `/notes/smoke-es/` 87.8 KB, 2268 ms (83.0, 2265). Budget 2500 ms. The contact pages sit on a byte boundary: about 100 bytes of global CSS flip them by about 150 ms (it was `/contact/` once, `/en/contact/` now), still far from the budget; the note page is the one to watch (about 230 ms of margin).

## Verified changes

| Date | Commit | Change | Ran | Not re-run (why it was safe) |
| --- | --- | --- | --- | --- |
| 2026-10-05 | `07ae27d` | pre-release baseline | the whole battery, 11 steps, all green | none |
| 2026-10-05 | `304b309` | note 003 (content, changelog, trackers) | `docs:config`, typecheck, lint, unit, depcruise, real build, js-budget (17 pages), quick e2e 256, simulated-phone LCP of the new note | white-label, cold start, Lighthouse: no code, schema or shared markup changed |
| 2026-10-05 | `88f054a`, `79bdde3` | `og:title` without the site suffix; framed images (`.prose img`) | typecheck, lint, unit, depcruise, full e2e 540, Lighthouse (worst LCP unchanged at 2265 ms), `docs:config` | white-label, cold start: schema and build graph unchanged |
| 2026-10-05 | `744a833`, `61ae176` | X and WhatsApp share links, two-row panel | lint, typecheck, unit, depcruise, full e2e 548, Lighthouse (note document 80.8 to 83.0 KB, worst LCP 2265 ms) | js-budget: the share script did not change; white-label, cold start |
| 2026-10-05 | `7ab9c9c`, `ae87ccd` | `features.marks` flag and block; marks server, D1 adapter, actions | typecheck, lint, unit 729, depcruise, `docs:config`, build, white-label | e2e and Lighthouse: no page markup, CSS or JavaScript changed yet (the flag renders nothing until the UI exists) |
| 2026-10-05 | `f78a087`, `addc4ac` | marks UI (plain script component, no island, CSS inlined once; privacy tooltip), privacy reassurance next to the comments, privacy page section, ADR 0013 | typecheck, lint, unit 780, depcruise, `docs:config`, build, js-budget (17 pages), white-label; e2e at 1280: notes-layout, note-share, link-previews, note-translations, reading-mode, calm-pages, card-links, focus-not-obscured, a11y, comments, legal, internal-links, smoke, mobile-ux, external-links (174 passed); marks spec at 3 viewports (130 passed, 32 skipped by annotation); Lighthouse once (table above) | contact, home and `/me` e2e specs: their code did not change (their pages only grew about 100 bytes of global CSS, covered by Lighthouse); the whole 3-viewport suite; cold start: no dependency added |
