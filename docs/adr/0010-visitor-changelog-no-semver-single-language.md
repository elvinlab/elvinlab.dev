# 0010. Visitor-facing changelog: dated entries, no semver, single language

Status: Accepted

## Context

Wanted a visitor-facing way to record site changes. The site is continuously deployed, not a versioned package, so there is no natural release/semver boundary to hang entries on.

## Decision

Dated entries (not semver/release-based), Keep-a-Changelog-style fixed categories (Added/Changed/Fixed/Removed/Security/Deprecated), single-language authoring (one text shown on both `/changelog/` and `/en/changelog/`, unlike `/notes`), gated by `features.changelog`, entry point is a footer link only (no navbar item), hand-authored JSON (no git-history/release automation).

## Consequences

Lower authoring friction (no translation, no versioning ceremony) at the cost of no git-derived automation; adding navbar visibility later is a small follow-up, not a redesign.

## Amended 2026-10-07

Status stays Accepted. The first decision stands: entries are dated, there is no semver, the text is single-language and hand-authored. What changes is how the page groups them, because the log outgrew a flat list (83 entries on six days, a page of about 130 KB).

- **A release is a production day.** The page groups entries by `date` (the day they reached production), newest first, inside each day by kind in a fixed order (New, Changes, Fixes, Removed, Security, Deprecated; the stored values stay Keep-a-Changelog), and inside a kind by title. An optional headline per day lives in `apps/web/src/content/releases.json` (`{ "YYYY-MM-DD": { "title": "..." } }`); a day without one shows only its date. Still no semantic versions and no "Release N" numbering.
- **Why a day and not a deploy.** `main` received about 22 production deploys in 4 days (6 on 2026-10-01 and 6 on 2026-10-06, and only the latest ones record `develop: <sha>`), so grouping by deploy would give about 22 blocks of 1 to 4 entries, and the owner's own count of releases does not agree with the deploy count. Grouping by day needs no migration: the 83 entries already carry the day they shipped (1, 28, 16, 22, 11 and 6 entries on six days).
- **Paginated by days.** `changelog.perPage` (default 4 days) with the generic listing kit: `/changelog/`, `/changelog/page/2/`, and the `/en/` twins. Later pages are indexable and in the sitemap; the two newest days of page 1 start open in native `<details>` (no JavaScript) and everything else starts collapsed with its content still in the HTML.
- **Authoring tools.** `pnpm changelog:audit` lists the `feat`/`fix`/`perf` commits since the last release that did not touch `changelog.json`; `pnpm changelog:stamp` sets the release day on the entries that are not in `origin/main` yet.
- **Not now:** an Atom feed, commit links per release and a `perf` category (performance entries stay under Changes).

