# Design batch 2

Objective: close the second batch of small design items found after releases 16/17.

## Scope

- [x] T1 Changelog: cap entry text measure (`.cl-d`, `.cl-t` in `features/changelog/components/changelog-styles.ts`) at 68ch, matching `.prose`.
- [x] T2 RSS: drop the em dash from the feed title (`features/notes/lib/rss.ts:51`) and from the alternate-link title (`shared/seo/Seo.astro:70`); update `rss.test.ts`.
- [x] T3 Experiments gallery on phones: thumbnails un-dimmed on touch (`opacity: 0.6` only lifted under `(hover: hover)`), larger thumbs under 640 px, verify `/en/experiments/` for Spanish-only text.
- [x] T4 Privacy/terms 680 px column: dropped. Both use `max-w-[68ch]`, the same measure as `.prose` (notes); narrow on purpose.

## Route

Delegated direct: one writer (T1-T3 touch 4+ non-trivial files). Parent reviews the diff and screenshots.

## Checks

Touch-scoped: vitest for changelog/notes/experiments, lint, typecheck, build + `check:page-weight`, e2e quick for `changelog`, `experiments`, `mobile-ux`, `no-horizontal-overflow`. Full battery at release.

## Evidence

Writer (delegated, general-purpose) done 2026-10-12. lint, typecheck, vitest (81), build, page-weight (32 pages, no budget changed), e2e quick on experiments/changelog/mobile-ux/no-horizontal-overflow (104 passed). Tests written after the fix (no RED observed). No Spanish-only UI on /en/experiments/ (only labelled case links). 360 px after-screenshot blank (fade capture); thumbs measured 78x59. Changelog entry `readability-touch-ups` added. Not re-run: full e2e/Lighthouse (release).
