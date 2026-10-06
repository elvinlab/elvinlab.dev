# Feature: email subscription to new notes (issue #78, T50)

## Objective
Visitors subscribe by email to hear about each new note. The list is owned by the site (Cloudflare D1); the mail provider (Resend) sits behind a port. Design and the open sending decision: `docs/adr/0014-email-subscription-d1-list-resend-port.md`.

## Authorized scope
Local implementation on `develop`. The owner's human steps (apply the migration remotely, create secrets, bind the rate limiter, enable the flag) and any push or release are NOT authorized here. No email may be sent to a real address during development. `features.subscribe` ships off.

## Route
Delegated direct, one writer at a time: W1 server side (S1, S2), W2 UI and docs (S3, S4). Trigger: more than two non-trivial files and mapping beyond the inline budget (explorer map of contact and marks done first).

## Tasks
- [x] S1 Domain: `features/subscribe` ports, pure rules (`subscribe`, `confirm`, `unsubscribe`, `sendNote`, stale purge), token helpers (random confirm token + SHA-256 hash, HMAC unsubscribe token), fake adapters, unit tests first.
- [x] S2 Adapters and wiring: D1 repository and migration `0002_subscribers.sql`, Resend mailer (confirmation and batch note email with `List-Unsubscribe` headers), Turnstile verifier parameterized by action, bindings schema, `SUBSCRIBE_RATE_LIMITER` in wrangler, env vars registry, `features.subscribe` flag (off) and `pnpm docs:config`.
- [x] S3 Delivery: Astro Actions (`subscribe.request`, `.confirm`, `.unsubscribe`), confirm and unsubscribe pages (ES and EN) gated by the blog and subscribe flags, the form on `/notes` next to RSS (no heavy island: Turnstile loads on first interaction).
- [x] S4 Privacy, docs, changelog, e2e (form, confirm, unsubscribe, flag off hides everything, axe in both themes), white-label and budgets, local D1 run subscribe to confirm to unsubscribe.

## Acceptance criteria (from the issue)
Repeating an email does not duplicate rows or leak existence; only the confirmation link moves `pending` to `confirmed`, single use, stored hashed; unsubscribe works without login and is idempotent; no email in logs, HTML or tracked files; a fake mailer proves the adapter swap; `/privacy` updated; flag off hides form and endpoints; JS budget, a11y, Lighthouse and white-label stay green.

## Progress
Created. ADR 0014 accepted (option (b), our own list through the batch API). Explorer map of contact and marks done.

W1 (S1, S2) done, uncommitted: `features/subscribe` (domain, D1, Resend, WebCrypto tokens, bindings, runtime), migration 0002 applied to a local D1 only, `SUBSCRIBE_RATE_LIMITER` (1003) in wrangler, flag `features.subscribe` (off), two env vars. Turnstile verifier and `readProviderJson` moved to `shared/lib/` (contact imports them from there; depcruise forbids feature-to-feature internals). Observed: biome, typecheck, whole web vitest (85 files, 881 tests), depcruise, docs:config up to date, `wrangler d1 migrations apply SITE_DB --local` clean. Not run: e2e, Lighthouse, white-label (S4).

W2 (S3, S4) done, uncommitted. Built: Actions `subscribe.request/confirm/unsubscribe`; flag-gated `subscribe-routes/` (confirm and unsubscribe pages ES/EN) through `integrations/subscribe-routes.ts`; form in `NotesSidebar` (plain script, Turnstile loaded on first focus) and a footer link in `NotePage`; privacy section `subscribe`; recipe 6.14 (ES/EN); changelog `email-subscription`; verification map and `enableFixtureSubscribe` (FULL-wide file `fixture-workspace.ts`). Observed: biome clean, typecheck 0 errors, whole web vitest 90 files / 914 tests, depcruise clean, `docs:config` up to date, build (real config, flag off: no `/subscribe` output), js-budget green (`/notes/` 8.99 KiB gzip), white-label green, the one e2e run `subscribe.spec.ts` at 1280 px: 31 passed. Lighthouse `/notes/` once (fixture, flag on): LCP 2140 ms, document 77.0 KB (ledger baseline 1962 ms and 69.3 KB at `addc4ac`, worst of 3; one run is noisy). Privacy RED observed (3 failing) before the section was written; the server-side and client tests were written together with their code (no separate RED). Local D1 acceptance flow: see the handoff.

Decision (owner, via coordinator): keep `checkOrigin: true` and DROP RFC 8058 one-click: the endpoint `/subscribe/one-click/` and the `oneClickUrl`/`oneClick` plumbing were removed; `List-Unsubscribe` carries the unsubscribe page URL and `List-Unsubscribe-Post` is not sent (ADR 0014 Consequences). Reason: Astro's `checkOrigin` answers 403 to a mail client's form-type POST without Origin. Re-observed after the change: biome, typecheck, web vitest, depcruise, docs:config, build and js-budget (see the handoff); no e2e.
