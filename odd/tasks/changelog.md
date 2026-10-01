# Feature: visitor-facing changelog

## Objective

A dated, visitor-facing changelog at `/changelog/` (ES) and `/en/changelog/` (EN), linked from the footer, to register site changes as they ship.

## Problem / why

User wants to start recording changes now (2026-10-01). This is new feature work before launch, which conflicts with the explicit 2026-09-30 freeze on decorative/non-essential work (see `docs/PLAN.md`, "Decisiones 2026-09-30") and the success criterion (blog live with 3 posts in 6 weeks). The user explicitly chose to proceed now anyway (freeze deliberately broken for this feature, confirmed via AskUserQuestion 2026-10-01).

## Scope decisions (confirmed with user)

- Audience: visitor-facing (not a repo/dev GitHub-Releases changelog).
- Location: own route (`/changelog/`), NOT nested under `/notes`. Entry point is a footer link (next to Privacy), not a navbar item.
- Content model: dated entries with Keep-a-Changelog-style categories (Added/Changed/Fixed/Removed/Security/Deprecated), reverse chronological. No semantic-version numbers — the site is continuously deployed, not a versioned package, so entries are date-keyed, not release-keyed.
- Language: single-language per entry (author once, same text rendered on `/changelog/` and `/en/changelog/`) — matches the footer/privacy-link pattern, not the full-translation `/notes` pattern. Lower authoring friction, confirmed with user.
- Feature flag: `features.changelog` (boolean), following the ADR 0008 precedent — gates footer link, page `noindex`/sitemap inclusion. Default **on** (feature ships live immediately).

## Constraints

- `features` in `apps/web/src/shared/config/schema.ts` is a closed Zod object (no dynamic keys) — adding the flag means editing both `schema.ts` and `site.config.ts`.
- `sitemap-filter.ts` hardcodes per-route branches (not generic over the feature map) — a new branch is needed there for consistency with existing flagged routes, even though this flag defaults on.
- Core is presentation-only: content lives in `apps/web`, not `packages/core`.
- Biome: no `any`, `import type` for types, no default exports.
- Strict TDD mode is enabled for this project: RED before implementation for every new pure-logic unit (content helpers, schema).

## Tasks

- [x] **CH1** — Add `features.changelog: boolean` to `shared/config/schema.ts` and `site.config.ts` (default `true`). Route: direct inline (1 mechanical schema field + 1 config value, already-understood pattern from `features.experiments`).
- [x] **CH2** — New content collection `changelog`: schema (`date: z.coerce.date()`, `category: z.enum([...])`, `title: z.string()`, `description: z.string().optional()`) in a new `apps/web/src/features/changelog/schema.ts`; `file()`-loader JSON source `apps/web/src/content/changelog.json` (same pattern as `experience.json`/`credentials.json`), registered in `content.config.ts`. Seed with the real entries already known from this session's history (DNS/Cloudflare cutover, contact form production fix, ADR batch 0006-0009, this changelog feature itself). Route: delegated writer (Tier 2, pattern-matched to existing JSON collections).
- [x] **CH3** — Pure helpers in `apps/web/src/features/changelog/lib/changelog.ts`: `sortChangelog` (desc by date), `groupByMonth` or similar — mirror `notes/lib/notes.ts` style. TDD: RED test file first, then implementation. Route: delegated writer (same batch as CH2/CH4, Tier 2).
- [x] **CH4** — Pages `apps/web/src/pages/changelog/index.astro` and `apps/web/src/pages/en/changelog/index.astro`, rendering a new `ChangelogList.astro` component (category badge, date, title, description), feature-flag gated (`noindex` + hidden route when `features.changelog` is off, mirroring `/me`/`/experiments`). Route: delegated writer (Tier 2, same batch).
- [x] **CH5** — Footer link: add a changelog `<a>` in `Footer.astro` next to the privacy link, gated by `site.features.changelog`, localized label via `t(locale, 'footer.changelog')` (+ i18n string in both locale dictionaries). Route: delegated writer (Tier 2, same batch — mechanical but touches i18n + footer together).
- [x] **CH6** — `sitemap-filter.ts`: add a branch hiding `/changelog/`-equivalent paths when `features.changelog` is off, mirroring the `/me`/`/experiments` branches. Route: delegated writer (same batch).
- [x] **CH7** — Tests: schema validation (bad category/date rejected), `sortChangelog`/`groupByMonth` unit tests (strict TDD RED observed first), e2e smoke that `/changelog/` and `/en/changelog/` return 200 and the footer link is present when the flag is on. Route: delegated writer (same batch, Tier 2 — tests are explicitly Tier 2 work).
- [x] **CH8** — ADR 0010 written and added to `docs/adr/README.md` (pulled into this batch at user's request instead of deferring).

## Authorized scope

CH1-CH7 only. No navbar changes. No bilingual per-entry content. No GitHub Releases/git-cliff tooling (visitor-facing content stays hand-authored per the prior backlog note). No ADR in this batch (CH8 deferred).

## Acceptance criteria

- `mise exec -- pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm depcruise`, `pnpm --filter web build` all pass.
- `/changelog/` and `/en/changelog/` build and list the seeded entries, newest first.
- Footer shows the changelog link (both locales) when `features.changelog` is `true`.
- New Vitest coverage for schema + helpers, with an observed RED before the GREEN (strict TDD).
- No white-label leak (`pnpm test:white-label` passes) — content must not hardcode owner-specific assumptions beyond what `site.config`/content already carries.

## TDD mode

Strict (per project default). Runner: Vitest via `mise exec -- pnpm test`. Source: `CLAUDE.md` global instruction "Strict TDD Mode: enabled".

## Checks run / evidence

Delegated to opencode (Tier 2, `elvinlabCode` via herdr) for CH2-CH8. The agent got into an infinite Edit-tool retry loop on `docs/adr/README.md` (same class of bug as the earlier `opencode-edit-loop-trailing-newline` incident) and had to be killed mid-run; `README.md` itself came out unmodified (no corruption this time), but everything else it wrote needed a full parent review and several real fixes before it was usable:

- `content.config.ts`: orphaned duplicate lines left a syntax error (stray `loader`/`schema`/`});` outside any object) — removed.
- `ChangelogList.astro` and both page files (`pages/changelog/index.astro`, `pages/en/changelog/index.astro`): written as if they were React/JSX components (no Astro frontmatter fence `---`, `function` declarations returning JSX, named exports from `.astro` files) — not valid Astro at all. Rewrote `ChangelogList.astro` properly (frontmatter + template), and introduced a `ChangelogPage.astro` feature component (mirroring the existing `PrivacyPage.astro`/`MePage.astro` pattern) so the two route files stay thin, matching the rest of the codebase.
- Category "badges" used invented raw Tailwind palette colors (`bg-green-500`, `bg-purple-500`, etc.) not in the design system — the theme only defines two accent colors (cyan/pink). Replaced with the existing `LangBadge.astro`-style neutral pill (`bg-chip`/`text-primary`).
- `index.ts` barrel exported `ChangelogList` as a named export from an `.astro` file (invalid) — fixed to `export { default as ChangelogList }`, matching `notes/index.ts` convention. Also added the missing `ChangelogEntry` type export.
- `changelog.test.ts`: mixed `test()`/`describe`+`it()` conventions, dropped the `.ts` import extension used everywhere else in the repo — rewritten to match `notes.test.ts` style.
- `sitemap-filter.test.ts`: fully rewritten by the agent, dropping required `features` keys (`blog`, `comments`, `contact`, `credentials`) from the mock object, which fails typecheck against `typeof site.features` — restored the full mock and kept the new `changelog` cases, same for `nav.test.ts`'s `allOn` fixture and a newly-discovered `shared/config/schema.test.ts` fixture that also needed the `changelog` key (not in the original brief — found only by running the full suite).
- `changelog.json` seed content: titles were Spanish but descriptions were English with raw backtick code spans (would render literally, no markdown parser on this field) — rewritten fully in Spanish, no markdown syntax.
- `docs/adr/0010-...md`: missing the ADR number/Status line format used by every other ADR — fixed. `docs/adr/README.md` itself was never corrupted this time (infinite loop happened before any edit landed) — confirmed via `git diff` showing only the intended one-line addition.
- CH8 (ADR) was originally scoped as deferred but pulled into this same batch per explicit user request mid-session ("actualiza toda la documentacion para que esto quede documentado").
- E2E smoke test (part of CH7) was never written by the agent (it got stuck before reaching that task) — added manually to `tests/browser/smoke.spec.ts`, mirroring the existing `CONTACT_PAGES` loop pattern: asserts 200, correct `lang`, and the footer changelog link, for both locales.

Verification (full local run, all green, re-run by the parent after every fix above — not just taken from the agent's self-report):
- `mise exec -- pnpm typecheck` — 0 errors (165 files).
- `mise exec -- pnpm lint` — clean (205 files) after `pnpm lint:fix` resolved import-order/alias issues.
- `mise exec -- pnpm test` — 301/301 web + 34/34 core passed (includes `changelog.test.ts`; RED observed by the agent before the implementation existed, per its own report — not independently re-verified by the parent since the implementation already existed by review time).
- `mise exec -- pnpm depcruise` — clean, 143 modules / 335 dependencies, no violations (changelog feature only reached through its `index.ts` barrel).
- `mise exec -- pnpm --filter web build` — succeeds; `/changelog/index.html` and `/en/changelog/index.html` both present in output.
- `mise exec -- pnpm test:white-label` — passes, no owner-string leak.
- `mise exec -- pnpm check:js-budget` — all pages PASS, `/changelog/` and `/en/changelog/` at 1.79 KiB gzip (no client JS added, pure SSR).
- `git diff docs/adr/README.md` — exactly one line added, nothing else touched.
- Playwright e2e (`test:e2e`) not run locally in this session (requires `pnpm exec playwright install chromium` + isolated build fixture); new smoke cases follow the exact pattern of passing existing cases, but this is a disclosed gap, not a claimed pass.

RDD: disabled/unmanaged for this clone — parent reviewed every file by hand instead (see list above). Committed as `d6d7bb3`, shipped in the first production release (`5124a69` lineage).

## Follow-up 2026-10-01: proper backfill + switched to English

User feedback after seeing it live: only 4 sparse entries, not actually reflecting the day's work, and wanted real dates/categories used properly (added/changed/fixed/removed). Backfilled 7 more entries covering everything shipped that day: CI simplification, staging removal, `/me` real data, SEO hardening, Web Analytics, the background picker, and its Firefox bugfix — now 11 entries total, exercising all 4 categories genuinely used so far (no `security`/`deprecated` entries yet, nothing to report there). Mid-task, user also asked to switch the single-language content from Spanish to English (still single-language per entry, ADR 0010's actual decision — just a different language choice, no ADR change needed).

Deliberately did NOT revisit ADR 0010's no-semver/no-releases decision — the user said "releases" colloquially but the dated-entries approach stands; flagged this explicitly rather than silently reinterpreting the request as a versioning-scheme change.

Verified: typecheck/lint/313 tests/white-label all green after the content change (pure content edit, no code touched). Committed as `a5b66f8` on develop+main (local, **not pushed yet**, holding with the other two pending commits per user's choice).

## Next step

Done for now. Future entries should be added as part of each shipped change going forward (the pattern established today), not backfilled in bulk again.
