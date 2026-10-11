# Notes release, 2026-10-11

Scope: publish notes 004–007 and update note 002. Exact production diff: notes, one image, changelog and existing tracking records; no redesign code.

CI run 38170913722 passed static checks, the production build and JavaScript budget, but blocked deployment at page weight. The new seven-note index measures 112772 HTML bytes; the largest new note measures 138411. All CSS ceilings passed.

As allowed by docs/TESTING.md, only notes-index and note HTML budgets use the measured content baseline plus 4% headroom (117300 and 144000 bytes). CSS, JavaScript and Lighthouse ceilings are unchanged. Article text and layouts are unchanged.

Validation: Biome passed on both JSON files; page-weight and changelog unit suites passed, 2 files / 40 tests. Local build was blocked by an environment os.networkInterfaces error; the original build passed in CI. The follow-up main CI runs the full quality gates before deployment.
