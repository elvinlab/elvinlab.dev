# Verification ledger

The repository rule is in [`docs/TESTING.md`](../docs/TESTING.md), section "Touch-scoped verification": verify what a change touches, record it, and do not repeat a check whose scope was untouched since its last green entry. Update this file in the same commit as the change it records.

## Last green commit per check family

A check is **stale** when files in its scope changed after its last green commit: `git diff --name-only <sha>..HEAD -- <scope>` prints something. Seeded on 2026-10-05 from the records of that day (commits are exact where a run was made on a clean commit; the Lighthouse and e2e rows were run on the working tree of that commit).

| Check | Last green | Result | Scope (a change here makes it stale) |
| --- | --- | --- | --- |
| `typecheck` | `ae87ccd` | 0 errors | `**/*.ts`, `**/*.tsx`, `**/*.astro`, `tsconfig*.json`, `package.json`, `pnpm-lock.yaml` |
| `lint` | `ae87ccd` | clean | any file Biome checks (`*.ts`, `*.tsx`, `*.astro`, `*.json`, `*.css`) |
| `unit` (`pnpm test`) | `ae87ccd` | 37 + 729 passed | the files each test imports (`vitest related`) |
| `depcruise` | `ae87ccd` | 0 violations | added, moved or removed source files and edited imports |
| `docs:config` | `ae87ccd` | no drift | `shared/config/schema.ts`, `env-vars.ts`, the notes frontmatter schema |
| `build` | `ae87ccd` | complete | source, content (`content/**`), config of Astro, Vite, Tailwind, Wrangler |
| `check:js-budget` | `2412177` | 17 pages PASS | client JavaScript, islands, scripts, client dependencies |
| `test:white-label` | `ae87ccd` | passed | schema, `site.config.ts`, fixtures, identity text in templates |
| `check:dev-cold-start` | `07ae27d` | 7 routes | dev dependencies, Vite configuration |
| `test:e2e`, 3 viewports | `61ae176` | 548 passed, 247 skipped by annotation | the area each spec covers (see the impact map) |
| `test:lighthouse` | `61ae176` | worst LCP `/notes/smoke-es/` 2265 ms, performance 98 or 99 | HTML or CSS bytes of a gated URL |

Lighthouse baseline at `61ae176` (document size, worst LCP of 3 runs): `/` 74.0 KB, 2215 ms; `/en/` 73.9 KB, 2189 ms; `/contact/` 66.7 KB, 1813 ms; `/en/contact/` 66.6 KB, 1814 ms; `/notes/` 69.2 KB, 1961 ms; `/notes/smoke-es/` 83.0 KB, 2265 ms (budget 2500 ms).

## Verified changes

| Date | Commit | Change | Ran | Not re-run (why it was safe) |
| --- | --- | --- | --- | --- |
| 2026-10-05 | `07ae27d` | pre-release baseline | the whole battery, 11 steps, all green | none |
| 2026-10-05 | `304b309` | note 003 (content, changelog, trackers) | `docs:config`, typecheck, lint, unit, depcruise, real build, js-budget (17 pages), quick e2e 256, simulated-phone LCP of the new note | white-label, cold start, Lighthouse: no code, schema or shared markup changed |
| 2026-10-05 | `88f054a`, `79bdde3` | `og:title` without the site suffix; framed images (`.prose img`) | typecheck, lint, unit, depcruise, full e2e 540, Lighthouse (worst LCP unchanged at 2265 ms), `docs:config` | white-label, cold start: schema and build graph unchanged |
| 2026-10-05 | `744a833`, `61ae176` | X and WhatsApp share links, two-row panel | lint, typecheck, unit, depcruise, full e2e 548, Lighthouse (note document 80.8 to 83.0 KB, worst LCP 2265 ms) | js-budget: the share script did not change; white-label, cold start |
| 2026-10-05 | `7ab9c9c`, `ae87ccd` | `features.marks` flag and block; marks server, D1 adapter, actions | typecheck, lint, unit 729, depcruise, `docs:config`, build, white-label | e2e and Lighthouse: no page markup, CSS or JavaScript changed yet (the flag renders nothing until the UI exists) |
| 2026-10-05 | (working tree) | marks UI (task M3) | pending | pending |
