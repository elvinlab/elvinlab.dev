# Notes release, 2026-10-11

Scope: publish notes 004–007 and update note 002. Exact production diff: notes, one image, changelog and existing tracking records; no redesign code.

CI run 38170913722 passed static checks, the production build and JavaScript budget, but blocked deployment at page weight. The new seven-note index measures 112772 HTML bytes; the largest new note measures 138411. All CSS ceilings passed.

As allowed by docs/TESTING.md, only notes-index and note HTML budgets use the measured content baseline plus 4% headroom (117300 and 144000 bytes). CSS, JavaScript and Lighthouse ceilings are unchanged. Article text and layouts are unchanged.

Validation: Biome passed on both JSON files; page-weight and changelog unit suites passed, 2 files / 40 tests. Local build was blocked by an environment os.networkInterfaces error; the original build passed in CI. The follow-up main CI runs the full quality gates before deployment.

## Durable content-aware guard

The fixed HTML shell is now measured separately from the article body (bounded at 64 KiB), while the index gets 4000 B per actual note row with a 180000 B absolute ceiling. The fixed note shell is measured at 112464 B and budgeted at 117000 B; the index shell is 84772 B with a budget of 88200 B. Every CSS, JavaScript and Lighthouse limit is unchanged. Inert article boundary templates are outside the prose block so they do not change sibling spacing. Missing, reversed or duplicate boundaries fail closed.

Documented in docs/TESTING.md and the publishing/checklist sections of docs/NOTES.md and docs/NOTES.en.md. Unit coverage checks content growth, fixed-shell/CSS regressions, article/index ceilings, malformed boundaries, real file collection and fixed-shell budget suggestions.

Local validation: lint clean (482 files), typecheck 0 errors, all core and web unit tests passed (web: 1325); real build, all 31 page-weight checks, JavaScript gzip budget and diff whitespace passed. For local builds only, the Cloudflare inspector was disabled to avoid the environment networkInterfaces failure; that temporary adapter setting was restored and is not part of this change. Main CI runs the full e2e, white-label and Lighthouse gates before deployment.
