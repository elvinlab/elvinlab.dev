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
- Pending, in this order: (1) the owner tests the whole flow end to end (needs the human steps below); (2) a designed HTML email template for the confirmation and the new-note emails (Resend `html` plus `text`, table layout, inline CSS, bulletproof button, system fonts, logo as a small hosted image with alt text; preview in a browser first; real test emails to the owner's own address need explicit authorization and a verified Resend domain); (3) [x] DONE 2026-10-06, see Progress below: the owner's decision on a global daily cap of confirmation emails (for example 30 of the free plan's 100 a day) so an attack cannot starve note sending; (4) a command or protected endpoint to send a new note; (5) the flow against a real local D1 through wrangler.
- Owner human steps before flipping `features.subscribe`: apply `migrations/0002_subscribers.sql` to the remote D1 `elvinlab-dev-db` (one table, no new database), create the secrets `SUBSCRIBE_FROM` and `SUBSCRIBE_TOKEN_SECRET`, bind `SUBSCRIBE_RATE_LIMITER`, verify the sending domain in Resend (recipe 6.14 in `docs/CONFIGURATION.md`).


## Progress 2026-10-06: designed HTML emails (bounded writer, not committed)
Done: `features/subscribe/email-templates.ts` (pure `renderConfirmationEmail` and `renderNoteEmail`, es/en, html plus text); Resend adapter sends `html` and `text` (headers and idempotency unchanged); adapter config now takes `siteUrl`, `siteName`, `ownerName` (runtime accepts a bare URL or an `EmailSite`, the bare URL falls back to the hostname); `public/email/logo.png`; `apps/web/scripts/preview-email.ts` writing to git-ignored `.email-preview/`; ADR 0014 update, TESTING.md "Email previews", changelog sentence. Tests: RED observed on the adapter test first, then GREEN; template tests cover escaping, links once, no script or remote URLs, img attributes, preheader, lang, dark block.
Follow-up for the coordinator: `apps/web/src/actions/index.ts` still passes `site.url` (a string), so production emails would show the hostname as site name and owner; pass `{ url: site.url, name: site.identity.handle, ownerName: site.identity.name }` (type `EmailSite`, exported from the subscribe barrel) to `submitConfiguredSubscribe` and `sendNoteConfigured`. No real send was done; email-client rendering (Gmail, Outlook) is untested.

## Progress 2026-10-06: global confirmation cap, site identity, email logo alt (bounded writer, not committed)
- [x] Global cap of 30 confirmation emails per UTC day (`SUBSCRIBE_POLICY.confirmationsDailyCap`, `providerDailyTotal` 100); `subscribe_quota` created by migration 0002 (no remote apply); atomic `reserveConfirmation` and `confirmationsToday` (port `SubscribeQuota`, D1 adapter, fakes); public result `daily_cap` mapped to `TOO_MANY_REQUESTS` with fixed es/en message shown by the footer form; `sendNote` sends only what is left of the 100-a-day pool.
- [x] Actions pass `{ url, name: handle, ownerName }` to the mailer runtime.
- [x] Header logo has `alt=""` (template test asserts the attribute is present).
- Evidence: see the verification results recorded in the coordinator's handoff and `odd/verification-ledger.md`.

## Owner steps done on 2026-10-06 (owner-authorized, exact operations, the machine's existing wrangler login)
- Migration `0002_subscribers.sql` applied to the remote D1 `elvinlab-dev-db` (tables `subscribers` and `subscribe_quota` verified; no new database).
- Secrets `SUBSCRIBE_TOKEN_SECRET` (generated on the spot, never displayed) and `SUBSCRIBE_FROM` created on the Worker `elvinlab`; `wrangler secret list` shows both next to the contact and Turnstile secrets.
- Still open: the Resend sending domain was assumed verified because the contact form already sends from the same domain (not checked in Resend's panel); flip `features.subscribe: true` and release (needs explicit authorization); a real end-to-end test with an address the owner owns.

## Released 2026-10-06
`main` = `bc0b0c8`, flag on. Read-only production checks passed (see the ledger). Waiting on the owner's real end-to-end test and the sender trigger for new notes.

## Owner trigger for sending a note (bounded writer, not committed)
- [x] `POST /api/subscribe/notify` (server route injected by the flag-gated integration; Bearer `SUBSCRIBE_ADMIN_TOKEN`, constant-time compare, rate limit `notify:<ip>` before the token, JSON only, strict body `{ slug, dryRun? }`, note built server side from the published collection). Pure handler `notifySubscribers` in `features/subscribe/notify.ts`; ADR 0014 section added.
- [x] Language filter: `listUnnotified`/`countUnnotified` take the locale (port, fake, D1 with bound parameter); `NoteToSend` carries `locale`.
- [x] Owner command `pnpm notify:note <slug> [--send]` (`apps/web/scripts/notify-subscribers.ts`): token from the environment only, dry run by default, plain-sentence counts, non-zero exit on errors.
- [x] New secret `SUBSCRIBE_ADMIN_TOKEN` in `ENV_VARS` (optional) with its own `notifyBindingsSchema` so the public subscription does not depend on it; docs (recipe 6.14 step 7, NOTES), changelog, white-label assertion that `/api/subscribe/` does not exist with the flag off.
- Owner steps still open: create the secret on the Worker (`openssl rand -base64 48`, `wrangler secret put SUBSCRIBE_ADMIN_TOKEN`), release, then run the command (dry run first). Not run: e2e, Lighthouse, any remote command.


## Progress 2026-10-06: consolidated guide (bounded writer, not committed)
- [x] `docs/SUBSCRIPTION.md` and `docs/SUBSCRIPTION.en.md` written and linked from README, ADR 0014 and recipe 6.14 (es/en). Docs only; checks: relative links, Biome on the changelog, `docs:config`.

## First real cycle, 2026-10-06 (owner test with their own address)
The owner subscribed from the footer, confirmed, and received the note email. Dry run through production first (1 recipient, pool 99), then the real send of note 3 (`vibe-coding-o-especificar-primero`) to that one subscriber: `Sent ... to 1 subscriber; 0 still waiting`. The owner confirms the email arrived and looks good in the light theme ("muy bonito"). This also proves the Resend sending domain is verified (the earlier assumption). Still not checked: dark mode in a client that honors it, Outlook and Gmail rendering, and the unsubscribe click-through from a note email (it removes the owner from the list).


## Progress 2026-10-06: Turnstile UX fixes (bounded writer, not committed)
- Reproduced in production: with `appearance: 'interaction-only'`, Cloudflare showed the visible checkbox (about 72 px) below the submit button while the status said "Verificando…"; a real phone user did not notice it and waited forever, and on failure saw only the generic error. The live logs showed that no failed attempt reached the server, so both problems were client-side.
- [x] `before-interactive-callback` announces the checkbox and scrolls the widget into view (reduced motion: `auto`); `after-interactive-callback` restores "Verificando…".
- [x] 25 s wait timer (`VERIFY_TIMEOUT_MS`, `verify-wait.ts`): on timeout it resets the widget and shows a retry message.
- [x] Turnstile error code shown in parentheses and `console.warn`ed (code only, never the address).
- [x] `minFillTimeMs` 3 s to 1.5 s (now defined in `client-policy.ts`); docs updated.
- [x] Rate limiter reported as `rate_limited`, mapped to `TOO_MANY_REQUESTS` with its own fixed message (`subscribe.rateLimited`); the Action client now keeps the error message so the form tells it from `subscribe.capped`.
- Checks: see the coordinator handoff.


## Progress 2026-10-06: 8-bit landing pages (bounded writer, not committed)
- [x] `/subscribe/confirm/` and `/subscribe/unsubscribe/` restyled as the band's dashed card with a pixel icon (envelope, check, exclamation) switched by `data-state`; BRAND row added, changelog `subscribe-pages-8bit`, e2e extended. Checks: see the coordinator handoff.

## Dark mode check, 2026-10-06
The owner confirmed the note email in dark mode in their own client and says it looks good. Still not checked: Outlook rendering and the unsubscribe click-through (it removes the owner from the list).

## The friend's retry, 2026-10-06
After the release `e3dedd6` the friend who got stuck on "Verificando…" retried from their Android phone and subscribed and confirmed without trouble. Server side: 3 subscribers, all confirmed, none pending; 4 of the 30 daily confirmation emails used. Closes the field report that started with the interactive Turnstile checkbox that readers did not notice.

## Unsubscribe click-through, 2026-10-06
The owner unsubscribed one address from a note email in production: the page answered fast and said all fine. Server side right after: 2 confirmed, 1 unsubscribed (unsubscribed_at set), no confirmation hash left. The remaining open checks of the subscription are Outlook rendering and the DMARC report address (owner DNS step).

## Outlook check, 2026-10-06
The owner opened the note email in Outlook and says it looks good. Email clients checked by the owner: Gmail (light and dark) and Outlook. The only open item of the subscription is the DMARC report address, an owner DNS step.

## Email Routing and the new sender, 2026-10-06 (owner-authorized, exact operations, the machine's wrangler login)
- DMARC: the owner activated Cloudflare DMARC Management in the dashboard; DNS now has ONE `_dmarc` record, `p=none` with Cloudflare's report address (not recorded here). The dashboard's "DKIM: No" and "SPF: N/A" are the scan of the root domain, not the real state: DKIM `resend._domainkey` and the Resend SPF on `send.elvinlab.dev` are published.
- Email Routing for the zone was unconfigured and the root had no MX, so a reader's reply to a note email bounced. With `wrangler email routing`: the owner's personal address registered as a destination (the owner verified it by clicking Cloudflare's email), routing enabled (status ready; MX `route1/2/3.mx.cloudflare.net` and root SPF `include:_spf.mx.cloudflare.net` added; DMARC and the Resend SPF untouched), two forward rules (`notes@` and, for the first note email that already went out, `notas@`), catch-all left disabled (drop).
- `SUBSCRIBE_FROM` set to the English sender `Lab Notes <notes@elvinlab.dev>` (was the Spanish `notas@`); no release needed, new emails use it at once. Resend needs nothing new: the whole domain is verified.
- Not verified: that a message sent to `notes@` really reaches the owner's inbox (to be tested by the owner from another account) and the SPF/DKIM/DMARC PASS lines of a received note email (Gmail "Show original").

## Note 3 sent to the whole list, 2026-10-06 (owner-requested)
Dry run first (4 confirmed Spanish subscribers had never received a note; pool 94), then `pnpm notify:note vibe-coding-o-especificar-primero --send`: sent to 4, 0 waiting. Counts only in the tracker, no addresses. This was the first send with the English sender `Lab Notes <notes@elvinlab.dev>`.


## Progress 2026-10-06: delivery ledger so a note can never be sent twice (bounded writer, not committed)
- Found in production: `last_note` remembers one slug, so after note 1 went out, note 3 would have been re-sent to the same people. Fix: migration `0003_subscriber_notes.sql` (table `subscriber_notes`, PK `(subscriber_id, slug)`, `ON DELETE CASCADE`, backfill from `last_note`); `listUnnotified` and `countUnnotified` use `NOT EXISTS` on it; `markNotified(ids, slug, now)` inserts the rows and still writes `last_note`. ADR 0014 section, `/privacy` sentence (ES and EN, `privacyUpdated` 2026-10-06), SUBSCRIPTION and CONFIGURATION docs (es/en), changelog `subscriber-notes-ledger`.
- Tests: domain (A,B,A once; order 3,1,2; late confirmer; daily-cap resume; pending and unsubscribed never recorded) and D1 adapter tests over the real migrations 0002 then 0003 (backfill, cascade with `PRAGMA foreign_keys = ON`, bound parameters). Checks: see the coordinator handoff.
- [ ] Owner step 1: apply 0003 to the remote database: `cd apps/web && mise exec -- pnpm exec wrangler d1 migrations apply elvinlab-dev-db --remote` (applies the pending ones only).
- [ ] Owner step 2: after 0003, run once (records that note 3 also reached the four confirmed subscribers and the one who later unsubscribed; the backfill only knows note 1):
  `INSERT OR IGNORE INTO subscriber_notes (subscriber_id, slug, sent_at) SELECT id, 'vibe-coding-o-especificar-primero', COALESCE(confirmed_at, created_at, 0) FROM subscribers WHERE status IN ('confirmed','unsubscribed');`
- [ ] Owner step 3: release (the code that reads the new table must not run before 0003 exists), then a dry run for note 3 must say 0 recipients.
