# Feature: email subscription to new notes (issue #78, T50)

## Objective
Visitors subscribe by email to hear about each new note. The list is owned by the site (Cloudflare D1); the mail provider (Resend) sits behind a port. Design and the open sending decision: `docs/adr/0014-email-subscription-d1-list-resend-port.md`.

## Authorized scope
Local implementation on `develop`. The owner's human steps (apply the migration remotely, create secrets, bind the rate limiter, enable the flag) and any push or release are NOT authorized here. No email may be sent to a real address during development. `features.subscribe` ships off.

## Route
Delegated direct, one writer at a time: W1 server side (S1, S2), W2 UI and docs (S3, S4). Trigger: more than two non-trivial files and mapping beyond the inline budget (explorer map of contact and marks done first).

## Tasks
- [ ] S1 Domain: `features/subscribe` ports, pure rules (`subscribe`, `confirm`, `unsubscribe`, `sendNote`, stale purge), token helpers (random confirm token + SHA-256 hash, HMAC unsubscribe token), fake adapters, unit tests first.
- [ ] S2 Adapters and wiring: D1 repository and migration `0002_subscribers.sql`, Resend mailer (confirmation and batch note email with `List-Unsubscribe` headers), Turnstile verifier parameterized by action, bindings schema, `SUBSCRIBE_RATE_LIMITER` in wrangler, env vars registry, `features.subscribe` flag (off) and `pnpm docs:config`.
- [ ] S3 Delivery: Astro Actions (`subscribe.request`, `.confirm`, `.unsubscribe`), one-click POST endpoint, confirm and unsubscribe pages (ES and EN) gated by the blog and subscribe flags, the form on `/notes` next to RSS (no heavy island: Turnstile loads on first interaction).
- [ ] S4 Privacy, docs, changelog, e2e (form, confirm, unsubscribe, flag off hides everything, axe in both themes), white-label and budgets, local D1 run subscribe to confirm to unsubscribe.

## Acceptance criteria (from the issue)
Repeating an email does not duplicate rows or leak existence; only the confirmation link moves `pending` to `confirmed`, single use, stored hashed; unsubscribe works without login and is idempotent; no email in logs, HTML or tracked files; a fake mailer proves the adapter swap; `/privacy` updated; flag off hides form and endpoints; JS budget, a11y, Lighthouse and white-label stay green.

## Progress
Created. ADR 0014 accepted (option (b), our own list through the batch API). Explorer map of contact and marks done.
