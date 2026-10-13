# 0017. The CI follows the site config: adopter profiles, non-blocking

Status: Accepted

Builds on: [0011](./0011-ci-gate-once-at-main-pr-no-staging.md) (gates run once, at `main`) and [0016](./0016-publish-note-command-and-notes-fast-lane.md) (the `changes` job). Nothing there changes.

## Context

The site is meant to be adopted by changing configuration and content only (README, "Using it as a base"). On 2026-10-12 an experiment turned six features off in `site.config.ts` and ran what the CI runs: the static gates, the build, the budgets and white-label passed, but 208 of about 790 browser tests failed. The specs assumed this site's feature set, its URLs, its owner's name and domain, its interface texts and its violet accent, and none of them read the config. The CI deploys only when its gates pass, so an adopter's site would never ship.

## Decision

1. **Specs follow the config.** `playwright.config.ts` resolves the feature set once and exports it as `E2E_PROFILE` (`apps/web/scripts/e2e-features.ts`). Specs say what they need with `requires`, `has`, `livePages` and `liveByPath` (`tests/browser/helpers/features.ts`) and are **skipped with a reason, never failed and never deleted**. They read the owner's values, texts, theme ids and palette colors from the config, the dictionary and `tokens.json` (`tests/browser/helpers/site.ts`); a unit test (`spec-literals.test.ts`) fails when a spec writes one out.
2. **Four adopter profiles** (`apps/web/scripts/e2e-profiles.ts`): `quiet`, `blog-only`, `me-only` and `bare`. `E2E_FEATURE_PROFILE=<name>` makes the Playwright config and the fixture build use it; `pnpm test:profiles` runs them all. Lighthouse follows the profile too (`lighthouse-pages.ts`: every URL of `lighthouserc.json` needs a decision; `/me/` is audited only with `features.me`, because the page is `noindex` without it).
3. **A CI job `profiles`** runs the four profiles in parallel with `e2e` and `lighthouse`, at 1280 px. It is **not a deploy gate**: `continue-on-error: true` and it is not in `checks.needs`. The `changes` job also outputs `profiles_relevant` and the job is skipped when a push touches only docs, trackers, READMEs, issue templates or content.
4. **Texts have limits.** Every interface text has a length limit by key group, in both languages (`text-limits.ts`), and 26 visible fields of `site.config.ts` have `max` limits in the schema, so a longer text fails a test with its name instead of overflowing.

## Consequences

- Measured on 2026-10-13 (12 cores, 1280 px): the profiles take 37 s (`bare`), 52 s (`me-only`), 92 s (`blog-only`) and 97 s (`quiet`), against about 261 s for the slowest existing gate (Lighthouse), so they add nothing to a release when run in parallel.
- The first profile runs found real defects of the site, fixed in the site: a dead `/rss.xml` link without the blog, a `/me` share image that was never generated without `me`, and a feed advertised in the head without the blog. Runs under the `minimal` appearance, which the CI had never run, found two older defects (the hero wrapping to three lines, and a spec assuming the `full` layout).
- Because a red profile does not stop a release, a regression in an adopter scenario can reach `main`; it shows as a red job and is fixed in the next release. That is the price of not slowing the owner's own deploys for a scenario the owner's site does not run.
- A new switch, page or spec has to say what it needs; `docs/TESTING.md` has the checklist.

## Reverting

Delete the `profiles` job and the `profiles_relevant` output from `ci.yml`. The helpers are harmless without it: specs read the profile of this site's own config, which has everything on.

To make the profiles blocking later, add `profiles` to `checks.needs` and drop `continue-on-error`.
