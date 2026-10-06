# Email subscription

[Español](SUBSCRIPTION.md) · **English**

Guide to the email subscription to new notes: what it is, what it looks like to a reader, how it is built, what data it keeps, how a note is sent and what to do when something fails. The exact setup steps are in [recipe 6.14](CONFIGURATION.en.md#614-email-subscription-to-new-notes-subscribe); the design decision is in [ADR 0014](adr/0014-email-subscription-d1-list-resend-port.md).

## 1. What it is and who it is for

A reader leaves an email in the footer band and gets the new notes and, now and then, an announcement of one of my projects. It is for people who prefer email to RSS.

- **Double opt-in:** subscribing does not put anyone on the list; they must first confirm from a link sent by email.
- **Unsubscribe on a page:** every email carries the link to `/subscribe/unsubscribe/`, with no account and no questions.
- **Nothing is sent automatically:** publishing a note emails nobody. Sending is a manual owner step (section 6).

## 2. What it looks like to a reader

1. **Footer form.** Its code and Turnstile do not load with the page: the script loads on first focus or pointer enter, and Turnstile on first focus.
2. **Confirmation email.** It arrives with a link valid for **48 hours**.
3. **Button on `/subscribe/confirm/`.** The link opens a page with a button; the button is what confirms, so a mail scanner that opens links confirms nobody.
4. **One email per new note**, in the language the reader chose when subscribing.
5. **Unsubscribe on `/subscribe/unsubscribe/`.** Same pattern: the page shows a button and the button unsubscribes.

Where the band shows: in the footer of every page while `features.blog` and `features.subscribe` are on and a Turnstile site key exists. It does **not** show on `/me` (it prints as a CV) or on the `/subscribe/*` pages. The confirmation and unsubscribe pages exist in Spanish and English (`/en/subscribe/...`).

### Link to share

`elvinlab.dev/subscribe` is the link to send to someone (`elvinlab.dev/en/subscribe` in English). It explains what the notes are, carries the same form as the footer and the latest note in that language, and does not show the footer band. It is indexed and in the sitemap; the confirmation and unsubscribe pages stay hidden.


## 3. Architecture in one picture

```
 Footer (shared/subscribe/SubscribeBand.astro + form-client.ts)
        │  Action `subscribe.request`
        ▼
 features/subscribe/subscribe.ts   (domain: validation, rules, no providers)
        │
        ├── SubscriberRepository ──► D1 adapter: tables `subscribers`, `subscriber_notes`, `subscribe_quota`
        ├── SubscribeQuota       ──► D1 adapter (daily confirmation cap)
        ├── SubscriptionMailer   ──► Resend adapter (confirmation and note batches)
        ├── SubscribeVerifier    ──► Turnstile (action `subscribe`)
        └── SubscribeLimiter     ──► SUBSCRIBE_RATE_LIMITER (Cloudflare)
```

| Piece | Where it lives |
| --- | --- |
| Domain and ports | `apps/web/src/features/subscribe/` (`subscribe.ts`, `ports.ts`, `config.ts`) |
| Adapters | `features/subscribe/adapters/` (`d1.ts`, `resend.ts`, `webcrypto.ts`) |
| Browser code (band, form, Turnstile) | `apps/web/src/shared/subscribe/` |
| Emails (HTML and text) | `features/subscribe/email-templates.ts` |
| Confirmation and unsubscribe pages, and the owner endpoint | `apps/web/src/subscribe-routes/`, registered by `integrations/subscribe-routes.ts` only while the flag is on |
| Migrations | `apps/web/migrations/0002_subscribers.sql` and `0003_subscriber_notes.sql` |

**Swapping the mail provider:** write another adapter that implements `SubscriptionMailer` (`sendConfirmation` and `sendNote`) and wire it in the `runtime`. The domain and the database schema do not change; the tests already prove it with a fake mailer.

## 4. Data and privacy

**What is stored** (table `subscribers`, see `migrations/0002_subscribers.sql`):

| Column | Content |
| --- | --- |
| `id` | Random identifier |
| `email` | Address, trimmed and lower-cased (unique) |
| `status` | `pending`, `confirmed` or `unsubscribed` |
| `locale` | `es` or `en`: language of the page where they subscribed |
| `confirm_hash`, `confirm_expires`, `confirm_sent_at` | SHA-256 hash of the confirmation link, its expiry and when it was sent |
| `last_note` | Slug of the last note sent to that person (informational: it no longer decides who gets a note) |
| `created_at`, `confirmed_at`, `unsubscribed_at` | Dates of each step |

The `subscriber_notes` table (migration `0003_subscriber_notes.sql`) keeps which notes were already sent to each person, only so the same note is never sent twice:

| Column | Content |
| --- | --- |
| `subscriber_id` | The subscriber's `id` (`ON DELETE CASCADE`: deleting the person deletes their rows) |
| `slug` | The note that was sent |
| `sent_at` | When the send was recorded (in the initial backfill from `last_note`, the confirmation date) |

The primary key is `(subscriber_id, slug)`: a note cannot be recorded twice for the same person. `last_note` could remember only one note, which is why sending notes out of order produced duplicates; this table decides now.

The `subscribe_quota` table only counts confirmation emails per UTC day; it holds no personal data.

**What is not stored:**

- **The IP.** It only feeds the limiter and Turnstile at that moment.
- **The confirmation token in clear.** Only its hash is stored, and it is cleared on use.
- **Any unsubscribe token.** The unsubscribe link is `id.signature`, where the signature is the HMAC of the `id` with `SUBSCRIBE_TOKEN_SECRET`: nothing is stored per person.
- Logs carry stage names and codes, never an address or a token.

**Retention:**

- `pending` rows older than 7 days are deleted. The purge runs on the next subscription (there is no scheduled job).
- An unsubscribed address stays as a suppression entry (`unsubscribed`) until deletion is requested.

**Deleting one address on request.** The request arrives through `/contact`. The owner, from `apps/web` and logged in with `wrangler login`, runs:

```bash
mise exec -- pnpm exec wrangler d1 execute SITE_DB --remote --command "DELETE FROM subscriber_notes WHERE subscriber_id IN (SELECT id FROM subscribers WHERE email = '<address>'); DELETE FROM subscribers WHERE email = '<address>'"
```

This deletes the person and their delivery records (`subscriber_notes`). The foreign key with `ON DELETE CASCADE` would do the same on its own, but nothing depends on it: the first statement deletes the delivery rows explicitly.

Replace `<address>` by hand with the address **in lower case** (that is how it is stored). The CLI does not use bound parameters: the value goes inside the statement, so copy the exact address and do not include single quotes. In the code, queries do use bound parameters (`?`), never concatenated text.

The [`/privacy`](https://elvinlab.dev/en/privacy/) page describes all of this for subscribers; its subscription section appears only while the flag is on.

## 5. Limits and abuse protection

Values from `apps/web/src/features/subscribe/config.ts` and `wrangler.jsonc`:

| Protection | Value |
| --- | --- |
| Turnstile | Action `subscribe`; fails closed |
| Honeypot | Hidden field that must arrive empty |
| Minimum fill time | 1.5 seconds |
| Rate limiter per IP | 3 per minute (`SUBSCRIBE_RATE_LIMITER`) |
| Confirmation resend | A `pending` address gets no second email within 10 minutes |
| `pending` purge | 7 days |
| Global confirmation cap | 30 a day (UTC) across the whole site |
| Resend free plan | 100 emails a day and 3,000 a month, shared between confirmations and notes |
| Notes per run | What is left of the day's 100 after confirmations |
| Batch per Resend call | 100 |

**When the daily cap is reached:** the form shows a fixed message ("Many requests came in today. Please try again tomorrow.") for any address. The check runs before the list is looked at, so the message reveals nothing about any address.

**Honest limits:**

- A real, throwaway inbox can still subscribe and confirm.
- A distributed attack (many IPs) can still use the day's 30 confirmations. The effect is that nobody new can subscribe that day; notes are not affected because the rest of the pool stays reserved for them.

## 6. Owner runbook, day to day (the manual flow)

Sending is **manual on purpose**: the owner decided to keep it that way while the system is observed. Publishing the note, releasing and running the command are three separate, deliberate steps.

1. **Publish the note** ([`NOTES.en.md`](NOTES.en.md)) and **release** (section 7 of [`CONFIGURATION.en.md`](CONFIGURATION.en.md#7-releasing-and-rolling-back)). The endpoint only sees notes already published in production.
2. **Simulate** (sends nothing, only counts):

   ```bash
   SUBSCRIBE_ADMIN_TOKEN="$(cat ~/.config/elvinlab/subscribe-admin-token)" mise exec -- pnpm notify:note <slug>
   ```

3. **Send** with the same line plus `--send`:

   ```bash
   SUBSCRIBE_ADMIN_TOKEN="$(cat ~/.config/elvinlab/subscribe-admin-token)" mise exec -- pnpm notify:note <slug> --send
   ```

4. **Read the counts.** The simulation says how many recipients are still waiting and how many would go out today. The send says how many went out and how many are still waiting. If `remaining` is greater than 0, run it again the next day: it resumes where it stopped, because the `subscriber_notes` table records who already got that note.
5. **Order does not matter and nothing is duplicated.** You can send older notes, or send in any order, and re-run a command: each person receives each note once. Someone who confirms later receives the note when it is next sent, and nobody else gets it again.

Rules to keep in mind:

- **Language:** a Spanish note goes only to Spanish subscribers; an English note, only to English ones.
- **Only the slug is sent.** Title, summary and link come from the published note, so a leaked token cannot put custom text in front of the list.
- **A draft or unknown slug answers 404.** Release the note first.
- **The token** lives in `~/.config/elvinlab/subscribe-admin-token` on the owner's machine and should also be in a password manager. The command reads it only from the `SUBSCRIBE_ADMIN_TOKEN` environment variable (never an argument) and never prints it. The site URL must be `https`.
- **Rotating it:** generate a new one with `openssl rand -base64 48`, run `mise exec -- pnpm exec wrangler secret put SUBSCRIBE_ADMIN_TOKEN` (from `apps/web`) and update the local file and the password manager.

## 7. One-time setup (what was done and how to repeat it for a fork)

The exact commands are in [recipe 6.14](CONFIGURATION.en.md#614-email-subscription-to-new-notes-subscribe); this is only the map:

1. Apply the migrations `0002_subscribers.sql` and `0003_subscriber_notes.sql` to the real D1 database (one command: it applies the pending ones).
2. Create the Worker secrets `SUBSCRIBE_FROM`, `SUBSCRIBE_TOKEN_SECRET` and `SUBSCRIBE_ADMIN_TOKEN`.
3. The `SUBSCRIBE_RATE_LIMITER` binding is already declared in `wrangler.jsonc`.
4. Verify the sending domain in Resend (SPF and DKIM).
5. Have the Turnstile site key (recipe 6.6).
6. Turn on `features.subscribe: true` and release.

**For a fork:** the site is white-label. The flag ships **off** and nothing owner-specific is hard-coded: name, URL and sender come from configuration and secrets. With the flag off, the pages, the endpoint and the privacy section do not exist.

## 8. The emails

- **HTML plus plain text**, with a table layout, which is what email clients support.
- **System fonts.** Clients do not load web fonts, so neither Space Grotesk nor Press Start 2P appear.
- **Light by default, with a dark override** (`prefers-color-scheme: dark`) for clients that honor it.
- **Logo** at `/email/logo.png`, served from the site itself.
- **Local preview without sending anything:** `mise exec -- node --import ./apps/web/scripts/register-alias.mjs apps/web/scripts/preview-email.ts` writes the HTML and text files with sample data into the git-ignored `.email-preview/` folder. Details in [`TESTING.md`](TESTING.md#email-previews).
- **Check real clients** with a throwaway address you own: Gmail ignores dark mode and every client renders differently.

> **Promotions:** Gmail often files newsletters in the Promotions tab even when they are not spam. The confirmation email and the "subscription confirmed" page say so and ask the reader to drag the email to Primary; that is what teaches Gmail to deliver the next notes to the main inbox.


## 9. How it was verified and how to test it yourself

- **Unit tests with fakes** (`features/subscribe/*.test.ts`, `shared/subscribe/*.test.ts`): domain rules, adapters, templates and the owner command. The D1 adapter test applies the real migration to in-memory SQLite.
- **E2E spec** `tests/browser/subscribe.spec.ts`: the band, lazy loading, error states, the confirmation and unsubscribe pages, and axe accessibility in light and dark themes.
- **Manual end-to-end test**, with an address you own: subscribe from the footer, open the email and confirm, send yourself a note with the command from section 6 (simulate, then `--send`) and unsubscribe from that email.
- **Never test with someone else's address.**

## 10. Troubleshooting

| Symptom | Likely cause | What to check |
| --- | --- | --- |
| The form says "not available" | A missing secret or binding | Cloudflare logs (names only): `SUBSCRIBE_FROM`, `SUBSCRIBE_TOKEN_SECRET`, `SITE_DB`, `SUBSCRIBE_RATE_LIMITER`, the Resend and Turnstile secrets |
| "Many requests came in today" | The 30 confirmations of the day were used | Wait for the next UTC day |
| No confirmation email | Resend domain not verified or wrong `SUBSCRIBE_FROM` | The Resend panel and the secret; also check spam |
| The endpoint or command answers 401 | Wrong token | That the variable matches the Worker secret |
| 429 | Rate limiter (3 per minute) | Wait a minute; the form shows "Too many attempts in a row" |
| The confirmation link says "already used, replaced by a newer one, or expired" | Each link works once, and if the person subscribes again after 10 minutes a new one is sent and the old one stops working; or they already confirmed | If they already confirmed there is nothing else to do; if not, use the link of the newest email or subscribe again from the footer |
| The form stays on "Verifying…" | An interactive Turnstile challenge the reader did not see, or an extension that blocks it | The form now says "Tick the box below" when the checkbox appears and, after 25 s without a token, asks to retry or turn off blockers, and offers to write from the Contact page so the owner adds the person by hand |
| An error with a code in parentheses, for example "(code 600010)" | The Turnstile error code | `110200`: domain not allowed for the site key (Turnstile widget settings). `600010`: the challenge failed or was blocked (extension, network, bot score) |
| 503 on the endpoint | `SUBSCRIBE_ADMIN_TOKEN` is missing on the Worker, or a binding fails | `wrangler secret list` and the logs. With the flag off the route does not exist (404) |
| 404 when sending | Draft or unpublished slug | Release the note and check the slug |
| The note reached nobody | Every subscriber already has a `subscriber_notes` row for that slug (they were already sent it), or the language does not match, or migration `0003` was not applied | The simulation: `recipients` counts only who is still missing, in the same language |
| 502 | Resend refused a batch | Nothing in that batch was marked as sent: run the command again |

## 11. Decisions and where they are recorded

- [ADR 0014](adr/0014-email-subscription-d1-list-resend-port.md): list in D1, mail provider behind a port, own list through the batch API instead of Resend broadcasts, one-click POST dropped because of `checkOrigin`, global confirmation cap and owner trigger.
- [`BRAND.md`](BRAND.md): row "Banda de suscripción" (look of the band; Spanish).
- [`odd/tasks/subscribe.md`](../odd/tasks/subscribe.md): task history and owner steps.
