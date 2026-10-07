# Feature: a better visitor changelog (releases, dates, grouped by kind)

Status: **recorded, not started** (owner, 2026-10-06: "improve the changelog, it is already growing a lot; segment by releases and dates, group by fixed, changes, features, and make it look good; write it down in the docs and in the GitHub project").
Tier: 3 (information design plus an amendment of ADR 0010). The GitHub issue is drafted in `odd/issues-to-create.md` (T63) and is not created yet: creating it is a remote operation that needs the owner's explicit authorization.

## Current state (checked 2026-10-06)

- `apps/web/src/content/changelog.json`: 81 entries keyed by an id; fields `date` (day it reached production), `category` (`added`, `changed`, `fixed`, `removed`, `security`, `deprecated`), `title` (max 120), optional `description` (max 500). Schema: `apps/web/src/features/changelog/schema.ts`.
- Page: `ChangelogPage.astro` and `ChangelogList.astro` (about 60 lines in total), `lib/changelog.ts` sorts newest first. Routes `/changelog/` and `/en/changelog/`, gated by `features.changelog`; one text for both languages. No RSS or Atom feed.
- ADR 0010: dated entries, "not semver/release-based", Keep-a-Changelog categories, single language. Rule in `CLAUDE.md`: every visitor-visible or developer-facing change gets an entry in the same work unit; before each release compare the `feat`, `fix` and `perf` commits since the previous release with the entries; the entry date is the day it reaches production.
- The release commit message ends with `develop: <sha>`; there were 11 production releases up to 2026-10-06, more than one on some days.

## Objective

A changelog that stays pleasant to read at 200+ entries: segmented by release and date, grouped by kind inside each release, with the site's lab look, fast on mobile, and cheap to maintain.

## Proposed design (to confirm with the owner in the first step)

1. **Segmentation.** Group by **release**: a header per production release with its date (and a short label such as "Release 11" derived from order, no semantic versions) and a link to the release commit on GitHub (the repository is public). Entries get an optional `release` field (`YYYY-MM-DD`, or `YYYY-MM-DD.2` for a second release the same day); when absent, entries are grouped by `date`, so existing data keeps working.
2. **Grouping by kind inside a release**, in a fixed order with a pixel icon each (9x9 grid, pink single accent, like the other pixel icons): New (`added`), Changes (`changed`), Fixes (`fixed`), Performance (a new `perf` category, optional), Security, Removed, Deprecated. Labels are friendly (Features / Improvements / Fixes), the stored values stay Keep-a-Changelog.
3. **Scale.** Latest two releases open; older releases collapsed in native `<details>` (no JS) and grouped by year with a year index; static pagination or per-year pages above a threshold (same pattern as `/experiments/`: config values, `content-visibility`, lazy rendering); stable anchors per release.
4. **Look.** Timeline-style left rail with the release date in mono, kind chips, dashed dividers, no heavy cards; both themes, ES/EN labels, `prefers-reduced-motion`.
5. **Optional extras** (owner decides): Atom feed `/changelog.xml`, a count badge per kind, a link from the footer.
6. **Authoring tools:** `pnpm changelog:audit` (list `feat`/`fix`/`perf` commits since the last release that have no entry, replacing the manual `git log` step in `CLAUDE.md`) and a release helper that stamps pending entries with the release id at release time.
7. **Decision record:** amend ADR 0010 (or supersede it with a new ADR): releases become a grouping dimension, still no semver, still single language.
8. **Migration:** assign the 81 existing entries to their releases from the release history (`git log` of `main`, the tracker `odd/tasks/elvinlab-site.md`), in one scripted pass reviewed by the owner.

## Constraints

Visitor-facing wording in plain English (ADR 0010), white-label (nothing owner-specific in components; labels in i18n), no new JavaScript for the list, JS budget and Lighthouse gates, page weight rule (see `docs/DESIGN.md`), docs and `CLAUDE.md` rule updated in the same work unit.

## Acceptance

- Entries appear grouped by release (newest first), with kind groups in a fixed order and icons, in both themes and both locales, readable at 390, 820 and 1440 px.
- 200 generated entries keep the page fast (measured HTML size and Lighthouse on `/changelog/`), older releases collapsed.
- `pnpm changelog:audit` works and the `CLAUDE.md` release rule points to it.
- ADR amended, `docs/CONFIGURATION*.md` and the changelog guide updated, existing entries migrated, tests and the verification map updated.

## Verification

`pnpm lint`, `pnpm typecheck`, `pnpm --filter web exec vitest run`, `pnpm docs:config`, `pnpm depcruise`, `pnpm test:white-label`, e2e for the changelog pages (add a spec), `pnpm test:lighthouse` for the changelog URLs (add them to `lighthouserc.json` and the verification map).

## Questions for the owner (when this starts)

Release naming (date only, or "Release N" plus date); whether developer-facing entries stay in the same list; Atom feed yes or no; whether to add a `perf` category.

## Progress

- 2026-10-06: recorded only.

## Decisions (owner delegated them on 2026-10-07: "mejoramos esa parte para que salga en este release")

Evidence behind them: `main` received about 22 production deploys in 4 days (6 on 2026-10-01 and 6 on 2026-10-06; only the last ones record `develop: <sha>`), so grouping by deploy would give about 22 blocks of 1 to 4 entries; the 83 entries are already dated by the day they reached production (1, 28, 16, 22, 11 and 6 entries on six days).
1. **A release is a production day.** Entries are grouped by `date` (no migration of the existing data); an optional title per day lives in `apps/web/src/content/releases.json` (`{ "YYYY-MM-DD": { "title": "..." } }`). No semantic versions, no "Release N" numbering (the deploy count and the owner's own count of releases do not agree), no commit links for now. ADR 0010 is amended: still dated and single language, now grouped by day with kind groups.
2. **Kind groups inside each day**, fixed order, friendly labels and a pixel icon each (9x9 grid, crisp edges, no rainbow: tokens only): `added` New (Novedades), `changed` Changes (Cambios), `fixed` Fixes (Correcciones), `removed` Removed (Eliminado), `security` Security (Seguridad), `deprecated` Deprecated (Obsoleto). Stored values stay Keep-a-Changelog; no new `perf` category now (performance entries stay under Changes).
3. **Scale:** static pagination by days with the listing kit (`shared/lib/listing.ts`, `shared/ui/Pager.astro`, `ListingSummary.astro`): config `changelog.perPage` (days per page, default 4), pages `/changelog/page/N/` and `/en/changelog/page/N/`; newest first only (no sorting); the two newest days open and the rest collapsed in native `<details>` (no JavaScript); component CSS emitted only where it renders; its own budget type in `page-weight-budget.json`.
4. **Authoring tools:** `pnpm changelog:audit` lists the `feat`, `fix` and `perf` commits since the last release (the `develop: <sha>` recorded by the release commit on `origin/main`) that did NOT touch `changelog.json` (the rule is that the entry travels in the same work unit), and `pnpm changelog:stamp [--date YYYY-MM-DD]` sets the date of the entries that are not in `origin/main`'s changelog to the release day. `CLAUDE.md` points to both instead of the manual `git log` step.
5. **Not now:** Atom feed, commit links, a `perf` category; recorded as follow-ups.
- 2026-10-07 delivered (one delegated writer; parent verified the essentials; the owner asked to skip the full battery to save time): the changelog is grouped by production day (a release is a day, no data migration) with an optional headline per day in `content/releases.json` (five titles), and by kind in a fixed order (New, Changes, Fixes, Removed, Security, Deprecated) with 9x9 pixel icons; each day is a native `<details>` whose `<summary>` holds the `h2`, the date and the kind counts (the two newest days of page 1 open); static pagination by days with the shared listing kit (`changelog.perPage`, default 4: `/changelog/` and `/changelog/page/2/` today, ES and EN, never `/page/1/`, page 2+ indexable, self canonical, prev/next, hreflang per page number); component CSS emitted only where it renders (`cl-` prefix, no JavaScript). New page-weight type `changelog` (style 56,500 B, HTML 110,000 B; measured 54,304 / 105,715 B on page 1, so page 1 went from about 130 KB to about 106 KB). Tools: `pnpm changelog:audit` and `pnpm changelog:stamp`; the `CLAUDE.md` rule points to them. ADR 0010 amended; docs, BRAND (pixel kind icons), TESTING and one changelog entry (`changelog-by-release-day`). The neutral white-label build also empties `changelog.json` and `releases.json`.
- Verification (parent, essentials only): lint clean (468 files); typecheck 0 errors; vitest 119 files / 1288 tests; depcruise ok; white-label ok; `docs:config` up to date; build then `check:page-weight`: all 26 pages within budget; e2e at 1280 px `changelog.spec.ts` and `a11y.spec.ts`: 39 passed; `pnpm changelog:audit` (last release develop 4578e92, every feat/fix/perf commit carries an entry, exit 0) and `pnpm changelog:stamp --dry-run` (nothing to stamp) run for real. Writer: 200 generated entries over 40 days build 10 pages per locale of about 84-86 KB with 0 unresolved pager links, and 24 checks (pages 1, 5 and 10, ES/EN, 390/1440 px, both themes) with 0 overflow, 0 axe `color-contrast` nodes and one h1 each. Screenshots of the real page (dark 1440, light 390) reviewed by the parent: calm, readable, consistent with the site.
- Not run (owner decision, time): the full battery `pnpm verify --run`; the CI on `main` is the backstop. Note: an axe `color-contrast` failure on the dark submit button of the contact page appeared once in a parallel run today (`/en/contact/` earlier, `/contact/` now), passed on re-run and did not reproduce in the parent's 39-test run; unrelated to this change, watch it if the CI gate ever fails there.
- Follow-ups: tighten the `default` page-weight budget (135,300 B) now that the changelog left that type; Atom feed, commit links and a `perf` category stay out of scope.
