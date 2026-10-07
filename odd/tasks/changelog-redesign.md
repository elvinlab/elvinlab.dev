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
