# 0008. Launch gate via feature flags

Status: Accepted

## Context

Some surfaces (experiments, /me) were unfinished at launch time and should not be publicly indexed or linked yet, without blocking the rest of the site from shipping.

## Decision

`features.experiments` and `features.me` flags (site config) gate nav entries, page rendering, sitemap inclusion and `noindex`. When off: no nav link, pages return `noindex` and are excluded from the sitemap, no rendered links anywhere (home hiring card, experiments grid, /me section, notes sidebar). Re-enabling is a config-only change (no code change) once pages and real data exist.

## Consequences

Unfinished surfaces stay deployed but invisible to users and search engines; turning them on later requires only a config flip, verified by existing tests.