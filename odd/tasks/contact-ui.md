# Feature: contact-ui (T19 UI slice, issue #23)

## Objective

Ship the `/contact/` and `/en/contact/` pages: a server-rendered shell plus a Preact island that submits to the existing `contact` Astro Action, with Cloudflare Turnstile, without hurting mobile Lighthouse.

## Problem and why

The server runtime is complete (`apps/web/src/actions/index.ts`, `features/contact/*`) and fails closed until Cloudflare is configured. Nav already links `/contact/` but the route is a 404. The visitor has no way to write to the owner (contact never exposes the email address, per repo rules).

## Decisions (user, 2026-09-30)

- Initially React ("React as long as Lighthouse performance stays good"). **Revised the same day to Preact** after measuring: a one-button React 19 island costs about 69 KiB gzip (renderer chunk 65.6 KiB), Preact about 7.3 KiB (client 1.4, preact 4.4, hooks 1.1, island 0.4). The user chose Preact ("vamos con preact"). Same component/hooks/JSX syntax; no `compat` layer since no React-only libraries are used.
- Lighthouse mobile is the gate; do not weaken thresholds. The 30 KiB gzip JS budget stays as is, with no per-page allowance.
- `check:js-budget` previously ignored island chunks (the probe page reported 1.95 KiB while loading about 69 KiB). Fixed in C1 so islands count.

## Scope

In: Preact integration, contact island and client logic, ES/EN pages, strings, Turnstile client widget (lazy), env typing, tests (Vitest + Playwright/a11y + Lighthouse URL), docs note.
Out: changing the Action or server runtime, Cloudflare secrets and the Turnstile site key (user-owned, T18), the under-construction flags decision (Q24), `/me` data.

## Constraints

- `core` stays presentation-only; the feature lives in `apps/web/src/features/contact/`. Client code must not import the server runtime or schema barrel (`contact.ts:6`, `index.ts:1`). Import only `config.ts` limits or mirror them.
- Semantic tokens only, no raw hex; every animation stops under `prefers-reduced-motion`.
- Pages stay thin; dependency-cruiser rules apply (pages import a feature only through `index.ts`).
- No email address in tracked files. Secrets only in Cloudflare or `.dev.vars`.
- pnpm minimum release age: pin older versions instead of accepting `minimumReleaseAgeExclude`.
- Advisory heuristic: about 400 authored changed lines per task, not a limit.

## Execution settings

- TDD: **strict**, source: project session config (Strict TDD Mode enabled). Runner: Vitest via `mise exec -- pnpm test`. RED observed before each implementation.
- Review: receipt-driven review is off for this clone (`clone_local`); delivery is `disabled/unmanaged`. The parent reviews every delegated diff and re-runs checks.
- Delivery: direct commits on `develop` (repo policy); production via the user's `develop` -> `main` PR. Forecast about 550 authored lines across four work-unit commits.

## Tasks

- [x] **C1 Preact integration and JS-budget fix.** Route: inline (Tier 3: lockfile, cross-cutting config, pinned versions). Added `preact` 10.29.8 and `@astrojs/preact` 6.0.5 (exact pins), `preact()` in `astro.config.ts`, `jsx: react-jsx` + `jsxImportSource: preact` in `apps/web/tsconfig.json`. `check:js-budget` now counts `component-url`/`renderer-url` island modules and their imports (RED observed: 0 bytes vs 131 expected; then GREEN). Evidence: lint, typecheck, test (218), depcruise, build, js-budget all pass locally; probe islands were temporary and deleted.
- [ ] **C2 Client logic and island (TDD).** Route: delegated (Tier 2). Preact (`preact/hooks`), not React. Pure form state machine and validation (limits from `config.ts`), error mapping (`SERVICE_UNAVAILABLE`, `BAD_REQUEST`, `FORBIDDEN`, rate limit), `startedAt` on mount, hidden honeypot `website`, submit via `actions.contact`, Turnstile widget loaded lazily on first interaction with `action: 'contact'`.
- [ ] **C3 Pages, strings, env.** Route: delegated (Tier 2). `pages/contact/index.astro`, `pages/en/contact/index.astro`, `ContactPage.astro`, ES/EN strings (props into the island), `PUBLIC_TURNSTILE_SITE_KEY` in `env.d.ts`, graceful state when the key is missing, `client:visible` or `client:idle`.
- [ ] **C4 Quality gates.** Route: delegated (Tier 2). Add `/contact/` and `/en/contact/` to `a11y.spec.ts`, `smoke.spec.ts`, `lighthouserc.json`; docs note. Run `test:e2e`, `check:js-budget`, `test:lighthouse` locally; record scores.

## Authorized scope

Local implementation in the paths above, dependency additions listed in C1, tests, docs, and work-unit commits on `develop`. Push to `develop` only when the user says so. No remote/Cloudflare actions by the agent.

## Acceptance criteria

1. `/contact/` and `/en/contact/` render; form submits through the Action and shows success, validation and service-unavailable states.
2. Mobile Lighthouse stays within the existing thresholds on `/contact/` (same gates as other pages); Turnstile does not load before interaction.
3. a11y checks pass at 360/768/1280; both themes; reduced motion respected.
4. All checks green: lint, typecheck, test, depcruise, build, test:e2e, check:js-budget, test:lighthouse, test:white-label.

## Progress and evidence

- 2026-09-30: C1 done (see task). React measured and rejected on size; Preact adopted.
- 2026-09-30: feature created after exploration (mapper: server complete; no React, no pages, no Turnstile client, no strings; js-budget script skips island chunks; fixture build has no Turnstile key).

## User-owned pending

Create the Turnstile widget and site key in Cloudflare, set `PUBLIC_TURNSTILE_SITE_KEY` and the T18 secrets. Until then the form shows the unavailable state by design.

## Next step

C2 (brief, then delegate to Tier 2).
