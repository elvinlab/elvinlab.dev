# README, central configuration and the guides

## Objective and authorization
On 2026-10-01 the user asked to (1) rewrite the README and make it nice, (2) centralize and document how the site is configured and updated, in code and in one guide linked from the README, and, after the evaluation, approved moving every site setting into the one config file; plus (3) READMEs in Spanish by default with English support and (4) a detailed guide on creating a note. Local commits on `docs/readme-and-configuration`, push to `develop`; the release to `main` is a separate step (the README on `main` is what GitHub shows).

## Problem and why
The README is a stub that still says "Foundation phase". Settings are spread over `site.config.ts`, build env vars read in six files, two duplicated legal dates, GitHub variables and Cloudflare secrets, and nothing explains how to change or update any of it.

## Decisions
- Everything that belongs to the site lives in `site.config.ts`: identity, locales, flags, giscus, recruiter, `/me`, socials, background (already there) plus the public integration ids (Cloudflare Analytics token, Turnstile site key) and the privacy/terms "last updated" dates (new). Env vars `PUBLIC_CF_ANALYTICS_TOKEN` and `PUBLIC_TURNSTILE_SITE_KEY` stay as optional overrides (local dev needs another Turnstile key because it is bound to the domain).
- Stays outside, on purpose: secrets and email addresses (Cloudflare secrets; an address never goes in a public repo), `SITE_INDEXABLE` (set by CI per environment), tool config files (read natively by their tools) and content (notes, experience, credentials, experiments, changelog are growing lists, kept in `content/` and documented in the same guide).
- One registry of every environment variable and secret (`ENV_VARS`), with scope, secrecy and where it is set. It feeds the guide and `.dev.vars.example`, and a test fails if code reads a variable that is not registered.
- Schemas carry `.describe()` text; a generator renders the reference tables into the guide between markers, and a test fails when the guide is out of date (`pnpm docs:config` regenerates it).
- Languages: READMEs and both guides in Spanish by default (`*.md`) with English versions (`*.en.md`); code, comments and the tables generated from code stay in English. A test checks that each Spanish/English pair has the same structure and that every relative link resolves.
- Screenshots in the README are produced from a real build, as small WebP files.
- Strict TDD for code and generators; the docs are protected by the sync, parity and link tests. RDD off (disabled/unmanaged). Route: inline by the user's preference.
- No `LICENSE` is added without the user's decision (the repo has none today); the README says so plainly.

## Tasks
- [x] C1 — Central settings: `integrations` and `legal` in the config schema, `resolveIntegrations` (env over config), the `ENV_VARS` registry, one place that reads build env, callers updated, config values moved from GitHub variables, tests first.
- [ ] C2 — Self-documenting schemas: `.describe()` on the site config, notes, experience, credentials, experiments and changelog schemas and the Worker bindings; `.dev.vars.example`.
- [ ] C3 — Generator `pnpm docs:config` and the sync, parity and link tests.
- [ ] C4 — `docs/CONFIGURATION` (ES/EN): map of where things live, generated reference, how to update everything, deploy and release, troubleshooting.
- [ ] C5 — `docs/NOTES` (ES/EN): detailed guide to creating a note, verified against the real pipeline.
- [ ] C6 — README (ES default, EN) with screenshots, and pointers in code headers, `CLAUDE.md` and `AGENTS.md`.
- [ ] C7 — Full verification, release to `main`, production check.

## Acceptance criteria
- Changing the analytics token, the Turnstile key or a legal date is a one-line edit in `site.config.ts`; env still overrides.
- Nothing reads a build env var that is not in `ENV_VARS`; the generated tables in the guide match the schemas.
- README and both guides exist in ES and EN with the same structure; every relative link resolves.
- The guide answers, step by step: change identity, toggle a feature, add a note, add experience or a certificate, enable comments, rotate a secret, update dependencies, release, roll back.
- Full suites green and production serves the release.

## Progress and evidence
Evaluation done and approved. Values to move (public by design): analytics token and Turnstile site key, read from the `production` environment variables.

C1 done: RED observed (9 failing tests plus two missing modules), then GREEN: 403 unit tests, typecheck 0 errors, lint and depcruise clean, 324 e2e and white-label green. Verified by building with NO environment variables: the Cloudflare beacon token, the Turnstile key and both legal dates come from `site.config.ts`. Slips caught on the way: a guard test tripping on my own comment, two imports dropped in a move, and a design catch (fixture builds would have inherited the real analytics token and loaded the beacon over the network; `neutralizeFixtureIntegrations`, tested, keeps them hermetic). Old `analytics.ts` removed: its logic is the tested `resolveIntegrations`. The `production` GitHub variables PUBLIC_CF_ANALYTICS_TOKEN and PUBLIC_TURNSTILE_SITE_KEY are now redundant (env still overrides if set).
Next step: C2 `.describe()` on the schemas.

Engram mirror: `odd/docs-and-config/tasks`.
