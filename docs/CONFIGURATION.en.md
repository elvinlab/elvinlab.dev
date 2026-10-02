# Configuration and update guide

[Español](CONFIGURATION.md) · **English**

This guide answers two questions in one place: **where each thing is configured** and **how everything is updated** (content, settings, secrets, dependencies and releases). The reference tables are **generated from the code** (`pnpm docs:config`) and a test fails if they drift, so what you read here is what the site really validates.

- [1. The map: what to change and where](#1-the-map-what-to-change-and-where)
- [2. How configuration is designed](#2-how-configuration-is-designed)
- [3. Reference: `site.config.ts`](#3-reference-siteconfigts)
- [4. Reference: content (`src/content/`)](#4-reference-content-srccontent)
- [5. Reference: environment variables and secrets](#5-reference-environment-variables-and-secrets)
- [6. How to update each thing (recipes)](#6-how-to-update-each-thing-recipes)
- [7. Releasing and rolling back](#7-releasing-and-rolling-back)
- [8. Checking that everything is fine](#8-checking-that-everything-is-fine)
- [9. Common problems](#9-common-problems)
- [10. Using this site as a base for someone else (white-label)](#10-using-this-site-as-a-base-for-someone-else-white-label)

To write notes, see the separate guide: [How to create a note](NOTES.en.md).

## 1. The map: what to change and where

| I want to change... | Where | How it is validated |
| --- | --- | --- |
| Name, bio, role, links, languages, active features, comments, analytics, legal dates | [`apps/web/src/site.config.ts`](../apps/web/src/site.config.ts) | At build time: an invalid value breaks the build and lists every problem |
| Notes (the blog) | `apps/web/src/content/notes/<slug>/index.mdx` (drafts in `drafts/`) | The note schema (see [the notes guide](NOTES.en.md)) |
| Experience, certificates, experiments, changelog | `apps/web/src/content/*.json` | One schema per file (section 4) |
| Theme colors, radii and fonts | `packages/core/src/tokens/tokens.json` | Regenerate with `pnpm --filter @elvinlab/core tokens` |
| UI texts (ES/EN) | `apps/web/src/shared/i18n/index.ts` | Types require the same keys in both languages |
| Privacy and terms text | `apps/web/src/features/privacy/content.ts` and `.../terms/content.ts` | Content tests (no emails, no unverifiable promises) |
| Photo, favicon, default share image | `apps/web/public/` | See recipe 6.9 |
| Contact form secrets | Cloudflare (Worker) and `.dev.vars` locally | Section 5 |
| How it builds and deploys | `.github/workflows/ci.yml`, `apps/web/wrangler.jsonc`, `apps/web/astro.config.ts` | The CI itself |
| Node and pnpm versions | `.mise.toml` (and `packageManager` in `package.json`, which must match) | `mise install` |
| Quality budgets | `lighthouserc.json` and `apps/web/scripts/performance-budget.ts` | The CI fails if they are not met |

## 2. How configuration is designed

There are **four places** and each thing lives in exactly one:

1. **`site.config.ts` — the site settings.** The only settings file: identity, features, public third-party ids and legal dates. It is typed and validated (`apps/web/src/shared/config/schema.ts`), and every field is described in the schema itself.
2. **`src/content/` — the content.** Lists that grow (notes, experience, certificates, experiments, changelog). They are kept out of the settings file on purpose: they would bloat it and mix "what the site is" with "what it publishes".
3. **Secrets — Cloudflare.** API keys and email addresses are **never** written in the repository (it is public). In production they are Worker secrets; locally, the `.dev.vars` file (git-ignored).
4. **Tool files.** `astro.config.ts`, `wrangler.jsonc`, the workflows, `biome.json`, `.mise.toml`: tools read them in place, which is why they cannot move into `site.config.ts`.

Two rules that avoid surprises:

- **An environment variable can override a public id** (`PUBLIC_CF_ANALYTICS_TOKEN`, `PUBLIC_TURNSTILE_SITE_KEY`). If it is empty, `site.config.ts` wins. Mostly useful locally (section 6.6).
- **Everything the code reads from the environment is registered** in [`apps/web/src/shared/config/env-vars.ts`](../apps/web/src/shared/config/env-vars.ts). A test fails if the code reads a variable that is not there. That list feeds the table in section 5 and the `.env.example` and `.dev.vars.example` files.

## 3. Reference: `site.config.ts`

The descriptions come from the schema (`.describe()`), which is why they are in English. "Required: no" means optional or defaulted.

<!-- docs:start site-config -->
| Key | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| `url` | `URL` | yes |  | Canonical origin of the site (https). Used for canonical links, the sitemap and share images. |
| `title` | `string` | yes |  | Site name: browser tab suffix, Open Graph site name and footer. |
| `description` | `{ <locale>: string }` | yes |  | Default meta description per locale (shown in search results and link previews). |
| `locales` | `object` | yes |  | Languages of the site. |
| `locales.default` | `string` | yes |  | Default locale, served without a URL prefix (for example `es` at `/`). |
| `locales.supported` | `string[]` | yes |  | Every locale the UI is translated into; non-default ones live under `/<locale>/`. |
| `identity` | `object` | yes |  | Who the site is about. |
| `identity.name` | `string` | yes |  | Full name of the site owner. |
| `identity.handle` | `string` | yes |  | Short lowercase handle shown in the navbar and footer wordmark. |
| `identity.role` | `{ <locale>: string }` | yes |  | One-line professional headline per locale. |
| `identity.bio` | `{ <locale>: string }` | yes |  | Short bio per locale (also the description of the /me page). |
| `identity.location` | `string` | no |  | City or country shown on /me and share cards. |
| `identity.startedYear` | `integer (min 1970)` | yes |  | First year of professional work; years of experience are derived from it. |
| `identity.avatar` | `string` | no |  | File name of a profile photo placed in `apps/web/src/assets/` (for example `avatar.png`); it is optimized at build time. Omit to show initials. |
| `appearance` | `'minimal' \| 'full'` | no | `full` | Visual preset. `minimal` is the calm look (smaller type, fewer home sections); `full` is the original look. Defaults to `full` so a config written before the preset existed does not change. |
| `home` | `object` | no | `{}` | Show or hide each home section; a key you set wins over the `appearance` preset, a key you omit follows it. `minimal` hides `heroPills`, `labLog` and `pillars`; `full` shows everything. A hidden section renders nothing. |
| `home.heroPills` | `boolean` | no |  | The three keyword pills under the hero intro (desktop only). |
| `home.authorCard` | `boolean` | no |  | The sidebar author card: photo, name, bio and social buttons. |
| `home.hiringCard` | `boolean` | no |  | The sidebar "Hiring?" recruiter card: availability and links to /me and the CV. |
| `home.labLog` | `boolean` | no |  | The sidebar "Lab log" box: since when, cadence and languages. |
| `home.pillars` | `boolean` | no |  | The four pillars strip at the bottom of the home (desktop only). |
| `home.notebookIndex` | `boolean` | no |  | The notebook index: compact rows for the notes after the latest one. |
| `home.experiments` | `boolean` | no |  | The experiments section of the home. Also needs `features.experiments`: with that flag off it never shows. |
| `socials` | `object[]` | yes |  | Social profile links shown in the footer and used as `sameAs` in structured data. |
| `socials[].label` | `string` | yes |  | Link text and accessible name. |
| `socials[].url` | `URL` | yes |  | Profile URL (https only: an email address never belongs in public config). |
| `socials[].icon` | `string` | yes |  | Icon name (`github`, `linkedin`, ...). |
| `background` | `object` | no | `{"galaxy":true,"cursorWaves":false}` | Default animated banner background (each visitor can change it). All effects read the theme palette. |
| `background.galaxy` | `boolean` | yes |  | Nebula clouds and a twinkling star field. |
| `background.cursorWaves` | `boolean` | yes |  | Slow colour waves with a ripple that follows the pointer. |
| `recruiter` | `object` | yes |  | Recruiter card on the home page and /me. |
| `recruiter.available` | `boolean` | yes |  | Show or hide the whole availability line (not whether you are open to work). |
| `recruiter.openToWork` | `boolean` | no | `true` | Whether you are open to work: green status dot when true, the brand accent colour when false. |
| `recruiter.status` | `{ <locale>: string }` | yes |  | Availability text per locale. Parts separated by " · " show as a headline plus short tags on the home card (for example "Working at Buo · open to chat"); a single part is one tag (for example "Open to work"). |
| `recruiter.lookingFor` | `{ <locale>: string }` | yes |  | What you are looking for, per locale. |
| `recruiter.cvUrl` | `URL` | no |  | Link to a downloadable CV (https). Omit to hide the CV button. |
| `me` | `object` | yes |  | Singular /me profile data. Lists that grow (experience, certificates) live in `src/content/`. |
| `me.timezone` | `string` | yes |  | Display timezone, for example `UTC−6`. |
| `me.workMode` | `{ <locale>: string }` | yes |  | Work mode per locale (remote, hybrid, ...). |
| `me.intro` | `{ <locale>: string }` | yes |  | The "what I bring" intro paragraph per locale. |
| `me.facts` | `object[]` | yes |  | At-a-glance strip: value and label pairs (the design shows up to four). |
| `me.facts[].value` | `{ <locale>: string }` | yes |  | The highlighted value. |
| `me.facts[].label` | `{ <locale>: string }` | yes |  | What the value means. |
| `me.strengths` | `object[]` | yes |  | "What I bring" tiles. |
| `me.strengths[].icon` | `string` | yes |  | Icon name of the tile. |
| `me.strengths[].title` | `{ <locale>: string }` | yes |  | Tile title. |
| `me.strengths[].body` | `{ <locale>: string }` | yes |  | Tile text. |
| `me.stack` | `object[]` | yes |  | Tech stack groups. |
| `me.stack[].label` | `{ <locale>: string }` | yes |  | Group name (Languages, Frontend, ...). |
| `me.stack[].items` | `string[]` | yes |  | Tools in the group. |
| `features` | `object` | yes |  | Feature flags: off means the routes are not generated and the nav entry is hidden. |
| `features.blog` | `boolean` | yes |  | Lab Notes: the notes index, note pages, RSS and the nav entry. |
| `features.comments` | `boolean` | yes |  | Giscus comments on notes. Needs the `giscus` block below, otherwise nothing renders. |
| `features.contact` | `boolean` | yes |  | The /contact form and its nav entry. |
| `features.credentials` | `boolean` | yes |  | Certificates and degrees on /me. |
| `features.experiments` | `boolean` | yes |  | The experiments (projects) section and its pages. |
| `features.changelog` | `boolean` | yes |  | Visitor-facing /changelog page: off hides the footer link, marks it noindex and keeps it out of the sitemap. |
| `features.me` | `boolean` | yes |  | The /me recruiter page: off hides it from the nav, marks it noindex and keeps it out of the sitemap. |
| `features.readingMode` | `boolean` | yes |  | Reading mode on notes: off renders no toggle, loads no script or CSS and stores nothing in the browser. |
| `integrations` | `object` | no | `{}` | Public ids of third-party services. They ship in the HTML by design, so they live here and not in secrets. |
| `integrations.cloudflareAnalyticsToken` | `string` | no |  | Cloudflare Web Analytics beacon token (public). Omit to turn analytics off. Env `PUBLIC_CF_ANALYTICS_TOKEN` overrides it. |
| `integrations.turnstileSiteKey` | `string` | no |  | Cloudflare Turnstile public site key for the contact form, bound to the domain. Env `PUBLIC_TURNSTILE_SITE_KEY` overrides it (use a test key locally). |
| `legal` | `object` | yes |  | Dates shown at the bottom of the legal pages. |
| `legal.privacyUpdated` | `date (YYYY-MM-DD)` | yes |  | "Last updated" date of the privacy page. Bump it when its text changes. |
| `legal.termsUpdated` | `date (YYYY-MM-DD)` | yes |  | "Last updated" date of the terms page. Bump it when its text changes. |
| `giscus` | `object` | no |  | Giscus comments (GitHub Discussions). Optional: without it nothing renders even when `features.comments` is on. |
| `giscus.repo` | `string` | yes |  | Repository whose Discussions store the comments, as `owner/name`. |
| `giscus.repoId` | `string` | yes |  | Repository node id from https://giscus.app (starts with `R_`). |
| `giscus.category` | `string` | yes |  | Discussion category name (an Announcements-type category). |
| `giscus.categoryId` | `string` | yes |  | Category node id from https://giscus.app (starts with `DIC_`). |
| `notice` | `{ <locale>: string }` | no |  | Optional site-wide notice strip per locale (for example "under construction"). Remove the key to hide it. |
<!-- docs:end site-config -->

## 4. Reference: content (`src/content/`)

The four JSON files are **objects with one key per entry**; the key is the identifier (lowercase, with hyphens). File order does not matter: each page sorts in its own way.

### Experience — `experience.json`

Shown in the `/me` timeline. If you omit `end`, it is the current job.

```json
{
  "my-company": {
    "role": "Full Stack Developer",
    "company": "My company",
    "start": 2024,
    "summary": "One honest line about what you do.",
    "tags": ["typescript", "cloudflare"]
  }
}
```

<!-- docs:start experience -->
| Key | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| `role` | `string (max 80)` | yes |  | Job title (max 80 characters). |
| `company` | `string (max 80)` | yes |  | Company or client (max 80 characters). |
| `start` | `integer (min 1970)` | yes |  | Year the role started. |
| `end` | `integer (min 1970)` | no |  | Year the role ended. Omit for the current role (drawn with a solid dot). |
| `location` | `string (max 80)` | no |  | Where the role was based (max 80 characters). |
| `summary` | `string (max 280)` | yes |  | One truthful summary line, no bullets (max 280 characters). |
| `tags` | `string[] (max 5)` | no | `[]` | Up to five kebab-case tags. |
<!-- docs:end experience -->

### Certificates and degrees — `credentials.json`

Grouped by year, newest first. Only shown when `features.credentials` is on.

```json
{
  "national-university": {
    "title": "Engineering, Computer Programming",
    "issuer": "National University",
    "kind": "degree",
    "year": 2021
  }
}
```

<!-- docs:start credentials -->
| Key | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| `title` | `string (max 120)` | yes |  | Name of the certificate or degree (max 120 characters). |
| `issuer` | `string (max 80)` | yes |  | Who issued it (max 80 characters). |
| `kind` | `'degree' \| 'certificate'` | yes |  | Whether it is a degree or a certificate. |
| `year` | `integer (min 1970)` | yes |  | Year obtained; certificates are grouped by year, newest first. |
| `month` | `integer (min 1, max 12)` | no |  | Optional month (1-12) to order items within a year. |
| `url` | `URL` | no |  | Verification link (https only). |
| `credentialId` | `string` | no |  | Credential id in kebab-case, if the issuer gives one. |
<!-- docs:end credentials -->

### Experiments — `experiments.json`

Portfolio projects. **Only link public repositories**; for private work leave `url` out.

```json
{
  "agentic-dev-setup": {
    "title": "agentic-dev-setup",
    "description": "Multi-agent development environment.",
    "tags": ["ai-agents", "tooling"],
    "year": 2026,
    "url": "https://github.com/elvinlab/agentic-dev-setup",
    "featured": true
  }
}
```

<!-- docs:start experiments -->
| Key | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| `title` | `string (max 80)` | yes |  | Project name (max 80 characters). |
| `description` | `string (max 200)` | yes |  | What it is, in one or two sentences (max 200 characters). |
| `tags` | `string[] (max 5)` | no | `[]` | Up to five kebab-case tags. |
| `year` | `integer (min 2000)` | yes |  | Year the project started or shipped. |
| `status` | `'running' \| 'shipped'` | no | `shipped` | `running` shows a green dot; `shipped` a violet one. |
| `url` | `URL` | no |  | Public link (https only). Leave it out for private work: a private repository is never linked. |
| `featured` | `boolean` | no | `false` | Featured projects lead the home strip. |
<!-- docs:end experiments -->

### Changelog — `changelog.json`

The public `/changelog` page. One entry per change **a visitor would notice**, with a date and a category; write it in plain words.

```json
{
  "reading-mode": {
    "date": "2026-10-01",
    "category": "added",
    "title": "Reading mode for notes",
    "description": "A button on every note switches to a calm single column."
  }
}
```

<!-- docs:start changelog -->
| Key | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| `date` | `date (YYYY-MM-DD)` | yes |  | Day the change shipped to production. |
| `category` | `'added' \| 'changed' \| 'fixed' \| 'removed' \| 'security' \| 'deprecated'` | yes |  | Keep-a-Changelog category. |
| `title` | `string (max 120)` | yes |  | What a visitor would notice, in plain words (max 120 characters). |
| `description` | `string (max 500)` | no |  | One or two sentences of detail (max 500 characters). |
<!-- docs:end changelog -->

## 5. Reference: environment variables and secrets

Four scopes: **build** (read while building), **Worker** (in production, at runtime), **CI** (GitHub Actions) and **local** (tooling only). Secret values never go in the repository.

<!-- docs:start env-vars -->
| Name | Where | Secret | Required | Description | Set it in |
| --- | --- | --- | --- | --- | --- |
| `SITE_INDEXABLE` | build | no | no | Exactly `true` on production builds lets search engines index the site. Anything else adds noindex (header, meta tag and robots.txt), so previews and local builds are never indexed. | CI deploy step (`.github/workflows/ci.yml`); leave unset locally |
| `PUBLIC_CF_ANALYTICS_TOKEN` | build | no | no | Overrides `integrations.cloudflareAnalyticsToken`. Public by design: the token ships in the HTML. Normally leave it unset and edit the config. | optional override: `.env` locally or a GitHub environment variable |
| `PUBLIC_TURNSTILE_SITE_KEY` | build | no | no | Overrides `integrations.turnstileSiteKey`. Use it locally: a production key is bound to the domain and fails on localhost, so put a Cloudflare test key here. | optional override: `.env` locally or a GitHub environment variable |
| `RESEND_API_KEY` | Worker (runtime) | yes | yes | Resend API key used to send the contact notification email. | Cloudflare Worker secret (`wrangler secret put`); `.dev.vars` locally |
| `CONTACT_FROM` | Worker (runtime) | yes | yes | Sender address of the notification email, on a domain verified in Resend. An address is never written in tracked files. | Cloudflare Worker secret; `.dev.vars` locally |
| `CONTACT_TO` | Worker (runtime) | yes | yes | Inbox that receives contact messages. Never written in tracked files; the site only exposes the /contact form. | Cloudflare Worker secret; `.dev.vars` locally |
| `TURNSTILE_SECRET_KEY` | Worker (runtime) | yes | yes | Cloudflare Turnstile secret key that verifies the anti-bot token server side. | Cloudflare Worker secret; `.dev.vars` locally (use the Cloudflare test secret) |
| `TURNSTILE_HOSTNAME` | Worker (runtime) | no | yes | Hostname Turnstile must report for a valid token (for example the production domain). It makes a token from another site invalid. | Cloudflare Worker variable; `.dev.vars` locally (`localhost`) |
| `CLOUDFLARE_API_TOKEN` | CI | yes | yes | Cloudflare API token with permission to deploy the Worker; used only by the deploy job. | GitHub environment secret (`production`) |
| `CLOUDFLARE_ACCOUNT_ID` | CI | no | yes | Cloudflare account id the deploy job targets. Not a secret, but not needed anywhere else. | GitHub repository variable |
| `DEV_CHECK_STRIP_DEPS` | local tooling | no | no | Set to `1` to run `pnpm check:dev-cold-start` as its own negative control: it removes the pre-optimized dependencies first and must then fail. | the shell, only when running that check |
| `FIXTURE_APPEARANCE` | local tooling | no | no | Set to `minimal` or `full` to build the browser-test fixture with that appearance preset instead of the one in `site.config.ts` (only the temporary copy changes). Any other value fails the run. | the shell, only when running `pnpm test:e2e` (for example to verify the `minimal` preset) |
<!-- docs:end env-vars -->

### Example files

- [`apps/web/.dev.vars.example`](../apps/web/.dev.vars.example): Worker variables for local development. Copy it to `apps/web/.dev.vars` (git-ignored).
- [`apps/web/.env.example`](../apps/web/.env.example): optional build variables. Copy it to `apps/web/.env` (git-ignored) only if you need an override.

Both are generated from the registry; **do not edit them by hand**. Contents of `.dev.vars.example`:

<!-- docs:start dev-vars-example -->
```ini
# Local Worker variables for `pnpm --filter web dev`. Copy to `.dev.vars` (git-ignored) and fill in.
# Generated from ENV_VARS by `pnpm docs:config`: edit src/shared/config/env-vars.ts, not this file.
# Never commit real values; in production these are Cloudflare Worker secrets.

# Resend API key used to send the contact notification email.
RESEND_API_KEY=

# Sender address of the notification email, on a domain verified in Resend. An address is never written in tracked files.
CONTACT_FROM=

# Inbox that receives contact messages. Never written in tracked files; the site only exposes the /contact form.
CONTACT_TO=

# Cloudflare Turnstile secret key that verifies the anti-bot token server side.
TURNSTILE_SECRET_KEY=

# Hostname Turnstile must report for a valid token (for example the production domain). It makes a token from another site invalid.
TURNSTILE_HOSTNAME=
```
<!-- docs:end dev-vars-example -->

To try the form locally without real Cloudflare, Turnstile provides [test keys](https://developers.cloudflare.com/turnstile/troubleshooting/testing/): the site key `1x00000000000000000000AA` (always passes) in `PUBLIC_TURNSTILE_SITE_KEY` and the secret `1x0000000000000000000000000000000AA` (always passes) in `TURNSTILE_SECRET_KEY`, with `TURNSTILE_HOSTNAME=localhost`. Without them the form fails closed and shows the "unavailable" state.

## 6. How to update each thing (recipes)

After **any** change: `mise exec -- pnpm test && mise exec -- pnpm typecheck && mise exec -- pnpm lint` (section 8 for the full list).

### 6.1 Identity, bio and links

Edit `identity`, `description`, `socials` and `me` in `site.config.ts`. The "per locale" texts need **every** locale in `locales.supported`; if one is missing, the build says so. Social links are `https://` only (an email never goes in public config: contact goes through `/contact`).

### 6.2 Turning features on or off

Each `features` flag switches the whole feature off: the route is not generated, the menu link disappears and, where relevant, the page becomes `noindex` and leaves the sitemap.

| Flag | What it controls | Notes |
| --- | --- | --- |
| `blog` | Notes index, notes and RSS | With no published notes, the menu hides "Notes" and the feed |
| `comments` | Comments and reactions (Giscus) | Needs the `giscus` block; see 6.5 |
| `contact` | The `/contact` form | Needs the Worker secrets; without them it fails closed |
| `credentials` | Certificates on `/me` | |
| `experiments` | Experiments section and pages | |
| `changelog` | The `/changelog` page and its link | |
| `me` | The `/me` page (portfolio) | |
| `readingMode` | Reading mode on notes | Off: no button, script or CSS ships and nothing is stored in the browser |

#### Appearance and home sections

`appearance` picks the visual preset: `minimal` hides the hero pills (`heroPills`), the "Lab log" box (`labLog`) and the pillars strip (`pillars`) on the home page; `full` (this site's choice since 2026-10-02) is the original look and shows everything. If you omit `appearance` it is `full`, so a config written before the preset existed does not change.

**Type scale.** `appearance` also sets the text size: it lands on `<html data-appearance>` and `apps/web/src/styles/type-scale.css` defines the scale once (`--type-*` variables), so a fork changes it by editing that file. `minimal`: hero 32/44 px (phone/`md`), section titles 20, note title 30/40, featured card 20/22, body and intro paragraph 17. `full` keeps the original sizes (hero 36/60 px, sections 24, note title 36/48, featured card 30/36, body 18). Reading mode has its own scale and does not change.

**Banners and notes.** The same preset lowers the banner heights (in `minimal`: 240 px on pages, expanded home between 360 and 460 px), makes every banner blend into the page through a 120 px gradient and, on notes, keeps only the date and reading time in the header (language and author move to the foot) with a more compact decision record. `full` keeps the original heights and header. Those values live in `apps/web/src/styles/calm-layout.css`.

`home` tunes each section on its own and **always wins over the preset**: a key you set rules, a key you omit follows the preset. Keys: `heroPills`, `authorCard`, `hiringCard`, `labLog`, `pillars`, `notebookIndex` and `experiments` (which also needs `features.experiments`). A section that is off renders nothing (no heading, no gap), and when all three sidebar cards (`authorCard`, `hiringCard`, `labLog`) are off the sidebar column disappears.

```ts
// Calm look, but keep the Lab log and drop the hiring card.
appearance: 'minimal',
home: { labLog: true, hiringCard: false },
```

### 6.3 Experience, certificates and experiments

Add an entry to the matching JSON (section 4) with a new key. To remove one, delete it. Build (`pnpm --filter web build`) to validate: an invalid field breaks the build and names the field.

### 6.4 Changelog

Add an entry **per visible change** when you release (today's date, the right category). Do not announce something that is not in production yet.

### 6.5 Comments (Giscus)

1. On GitHub: *Settings → Features → Discussions* (enable) and, if you like, use the *Announcements* category.
2. Install the app: <https://github.com/apps/giscus> (on the repository only).
3. Copy `repo`, `repoId`, `category` and `categoryId` (from <https://giscus.app>, or with `gh api graphql` reading `repository { id discussionCategories { nodes { id name } } }`) into the `giscus` block of `site.config.ts` and keep `features.comments: true`.
4. Check the app is installed: `curl "https://giscus.app/api/discussions?repo=OWNER/REPO&term=probe&category=CATEGORY&strict=true&last=1"` answers `Discussion not found` when all is well and `giscus is not installed on this repository` when you still need to install it.

To turn comments off: `features.comments: false` (or delete the `giscus` block). Each note uses its path as the thread, so every language has its own conversation.

### 6.6 Analytics and Turnstile

Change `integrations.cloudflareAnalyticsToken` or `integrations.turnstileSiteKey` in `site.config.ts` (omitting the key turns analytics off). They are public by design: they ship in the HTML. Locally, the production site key **does not work** (it is bound to the domain): use the test key from section 5 through `PUBLIC_TURNSTILE_SITE_KEY` in `apps/web/.env`; the variable takes priority over the config.

### 6.7 Contact form: setting and rotating secrets

The secrets are `RESEND_API_KEY`, `CONTACT_FROM`, `CONTACT_TO`, `TURNSTILE_SECRET_KEY` and `TURNSTILE_HOSTNAME` (table in section 5).

- **Production** — from `apps/web`: `pnpm exec wrangler secret put NAME` (it asks for the value). You can also manage them in the Cloudflare dashboard: *Workers & Pages → your Worker → Settings → Variables and Secrets*. When you set a secret, Cloudflare deploys a new Worker version that includes it by itself; no site release is needed.
- **Rotating a key**: create the new one at the provider (Resend or Turnstile), set it with `wrangler secret put` and revoke the old one.
- **Locally** — copy `.dev.vars.example` to `.dev.vars`.
- If any variable is missing or invalid, the form **fails closed** (it shows "unavailable") and the Worker logs only the rejected **names**, never the values. Watch it with `pnpm exec wrangler tail`.
- The send limit (3 per minute) lives in `wrangler.jsonc` (`ratelimits`).

### 6.8 Legal pages

The text lives in `apps/web/src/features/privacy/content.ts` and `apps/web/src/features/terms/content.ts` (ES and EN; the owner, domain and links come from the config). Two project rules: **only verifiable things are stated** (if a provider does not document something, the page does not promise it) and it is not legal advice. When you change a text, bump the matching date in `legal` in `site.config.ts`.

### 6.9 Colors, typography, photo and images

- **Theme**: `packages/core/src/tokens/tokens.json`, then `mise exec -- pnpm --filter @elvinlab/core tokens` (regenerates `tokens.css`). Components read semantic variables, never a raw color.
- **Profile photo**: put the file in `apps/web/src/assets/` and write only its file name in `identity.avatar` (for example `avatar.png`; png, jpg, webp or avif). It is optimized at build time (webp with explicit dimensions) and used on the home page, on `/me` and on the `/me` card. A missing file fails the build.
- **Favicon**: `apps/web/public/favicon.svg`.
- **Default share image**: `apps/web/public/og-image.png` (1200 × 630). It is a static file with the person's name drawn on it: **replace it** if you use the site for someone else. Notes and `/me` generate their own card at build time.
- **Fonts**: self-hosted (Fontsource); never loaded from a CDN. The pixel display face (Pixelify Sans) is the `pixel` font token in `tokens.json`; a theme can replace it.

### 6.10 UI texts and a new language

UI texts are in `apps/web/src/shared/i18n/index.ts`. Adding a third language means: adding it to `locales.supported`, a full dictionary in `i18n` and **its own page tree** in `apps/web/src/pages/<language>/` (each language's pages are explicit today, not dynamic), plus the translated content.

### 6.11 Updating dependencies and tools

- **Dependabot** opens weekly PRs against `develop` (it groups minors and patches; GitHub Actions updates are separate). Review them, run the list in section 8 and merge. A major `typescript` update is ignored on purpose (`@astrojs/check` does not support it yet).
- If pnpm proposes `minimumReleaseAgeExclude` exceptions, **do not accept them**: pin an older version.
- After updating `astro`, `preact` or their integrations, run `pnpm check:dev-cold-start` (it catches blank pages in `astro dev`; if it fails, add the dependency it reports to `vite.optimizeDeps.include` in `astro.config.ts`).
- **Node and pnpm**: change the version in `.mise.toml` and the `packageManager` field of `package.json` (they must match), then `mise install`.

### 6.12 Quality budgets

- Mobile Lighthouse (≥ 95 in the four categories, LCP ≤ 2.5 s, CLS ≤ 0.1): `lighthouserc.json`.
- JavaScript per page (30 KiB gzip): `apps/web/scripts/performance-budget.ts`.
- A budget is never raised to "make a change pass": the change gets fixed.

## 7. Releasing and rolling back

The full flow is decided in ADRs [0011](adr/0011-ci-gate-once-at-main-pr-no-staging.md) and [0012](adr/0012-direct-push-to-main-no-pr-gate.md). In short:

- **Day to day**: work on `develop` and push freely; no CI runs.
- **Release**: what is on `develop` goes to `main`. That push is the **only** thing that triggers the CI (`static`, `e2e` and `lighthouse` in parallel → `checks` → `deploy`). The deploy goes straight to production and is checked with `.github/scripts/smoke-check.sh`, with an automatic rollback if it fails.

```bash
git fetch origin
git checkout main && git merge --ff-only develop && git push origin main
git checkout develop
```

The `main` rules require a **linear history** (no merge commits). If `main` and `develop` diverged (for example a PR merged with *squash*), a fast-forward is not possible; publish a single commit with `develop`'s tree:

```bash
git fetch origin
SHA=$(git commit-tree develop^{tree} -p origin/main -m "chore(release): release summary")
git checkout main && git reset --hard origin/main && git merge --ff-only "$SHA" && git push origin main
git checkout develop
```

**After releasing:**

1. Watch the run in GitHub Actions (`gh run list --branch main --limit 1`). If a job fails, there is **no deploy** and production keeps the previous version.
2. Check it live: `curl -s https://YOUR-DOMAIN/version.txt` must show the new commit, and open the pages you changed.
3. If you shared new links, refresh the cached previews: [Facebook Sharing Debugger](https://developers.facebook.com/tools/debug/) and [LinkedIn Post Inspector](https://www.linkedin.com/post-inspector/).

**Rolling back a release**: the simplest way is `git revert` of the release commit on `develop` and releasing again (so the history tells what happened). Cloudflare also keeps earlier Worker versions, which `pnpm exec wrangler rollback` (from `apps/web`) can restore while you fix things.

Production is a single environment (no staging and no per-PR previews). The GitHub `production` environment variables are no longer needed for the public ids (they are in `site.config.ts`); `CLOUDFLARE_API_TOKEN` (secret) and `CLOUDFLARE_ACCOUNT_ID` are still required.

## 8. Checking that everything is fine

```bash
mise exec -- pnpm install            # dependencies
mise exec -- pnpm test               # unit tests
mise exec -- pnpm typecheck          # types (Astro + TypeScript)
mise exec -- pnpm lint               # Biome (format and lint)
mise exec -- pnpm depcruise          # architecture boundaries
mise exec -- pnpm test:e2e           # browser: smoke, a11y, theme, comments, reading mode
mise exec -- pnpm test:white-label   # build with another identity: nothing of yours leaks
mise exec -- pnpm --filter web build # production build
mise exec -- pnpm check:js-budget    # ≤ 30 KiB gzip of JS per page
mise exec -- pnpm test:lighthouse    # mobile scores and Core Web Vitals
mise exec -- pnpm docs:config        # regenerates the tables in this guide
mise exec -- pnpm check:dev-cold-start # first astro dev start without blank pages
```

The first time, for the browser tests: `mise exec -- pnpm exec playwright install chromium`.

## 9. Common problems

| Symptom | Likely cause and what to do |
| --- | --- |
| The build says `Invalid site config` | `site.config.ts` breaks the schema; the message lists every field. Compare it with the table in section 3 |
| A test says "docs out of sync" | You changed a schema or `env-vars.ts`: run `pnpm docs:config` and commit |
| A test says "add .describe()" | A new schema field has no description: add it in the code |
| Blank first visit in `astro dev` | Vite found a dependency late; run `pnpm check:dev-cold-start` and add what it shows to `optimizeDeps.include` |
| The form says "unavailable" | Some Worker secret is missing or invalid (the log names which); see 6.7 |
| Comments do not show up | Check `features.comments`, the `giscus` block, that Discussions is on and the app installed (6.5) |
| The shared link shows the old card | It is the social network's cache: refresh it with its debugger (section 7) |
| The site is not indexed | Only production builds carry `SITE_INDEXABLE=true`; its absence is intentional in local builds |
| A CI job fails and there is no deploy | That is the design: the deploy requires everything to pass. Fix and release again |

## 10. Using this site as a base for someone else (white-label)

The site is meant to be adopted by someone else by **changing only configuration and content**; the style (layout, motion, motifs) stays in the code.

1. Replace `site.config.ts` (identity, languages, features, third-party ids, legal dates).
2. Replace the content of `apps/web/src/content/` (notes, experience, certificates, experiments, changelog) and the files in `apps/web/public/` (photo, favicon, `og-image.png`).
3. Adjust the theme in `packages/core/src/tokens/tokens.json` if you want another palette.
4. Set your Cloudflare secrets (section 6.7) and your CI variables (section 7).
5. Verify: `pnpm test:white-label` builds the site with an alternative identity and **fails if a single string of the original owner leaks**.

This project does not include a license file yet; before someone else reuses it, decide under which license it is shared.
