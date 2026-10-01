# 0010. Visitor-facing changelog: dated entries, no semver, single language

Status: Accepted

## Context

Wanted a visitor-facing way to record site changes. The site is continuously deployed, not a versioned package, so there is no natural release/semver boundary to hang entries on.

## Decision

Dated entries (not semver/release-based), Keep-a-Changelog-style fixed categories (Added/Changed/Fixed/Removed/Security/Deprecated), single-language authoring (one text shown on both `/changelog/` and `/en/changelog/`, unlike `/notes`), gated by `features.changelog`, entry point is a footer link only (no navbar item), hand-authored JSON (no git-history/release automation).

## Consequences

Lower authoring friction (no translation, no versioning ceremony) at the cost of no git-derived automation; adding navbar visibility later is a small follow-up, not a redesign.
