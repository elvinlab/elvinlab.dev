# The CI follows the config

2026-10-12: owner asked ("podemos hacer que todo esto sea configurable, apagable y bien documentado sin que se caiga el ci/cd?"). Implementation authorized. Push and release stay separate owner decisions. No Engram mirror (project override); this file is the source of truth.

## Objective
Someone who adopts the project switches features off (or changes colors and texts) in `site.config.ts`, follows the docs, and the CI still passes and deploys. Today it does not: with six switches off, 208 of about 790 e2e tests failed (experiment recorded in `odd/verification-ledger.md`, 2026-10-12).

## Evidence (explorer handoff, 2026-10-12)
- Playwright starts `apps/web/scripts/fixture-preview.ts`, which copies the real `apps/web/src` (with the real `site.config.ts`) to a tmp workspace and patches the copy (comments, notice, subscribe on, integrations emptied). The workspace path and the resolved flags never reach the spec workers. Readiness URL is `/notes/smoke-es/`, so `blog` off hangs Playwright itself.
- No spec reads the config or skips by flag (only by viewport). About 32 of 58 specs need `/notes/**` (blog); the rest depend on `/contact/`, `/changelog/`, `/me/`, `/experiments/`, `/subscribe/` or on component flags (readingMode, marks, comments, experimentNudge, backToTop, themeToggle, backgroundPicker, languageHint, home sections).
- 23 specs assert literal UI strings (ES/EN); none imports the i18n dictionary.
- Other gates: `lighthouserc.json` has 11 fixed URLs; `white-label-check.ts` assumes `/experiments/` and `/changelog/` exist; `smoke-check.sh` (post-deploy) checks only `/`, `/version.txt` and assets (flag-safe); `check:page-weight` and `check:js-budget` read the real build and are flag-tolerant (they passed with six features off).
- `tsconfig.browser.json` has no `@/` alias; specs must use relative imports. `schema.ts` and `appearance.ts` use relative imports and are safe to import from the Playwright config.

## Design
1. **One channel for the resolved flags.** `playwright.config.ts` (plain Node, evaluated once) parses the real `site.config.ts` with `parseSiteConfig`, applies the same overrides the fixture patches apply (`features.subscribe` forced on; `FIXTURE_APPEARANCE`), resolves the home sections with `resolveHome`, and exports the result as JSON in `process.env.E2E_FEATURES`. Workers inherit it.
2. **A helper for specs**: `tests/browser/helpers/features.ts` with `enabled(flag)`, `homeSection(name)`, `routesOn()` and skip wrappers (`requires('readingMode')`), so a spec states what it needs and is skipped, never failed, when it is off.
3. **Readiness URL** becomes `/`, which every profile has.
4. **Fixture notes only when `blog` is on**; page lists in a11y, performance, smoke, internal-links and friends are built from the helper.
5. **Lighthouse and white-label follow the flags** (URL list computed from the resolved flags; empty-state assertions only when the route exists).
6. **Proof, not trust**: named adopter profiles (everything optional off; blog only; me only) run through the same e2e, locally with one command and in the CI as decided with the owner. A profile that goes red is a regression of this work.
7. **Phase 2, texts**: specs read UI strings from the i18n dictionary instead of literals, so changing a UI text does not break the suite.

## Constraints
- The default profile (this site, everything on) must stay green after every task: it is what the CI runs today.
- Specs are skipped by flag with a reason, never deleted; coverage with everything on does not shrink.
- Heuristic of about 400 authored changed lines per task is advisory only (forwarded to delegates).
- Delegates (OpenCode is unreachable; general-purpose subagents are the delegation mechanism) get an explicit allowed-edit list, one writer at a time, and run only the checks the parent lists.

## Tasks
- [x] E1 — Seam: resolved flags in `E2E_FEATURES`, helper `features.ts` with unit tests, readiness URL `/`. Tier 3.
- [ ] E2 — Notes family follows `blog` and the component flags (about 32 specs). Tier 2, delegated writer.
- [ ] E3 — Contact, changelog, me, experiments, subscribe and component-flag specs, plus the shared page lists (a11y, performance, smoke, internal-links, external-links, cookies). Tier 2, delegated writer.
- [ ] E4 — Lighthouse URL list and white-label check follow the flags. Tier 3.
- [ ] E5 — Adopter profiles: configs, `pnpm test:profiles`, verification-map entry, CI decision. Tier 3.
- [ ] E6 — Phase 2: specs read UI texts from the i18n dictionary. Tier 2.
- [ ] E7 — Docs: README, CONFIGURATION (section 10), TESTING; remove the "known limit" note when the profiles are green. Tier 2.

## Route declaration
E1, E4, E5 inline (design and judgement). E2, E3, E6 delegated to one writer at a time (many mechanical edits across 2+ files, writer trigger), verified by me with the profile runs. E7 inline. Mapping trigger already fired and was delegated (explorer, 2026-10-12).

## Acceptance criteria
- With this site's config the full e2e passes exactly as today.
- With the three adopter profiles the e2e passes (skips are listed with their reason) and `pnpm test`, lint, typecheck, depcruise, build, js-budget, page-weight, white-label and Lighthouse pass.
- Docs say how to turn things off and that the CI follows; the known-limit note is gone.

## Progress and evidence
E1 done (inline, Tier 3): `apps/web/scripts/e2e-features.ts` resolves the profile (flags with the fixture overrides, home sections, which routes exist; `/me` is always built) with 15 unit tests (RED first); `playwright.config.ts` exports it as `E2E_PROFILE`; `tests/browser/helpers/features.ts` gives specs `requires()` and `livePages()`; readiness URL is now `/`; `tsconfig.browser.json` got the `@/` alias and `allowImportingTsExtensions`. Playwright loads the alias through the nearest tsconfig of `apps/web/scripts`. Proven on the nudge spec: card on, 32 passed; card off (temporary edit, restored), 32 skipped and none failed, server started. typecheck 0 errors, lint clean.
Profiles (E5 groundwork, done with E1): `apps/web/scripts/e2e-profiles.ts` defines `quiet`, `blog-only`, `me-only` and `bare` as data; `E2E_FEATURE_PROFILE=<name>` makes both the Playwright config (profile) and `fixture-preview.ts` (`applyFixtureFeatures` patches the workspace copy) use it; 287 script tests green (RED first). Proven: quiet profile, nudge spec 31 skipped; `reading-mode.spec` 16 failed as expected until E2; a wrong name fails with the list of profiles. Command for writers: `E2E_FEATURE_PROFILE=quiet mise exec -- pnpm test:e2e:quick <specs>`.
Issues: E1 #133, E2 #134, E3 #135, E4 #136, E5 #137, E6 #138, E7 #139 (T94 to T100).

## Next step
Start E2 (#134): delegate the notes-family specs to one writer.
