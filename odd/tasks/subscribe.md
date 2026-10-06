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

W1 (S1, S2) done (commit `24fa280`): `features/subscribe` (domain, D1, Resend, WebCrypto tokens, bindings, runtime), migration 0002 applied to a local D1 only, `SUBSCRIBE_RATE_LIMITER` (1003) in wrangler, flag `features.subscribe` (off), two env vars. Turnstile verifier and `readProviderJson` moved to `shared/lib/` (contact imports them from there; depcruise forbids feature-to-feature internals). Observed: biome, typecheck, whole web vitest (85 files, 881 tests), depcruise, docs:config up to date, `wrangler d1 migrations apply SITE_DB --local` clean. Not run: e2e, Lighthouse, white-label (S4).

W2 (S3, S4) done (commit `4982ef4`). Built: Actions `subscribe.request/confirm/unsubscribe`; flag-gated `subscribe-routes/` (confirm and unsubscribe pages ES/EN) through `integrations/subscribe-routes.ts`; form in `NotesSidebar` (plain script, Turnstile loaded on first focus) and a footer link in `NotePage`; privacy section `subscribe`; recipe 6.14 (ES/EN); changelog `email-subscription`; verification map and `enableFixtureSubscribe` (FULL-wide file `fixture-workspace.ts`). Observed: biome clean, typecheck 0 errors, whole web vitest 90 files / 914 tests, depcruise clean, `docs:config` up to date, build (real config, flag off: no `/subscribe` output), js-budget green (`/notes/` 8.99 KiB gzip), white-label green, the one e2e run `subscribe.spec.ts` at 1280 px: 31 passed. Lighthouse `/notes/` once (fixture, flag on): LCP 2140 ms, document 77.0 KB (ledger baseline 1962 ms and 69.3 KB at `addc4ac`, worst of 3; one run is noisy). Privacy RED observed (3 failing) before the section was written; the server-side and client tests were written together with their code (no separate RED). Local D1 acceptance flow: see the handoff.

Decision (coordinator, a security trade-off; the owner can reverse it): keep `checkOrigin: true` and DROP RFC 8058 one-click: the endpoint `/subscribe/one-click/` and the `oneClickUrl`/`oneClick` plumbing were removed; `List-Unsubscribe` carries the unsubscribe page URL and `List-Unsubscribe-Post` is not sent (ADR 0014 Consequences). Reason: Astro's `checkOrigin` answers 403 to a mail client's form-type POST without Origin. Re-observed after the change: biome, typecheck, web vitest, depcruise, docs:config, build and js-budget (see the handoff); no e2e.

## Verification evidence (2026-10-05)
Whole battery green with `pnpm verify --all --run --record` (247 s, 47 checks): 914 unit tests, build, JS budget (`/notes/` 8.99 KiB gzip), white-label (flag off: no `/subscribe` output or strings), e2e 32 specs, Lighthouse 1 run (worst LCP `/` 2285 ms, note 2265 ms, `/notes/` 2113 ms with the form on in the fixture, budget 2500 ms). `subscribe.spec.ts`: 31 passed at 1280 px, then inside the full runs at 3 viewports. A flaky axe scan (`scrollable-region-focusable` on an Expressive Code block before its script set `tabindex`) was fixed in `tests/browser/helpers/axe.ts`; two full e2e runs then gave 848 passed.

## Not verified and follow-ups
- The subscribe, confirm and unsubscribe flow against a real local D1 through wrangler (only the D1 repository tests with a fake and the migration applying cleanly to a local database).
- No `/en/notes/` index exists, so the form is tested on `/notes/` only.
- The one-click `List-Unsubscribe-Post` is dropped (ADR 0014); revisit if bulk-sender rules ever require it.
- A command or protected endpoint for the owner to send a new note (the sending core exists and is tested with fakes).
- Owner steps before flipping `features.subscribe`: apply `migrations/0002_subscribers.sql` to the remote D1 (same database `elvinlab-dev-db`, one new table), create the secrets `SUBSCRIBE_FROM` and `SUBSCRIBE_TOKEN_SECRET`, bind `SUBSCRIBE_RATE_LIMITER`, verify the sending domain in Resend (recipe 6.14 in `docs/CONFIGURATION.md`).

## Progress 2026-10-05: single footer form
Owner decision: the subscription lives only in the global footer band. Done: band is the form (`shared/subscribe/`, lazy stub plus `form-client.ts`, Turnstile `interaction-only`); sidebar card, note-foot link and `subscribe.note` removed; `showSubscribeCta` no longer excludes `/notes/`; copy and privacy now cover project announcements; ADR 0014, BRAND, CONFIGURATION, changelog updated. Evidence: vitest 917 passed before final count, typecheck 0 errors, depcruise clean, white-label green, `subscribe.spec.ts` 34 passed at 1280 px, Lighthouse LCP `/` 2290 ms (baseline 2284), `/notes/smoke-es/` 2293 ms (baseline 2262).

## State at the end of 2026-10-05 and what is left for tomorrow
- The form lives ONLY in the global footer band (`shared/subscribe/SubscribeBand.astro`); the sidebar card and the note-foot link were removed. Consent covers new notes and occasional announcements of the owner's projects; the `/privacy` text was approved verbatim by the owner. Email field in terminal style.
- Pending, in this order: (1) the owner tests the whole flow end to end (needs the human steps below); (2) a designed HTML email template for the confirmation and the new-note emails (Resend `html` plus `text`, table layout, inline CSS, bulletproof button, system fonts, logo as a small hosted image with alt text; preview in a browser first; real test emails to the owner's own address need explicit authorization and a verified Resend domain); (3) the owner's decision on a global daily cap of confirmation emails (for example 30 of the free plan's 100 a day) so an attack cannot starve note sending; (4) a command or protected endpoint to send a new note; (5) the flow against a real local D1 through wrangler.
- Owner human steps before flipping `features.subscribe`: apply `migrations/0002_subscribers.sql` to the remote D1 `elvinlab-dev-db` (one table, no new database), create the secrets `SUBSCRIBE_FROM` and `SUBSCRIBE_TOKEN_SECRET`, bind `SUBSCRIBE_RATE_LIMITER`, verify the sending domain in Resend (recipe 6.14 in `docs/CONFIGURATION.md`).


## Progress 2026-10-06: designed HTML emails (bounded writer, not committed)
Done: `features/subscribe/email-templates.ts` (pure `renderConfirmationEmail` and `renderNoteEmail`, es/en, html plus text); Resend adapter sends `html` and `text` (headers and idempotency unchanged); adapter config now takes `siteUrl`, `siteName`, `ownerName` (runtime accepts a bare URL or an `EmailSite`, the bare URL falls back to the hostname); `public/email/logo.png`; `apps/web/scripts/preview-email.ts` writing to git-ignored `.email-preview/`; ADR 0014 update, TESTING.md "Email previews", changelog sentence. Tests: RED observed on the adapter test first, then GREEN; template tests cover escaping, links once, no script or remote URLs, img attributes, preheader, lang, dark block.
Follow-up for the coordinator: `apps/web/src/actions/index.ts` still passes `site.url` (a string), so production emails would show the hostname as site name and owner; pass `{ url: site.url, name: site.identity.handle, ownerName: site.identity.name }` (type `EmailSite`, exported from the subscribe barrel) to `submitConfiguredSubscribe` and `sendNoteConfigured`. No real send was done; email-client rendering (Gmail, Outlook) is untested.
