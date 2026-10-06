# Browser smoke checks

Run production-page checks locally before changing layout or content routing:

```bash
mise exec -- pnpm exec playwright install chromium
mise exec -- pnpm test:e2e
```

Playwright builds a temporary copy of the app and core, adds synthetic Spanish/English notes,
and serves it with Astro preview. It checks home, notes, note detail, contact pages and the bilingual 404 at
360, 768 and 1280 pixels. A running server is never reused. Port 4322 must be available.

For a faster loop while iterating, `mise exec -- pnpm test:e2e:quick` runs the same checks at 1280
pixels only, and a spec path narrows it further (`pnpm test:e2e:quick tests/browser/smoke.spec.ts`).
Each run pays about 9 seconds of fixed cost (workspace copy, build, preview). Run the full
`pnpm test:e2e` (all three viewports) once before closing a change. Workers default to half of the
available cores, so the full suite takes about 73 seconds on a 12-core machine (107 seconds at 2 workers).

Fixtures live in `tests/fixtures/notes`, outside publishable content. Drafts, secrets and existing
build output are excluded from the temporary copy; source configuration and tokens are never edited.
External installed packages are reused through links, while `@elvinlab/core` resolves to the copied core.
Normal completion and handled termination remove the temporary workspace.

Failures leave an HTML report in `playwright-report/` and traces in `test-results/` (both ignored).
Run `mise exec -- pnpm exec playwright show-report` to inspect results. Unit checks remain
`mise exec -- pnpm test`; the fixture harness is tested with Vitest.

A negative control removes a heading in the browser and verifies that the smoke assertion rejects
the damaged document. Source files are not changed. Astro preview uses `--ignore-lock` to remain
in the foreground under coding agents, so Playwright owns its lifetime.

## Touch-scoped verification (repository rule)

Verify what a change touches, and record it. Do not run the whole stack after every change. "Test" here means every kind of check: unit tests, types, lint, build, dependency boundaries, generated docs, e2e, accessibility, size budgets, Lighthouse, white-label and dev cold start.

1. **List the blast radius first.** Name the files you touched and what depends on them, before running anything.
2. **Run what covers the change or something that depends on it.** A check that already passed and whose scope you did not touch is **not** re-run. A check whose scope you did touch **is** re-run: never trust an older result for changed code.
3. **Two kinds of wide change.** *Full-wide* (dependencies or the lockfile, toolchain versions, Astro, Vite, Tailwind, Wrangler, tsconfig, Biome, Playwright or Lighthouse configuration, `fixture-workspace.ts`, the verification scripts themselves) runs the whole stack once, then back to scoped runs. *Layout-wide* (global CSS and design tokens, `shared/layout/**` such as Navbar, Footer and `BaseLayout`, the i18n dictionary structure) runs lint, types, unit, build, JS budget and white-label, every e2e spec at 1280 px, and Lighthouse for `/` and `/notes/smoke-es/` with one run; it does not re-run the responsive specs at three viewports, the other Lighthouse URLs or the dev cold start (`--viewports all` or `--all` do, and CI always does).
4. **Record every run and every skip** in the task tracker and in the [verification ledger](../odd/verification-ledger.md): what ran, the result and the commit; for a skipped check, why it was safe to skip.
5. **Never report a skipped check as verified.** Say "not re-run: untouched since `<sha>`".
6. **Delegated writers run only the checks the parent lists** under `## Verify` in the brief, taken from the map below. A writer does not run the full suite by default, and the parent does not repeat it.
7. **Release:** run what the ledger shows as stale, then push. CI on `main` runs the whole stack once more (`static`, `e2e`, `lighthouse`, `checks`) before it deploys, so it is the full backstop; the local run before a release is not.

### `pnpm verify`: the rule as a command

`mise exec -- pnpm verify` reads what changed and prints which checks cover it and why; it runs nothing unless you ask.

| Command | What it does |
| --- | --- |
| `pnpm verify` | plan for the uncommitted work (dry run) |
| `pnpm verify --since <ref>` | plan for everything changed since a ref (for example the last release) |
| `pnpm verify --stale` | plan every check whose scope differs from its last green run in `odd/verification-state.json` (a missing registry means everything is stale) |
| `pnpm verify --all` | plan everything |
| `pnpm verify --run` | execute the plan: cheap static checks first, then build, budgets, white-label, cold start, e2e, then Lighthouse; it keeps going after a failure and ends with one table; exit code is non-zero if anything failed |
| `pnpm verify --run --record` | after a fully green run, store a fingerprint of each passing check's scope in `odd/verification-state.json` |
| `--viewports all` | e2e at the three viewports instead of 1280 px (width-dependent areas always use three) |

The single source of truth is [`apps/web/scripts/verification-map.ts`](../apps/web/scripts/verification-map.ts): every check with the globs it depends on (the impact map below is its human version). Unit tests guard it against drift: every spec under `tests/browser/` must be mapped, every Lighthouse path must exist in `lighthouserc.json`, and no scope may match zero files. A **fingerprint** is a hash of the path and content of every non-ignored file in the check's scope, so a check is fresh exactly when its files are byte-identical to the last green run, whatever the commit history. Details worth knowing:

- Touching the tool itself (`apps/web/scripts/verif*`, `run-lighthouse-ci.ts`), `package.json`, the lockfile, the Astro, Vite, Tailwind, tsconfig, Biome, Playwright or Lighthouse configuration or `fixture-workspace.ts` is a **full-wide change**: every check is selected. Touching `apps/web/src/styles/**`, the design tokens, `shared/layout/**` or `shared/i18n/**` is a **layout-wide change** (see rule 3): a cheaper subset, about 115 s instead of 340 s.
- `pnpm verify` always runs Lighthouse with **1 run per URL** (`--runs 1`, local only). CI and `pnpm test:lighthouse` keep `numberOfRuns: 3` and every threshold unchanged.
- All selected e2e specs go in **one** Playwright invocation (one fixture server). `E2E_WIDE_SPECS` limits the 360 and 768 px projects to the width-dependent specs, so every other spec runs at 1280 px only; unset (CI, `pnpm test:e2e`) every project runs every spec. Playwright uses `workers: '100%'`.
- `pnpm verify --files <paths>` plans (and with `--run` executes) for a simulated change set without editing files; it cannot be combined with `--record`.
- `--run` ends with `elapsed <n>s (full stack baseline 340 s: saved <p>%)`. Baseline, what changed and the measurements: [`odd/verification-timings.md`](../odd/verification-timings.md).
- CI shards the `e2e` job in three (`--shard=N/3`); white-label, `version.txt` and the image check run in shard 1 only; `checks` needs the whole matrix. Each job prints its duration in the run summary.
- A diff in `apps/web/src/shared/i18n/index.ts` that only adds keys is ignored; a changed or removed key counts.
- `pnpm verify --run` with Lighthouse runs only the affected URLs (`run-lighthouse-ci.ts --url <path>`, repeatable); with no flag it measures all six as before.
- Biome does not read Markdown, so a docs-only change plans `lint` and runs nothing.
- Most e2e specs are mapped to every page, so a change in a shared component such as the footer still selects nearly all of them; narrowing a spec's scope means checking what its pages render.
- Seed the registry once with `pnpm verify --all --run --record`, then use `--stale` before a release.

### How to find what a change touches

- **Unit tests:** `mise exec -- pnpm --filter web exec vitest related <files> --run` (Vitest follows the import graph; `--changed [ref]` does the same for everything changed since a ref). `codegraph affected <files> -q` lists affected test files too.
- **The import graph does not see page-level specs.** `codegraph affected` returned nothing for `styles/global.css` and for `ContactForm.tsx` although `contact.spec.ts` exercises both, because the spec loads a page and imports neither. For e2e, Lighthouse and budgets use the map below.
- **Lint:** `mise exec -- pnpm exec biome check --changed` (or `--staged`, or `--since=<ref>`).
- **e2e:** pick specs by area (map below) and run them with `mise exec -- pnpm test:e2e:quick <spec>` (one viewport); use `pnpm test:e2e` (three viewports) only when the change is width dependent. `playwright --only-changed` only follows test files, not application code.
- **Types** (`pnpm typecheck`) cannot be scoped to files: run it when TypeScript, Astro, schema, config or type files changed, skip it for documentation or content-only changes.

### Impact map

| You touched | Run | Skip, if untouched |
| --- | --- | --- |
| Documentation, trackers, `odd/` | `lint` on the files | everything else |
| `changelog.json` | the changelog unit test, `lint` | build, e2e |
| A note (`content/notes/**`) | `build` (it validates the frontmatter), `lint` | e2e, Lighthouse (the gate measures fixtures, not real notes) |
| Schema, `site.config.ts`, `env-vars.ts`, fixtures | `docs:config`, the config unit tests, `typecheck`, `test:white-label`, `build` | e2e, Lighthouse |
| Unit-tested logic (`lib/`, `ports`, `adapters`, `actions`) | the related unit tests, `typecheck`, `lint` | e2e (unless the page behavior changed), Lighthouse |
| Added, moved or removed files, or edited imports | `depcruise` | |
| A feature's UI (`features/<x>/components`) | its unit tests, the e2e specs of that area, `a11y.spec.ts` for its page, `typecheck` | specs of other areas |
| Client JavaScript, islands, scripts, client dependencies | `build` then `check:js-budget`, the area's e2e, `check:dev-cold-start` if a dependency was added | |
| Anything that changes the HTML or CSS bytes of a gated URL (styles, layout, head or SEO tags, fonts, note or home or contact markup) | `test:lighthouse` and the area's e2e; compare the document size and the worst LCP with the ledger | Lighthouse if no page the gate loads changed |
| Notes pages and what they render (`NotePage`, share panel, marks, prose styles) | the notes specs (`notes-layout`, `note-share`, `link-previews`, `note-translations`, `reading-mode`, `calm-pages`, `card-links`, `focus-not-obscured`, `marks`) and `a11y.spec.ts` | contact, home and `/me` specs |
| Contact (`features/contact`, `ContactForm`) | `contact.spec.ts`, the contact unit tests, `check:js-budget` | notes specs |
| Header, navbar, footer, `BaseLayout`, global CSS | a wide change: the whole stack once | |
| `tests/**` only | the changed specs | the application checks |

### The verification ledger

[`odd/verification-ledger.md`](../odd/verification-ledger.md) keeps two things: the last commit on which each check family was green, and one row per verified change. A check is **stale** when files in its scope changed after its last green commit: `git diff --name-only <sha>..HEAD -- <scope>` prints something. Update the ledger in the same commit as the change it records.

## Quality budgets and CI

Run the same gates as CI from the repository root:

```bash
mise exec -- pnpm check:js-budget
mise exec -- pnpm exec playwright install chromium  # one-time local browser setup
mise exec -- pnpm test:e2e
mise exec -- pnpm test:white-label
mise exec -- pnpm test:lighthouse
```

The JavaScript budget checks every production-built HTML page, including inline scripts, local
transitive imports, and island modules (`component-url`/`renderer-url`) and their imports, at no more than 30 KiB gzip. Lighthouse uses a separate temporary production
build with synthetic English and Spanish note fixtures, emulates mobile, and checks all four
categories at 95 or higher plus LCP < 2500 ms, CLS < 0.1 and TBT < 200 ms. Three runs are
aggregated pessimistically so one bad run cannot be hidden by a better one.

Lighthouse reports are written locally to `.lighthouseci/` (ignored by Git); the configuration
does not upload them. CI runs every browser, white-label and performance gate in the `checks` job,
which the deploy job requires.

### The note-page LCP gate is sensitive to a few bytes

> **Correction and fix (2026-10-05).** The sizes in this section (about 98 KB of HTML and 52 KB of inline CSS, later 94 KB and 48 KB) are from `wc -c` on the **real** build (`apps/web/dist`). The Lighthouse gate did not measure that page: its fixture (`fixture-preview.ts`, built through `createFixtureWorkspace`) inlined the layout stylesheet **twice** because the workspace did not copy the root `.gitignore` (the gate's own report showed a 126,930 byte note document against about 94 KB in production, and 14 `@font-face` rules against 7). `createFixtureWorkspace` now copies `.gitignore` (test in `fixture-workspace.test.ts`). Re-measured with `pnpm test:lighthouse` after the fix, worst of three runs: `/notes/smoke-es/` document 123.5 to 80.6 KB and LCP 2414 to **2264 ms** (margin to the 2500 ms budget about 86 to about 236 ms); `/` 2368 to 2216 ms; `/contact/` 2259 to 1810 ms; performance score 97 to 99 on all six URLs. The LCP numbers and byte boundaries in the table and the headroom paragraph below were measured on the doubled fixture, so they are **outdated**: the one-round-trip boundary now sits at different byte counts and has to be re-measured before relying on "a few hundred bytes". Why a missing `.gitignore` doubles the sheet is not traced (the build tooling reads it); the cause was found by changing one file of the workspace at a time.


Lighthouse measures a fixture served by `astro preview`, which does **not** compress responses, under
simulated slow 4G (about 1.6 Mbps, 150 ms round trip). The note page is about 98 KB of HTML, of which
about 52 KB is inline CSS (the whole site stylesheet is inlined in every page), and it sits right at a
TCP slow-start round-trip boundary: a few hundred more bytes cost one extra round trip, about 150 ms,
and the LCP budget is 2500 ms with only about 90 ms to spare.

Measured on 2026-10-02 on `/notes/smoke-es/` (worst of three runs; same machine, same fixture):

| Commit | HTML / inline CSS | FCP | LCP |
|---|---|---|---|
| `3c83905` (before the Now card) | 98 287 / 52 423 bytes | 1812 ms | 2434 ms |
| `f6bb257` (Now card with four new `not-first:` variant utilities) | 98 624 / 52 760 bytes | 1962 ms | **2586 ms (gate fails)** |
| `14fa586` (same card reusing utilities the site already has) | 98 330 / 52 466 bytes | 1812 ms | 2413 ms |

Adding 337 bytes of CSS failed the gate, and the card was visually identical. The check that passed on
the previous release (`8c7968a`) had only about 64 ms of margin. What to do:

- **Never relax the budget** to land a change. Find what grew.
- **Prefer utility classes the site already uses.** Each new utility or variant (`not-first:`,
  `md:`, arbitrary values) adds a rule to the stylesheet that every page inlines. Reuse existing
  classes or `class:list` conditions.
- **Measure before and after** a change that touches shared markup or CSS: build, then compare the
  note page, for example
  `wc -c apps/web/dist/client/notes/<slug>/index.html` (HTML) and the length of its `<style>` blocks.
  A growth of a few hundred bytes is worth a Lighthouse run on that page alone (a copy of
  `lighthouserc.json` with a single `url` and `numberOfRuns: 3`).
- **To find the commit that regressed**, run that single-page Lighthouse at a few commits
  (`git checkout --detach <commit>`, run, `git checkout develop`). Do not run it in the background:
  the fixture server dies with its parent process and every run is then skipped.
- The first run after a checkout can fail with "Chrome prevented page load with an interstitial" when
  the fixture server is slow to start; run it again before trusting a number.

Headroom added on 2026-10-02: the three variable fonts are now declared in `apps/web/src/styles/fonts.css`
with the latin and latin-ext subsets only. The `@fontsource-variable` packages declare every alphabet
(Cyrillic, Greek, Vietnamese), about 4.4 KB of `@font-face` rules per page, one of them inlined as base64.
The note page went from 98 667 to 94 286 bytes of HTML (48 379 of inline CSS) and its worst LCP in the
gate is 2436 ms, with about 4 KB of room before the next round-trip boundary. Keep that room for real
features: check the page size before and after any change to shared CSS or markup.

Follow-up: the margin is thin, so the next additions to shared CSS can break the gate again. Cutting the
inline stylesheet is the durable fix (tracked as a GitHub issue).

## Playwright contact form island

The e2e suite covers the contact form island with a stubbed Turnstile script and the real Action
(no bindings, so it answers service unavailable). The fixture build sets a stub site key.
