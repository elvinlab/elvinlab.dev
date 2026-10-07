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

To write notes, see the separate guide: [How to create a note](NOTES.en.md). To edit the `/me` profile and the experiments, see [Portfolio guide: profile and experiments](PORTFOLIO.en.md).

## 1. The map: what to change and where

| I want to change... | Where | How it is validated |
| --- | --- | --- |
| Name, bio, role, links, languages, active features, comments, analytics, legal dates | [`apps/web/src/site.config.ts`](../apps/web/src/site.config.ts) | At build time: an invalid value breaks the build and lists every problem |
| Notes (the blog) | `apps/web/src/content/notes/<slug>/index.mdx` (drafts in `drafts/`) | The note schema (see [the notes guide](NOTES.en.md)) |
| Experience, certificates, experiments, changelog | `apps/web/src/content/*.json` | One schema per file (section 4); the profile and projects guide is [PORTFOLIO.en.md](PORTFOLIO.en.md) |
| Experiments list: page size, featured limit, `/me` rows, intro and words | the `experiments` block of [`site.config.ts`](../apps/web/src/site.config.ts) | At build time (section 3) |
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
| `identity.photo` | `string` | no |  | Portrait shown only on /me (and in the /me share card); `avatar` is used elsewhere. Falls back to `avatar` when omitted. |
| `appearance` | `'minimal' \| 'full'` | no | `full` | Visual preset. `minimal` is the calm look (smaller type, fewer home sections); `full` is the original look. Defaults to `full` so a config written before the preset existed does not change. |
| `home` | `object` | no | `{}` | Show or hide each home section; a key you set wins over the `appearance` preset, a key you omit follows it. `minimal` hides `heroPills` and `pillars`; `full` shows everything. A hidden section renders nothing. |
| `home.heroPills` | `boolean` | no |  | The three keyword pills under the hero intro (desktop only). |
| `home.authorCard` | `boolean` | no |  | The sidebar author card: photo, name, bio and social buttons. |
| `home.hiringCard` | `boolean` | no |  | The sidebar "Hiring?" recruiter card: availability and links to /me and the CV. |
| `home.marks` | `boolean` | no |  | The sidebar footprint card (heart button with its own counter). It also needs the top-level `features.marks`: with that flag off it never shows. |
| `home.now` | `boolean` | no |  | The sidebar "Now" card: what you are focused on, from the top-level `now` block. It also needs that block: without it the card never shows. |
| `home.pillars` | `boolean` | no |  | The four pillars strip at the bottom of the home (desktop only). |
| `home.notebookIndex` | `boolean` | no |  | The notebook index: compact rows for the notes after the latest one. |
| `home.experiments` | `boolean` | no |  | The experiments section of the home. Also needs `features.experiments`: with that flag off it never shows. |
| `now` | `object` | no |  | Optional dated "Now" block: what you are focused on, shown as a sidebar card on the home. Remove the key to hide the card. Update `updatedAt` whenever you change the rows. |
| `now.updatedAt` | `date (YYYY-MM-DD)` | yes |  | Date of the last update of the block (`YYYY-MM-DD`), shown on the card. |
| `now.items` | `object[] (max 3)` | yes |  | One to three rows, in display order. |
| `now.items[].kind` | `'focus' \| 'building' \| 'exploring' \| 'learning'` | yes |  | Label of the row: `focus`, `building`, `exploring` or `learning`. |
| `now.items[].text` | `{ <locale>: string }` | yes |  | What it is, per locale (the default locale is required). |
| `now.items[].href` | `URL \| string` | no |  | Optional link for the text: an https URL or a site path starting with `/`. |
| `socials` | `object[]` | yes |  | Social profile links shown in the footer and used as `sameAs` in structured data. |
| `socials[].label` | `string` | yes |  | Link text and accessible name. |
| `socials[].url` | `URL` | yes |  | Profile URL (https only: an email address never belongs in public config). |
| `socials[].icon` | `string` | yes |  | Icon name (`github`, `linkedin`, ...). |
| `background` | `object` | no | `{"galaxy":true,"cursorWaves":false}` | Default animated banner background (each visitor can change it). All effects read the theme palette. |
| `background.galaxy` | `boolean` | yes |  | Nebula clouds and a twinkling star field. |
| `background.cursorWaves` | `boolean` | yes |  | Slow colour waves with a ripple that follows the pointer. |
| `marks` | `object` | no | `{}` | Settings of the footprint button (`features.marks`). Every key is optional and falls back to its default. |
| `marks.animation` | `'stamp' \| 'burst' \| 'pulse' \| 'none'` | no | `stamp` | Animation played when a reader leaves a footprint: `stamp` an ink stamp pressed on the page, `burst` a burst of pixel squares, `pulse` a soft ring, `none` no animation. All obey `prefers-reduced-motion`. |
| `marks.maxPerVisitor` | `integer (min 1, max 200)` | no | `50` | Footprints one browser can leave on one note; after that taps add nothing. |
| `marks.showCountFrom` | `integer (min 0, max 1000)` | no | `5` | The counter is hidden until a note has this many footprints; before that the button invites the reader to be among the first. |
| `experiments` | `object` | no | `{}` | Settings of the experiments list (`features.experiments`): pagination, sorting, big pieces, the rows on `/me` and the page header texts. Every key is optional and falls back to its default. |
| `experiments.perPage` | `integer (min 4, max 48)` | no | `12` | Compact cards per page of `/experiments/`. Page 1 also holds the big pieces; a second page exists only when the compact cards exceed this number (`/experiments/page/2/`). About 1 KB of HTML per compact card (929 B measured with 30 generated entries and 919 B with 100, comparing pages 2 and later); the cost depends on the content, so measure your own entries with `pnpm stress:experiments`. |
| `experiments.maxFeatured` | `integer (min 1, max 6)` | no | `3` | Most experiments that may have `featured: true` (the big exhibition pieces). The build fails with the list of offenders when more are featured. |
| `experiments.meRows` | `integer (min 1, max 6)` | no | `3` | Rows of "Recent experiments" on `/me`. Never more than `perPage`: a larger value is lowered to `perPage`, so every row links to an anchor that lives on page 1. |
| `experiments.intro` | `{ <locale>: string }` | no |  | Optional intro under the title of `/experiments/`, per locale (the default locale is required). Omit it to use the interface default. |
| `experiments.words` | `{ <locale>: string (max 24)[] (max 6) }` | no |  | Optional decorative comment stack beside the title of `/experiments/` (desktop only), per locale: one to six short words, for example `{ "es": ["construir", "probar"] }`. The leading `// ` is added for you. Nothing renders there unless you set this (the default header is just the title and the intro). |
| `experiments.defaultSort` | `'newest' \| 'oldest' \| 'title'` | no | `newest` | Order of the compact cards at `/experiments/`: `newest` (publication date, newest first), `oldest` or `title` (A to Z). Big (featured) pieces always lead page 1 whatever the sort. It must be one of `sorts`. |
| `experiments.sorts` | `'newest' \| 'oldest' \| 'title'[]` | no | `["newest","oldest","title"]` | Sorts the visitor can choose, from `newest`, `oldest` and `title`. Each one except `defaultSort` is a static page (`/experiments/oldest/`, `/experiments/oldest/page/2/`) that search engines are told not to index and that stays out of the sitemap. A list of one sort shows no switch. |
| `experiments.sortFrom` | `integer (min 2, max 48)` | no | `4` | The sort switch and the alternate-sort pages exist only when the compact cards (everything that is not a big piece) number at least this many; below it the order is not worth choosing. |
| `changelog` | `object` | no | `{}` | Settings of the changelog (`features.changelog`). Every key is optional and falls back to its default. |
| `changelog.perPage` | `integer (min 2, max 30)` | no | `4` | Release days per page of `/changelog/`. A release is one production day, so this counts days, not entries; a second page exists only when the days exceed this number (`/changelog/page/2/`). Page 1 opens its two newest days; the rest stay collapsed. |
| `recruiter` | `object` | yes |  | Recruiter card on the home page and /me. |
| `recruiter.available` | `boolean` | yes |  | Show or hide the whole availability line (not whether you are open to work). |
| `recruiter.openToWork` | `boolean` | no | `true` | Whether you are open to work: green status dot when true, the brand accent colour when false. |
| `recruiter.status` | `{ <locale>: string }` | yes |  | Availability text per locale. Parts separated by " · " show as a headline plus short tags on the home card (for example "Working at Buo · open to chat"); a single part is one tag (for example "Open to work"). |
| `recruiter.lookingFor` | `{ <locale>: string }` | yes |  | What you are open to, per locale. Shown as the availability line in the /me sidebar, below the status. |
| `recruiter.cvUrl` | `URL \| { <locale>: URL }` | no |  | Link to a downloadable CV (https): one URL for every locale, or one per locale (`{ es: ..., en: ... }`, a locale without one falls back to the default locale). Omit to hide the CV button. |
| `me` | `object` | yes |  | Singular /me profile data. Lists that grow (experience, certificates) live in `src/content/`. |
| `me.timezone` | `string` | yes |  | Display timezone, for example `UTC−6`. |
| `me.workMode` | `{ <locale>: string }` | yes |  | Work mode per locale (remote, hybrid, ...). |
| `me.languages` | `{ <locale>: string }` | no |  | Spoken languages per locale, for example "Spanish native · English B1". Shown in the /me sidebar; omit to hide the row. |
| `me.headline` | `{ <locale>: string }` | no |  | The role line under the name on /me, per locale. Omit to show `identity.role`. |
| `me.pitch` | `{ <locale>: string }` | no |  | One or two sentences under the /me headline that say what you do, per locale. Omit to hide it. |
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
| `me.stack[].icon` | `string` | no |  | Icon name shown before the group name (code, server, shield-check, cloud, bot, flask, layers, ...). Omit for no icon. |
| `me.stack[].hint` | `{ <locale>: string }` | no |  | One plain-language sentence per locale that says what the group is. Shown as a hover and focus tooltip; omit for no tooltip. |
| `features` | `object` | yes |  | Feature flags: off means the routes are not generated and the nav entry is hidden. The four interface switches (`backToTop`, `languageHint`, `themeToggle`, `backgroundPicker`) default to on and render nothing when off. |
| `features.blog` | `boolean` | yes |  | Lab Notes: the notes index, note pages, RSS and the nav entry. |
| `features.comments` | `boolean` | yes |  | Giscus comments on notes. Needs the `giscus` block below, otherwise nothing renders. |
| `features.contact` | `boolean` | yes |  | The /contact form: off removes the route and the contact Action, hides the nav entry and every link to it (the legal pages and the subscription messages then name no Contact page), and keeps it out of the sitemap. |
| `features.credentials` | `boolean` | yes |  | Certificates and degrees on /me. |
| `features.experiments` | `boolean` | yes |  | The experiments (projects) section and its pages. |
| `features.changelog` | `boolean` | yes |  | Visitor-facing /changelog page: off removes the route, the footer link and the sitemap entry. |
| `features.me` | `boolean` | yes |  | The /me recruiter page: off hides it from the nav, marks it noindex and keeps it out of the sitemap. |
| `features.readingMode` | `boolean` | yes |  | Reading mode on notes: off renders no toggle, loads no script or CSS and stores nothing in the browser. |
| `features.marks` | `boolean` | yes |  | The anonymous "I was here" footprint button on notes. Needs the `SITE_DB` D1 binding (the site database, table `note_footprints`) and the `MARKS_RATE_LIMITER` binding, otherwise the buttons never render. |
| `features.subscribe` | `boolean` | yes |  | Email subscription to new notes (double opt-in, list in D1, mail through Resend). Needs the `SITE_DB` D1 binding (table `subscribers`), the `SUBSCRIBE_RATE_LIMITER` binding and the `SUBSCRIBE_FROM` and `SUBSCRIBE_TOKEN_SECRET` secrets, otherwise nothing renders. |
| `features.backToTop` | `boolean` | no | `true` | The floating "back to top" button. Off renders neither the button nor its script. |
| `features.languageHint` | `boolean` | no | `true` | The banner that suggests the other language to visitors whose browser prefers it. Off renders neither the banner nor its script. |
| `features.themeToggle` | `boolean` | no | `true` | The theme button in the navbar. Off renders no button and no script: the theme still resolves from the visitor's system preference (or the default theme) on every page. |
| `features.backgroundPicker` | `boolean` | no | `true` | The navbar button that cycles the banner background effect. Off renders no button and no script: the effect follows the owner default from `background`. |
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

Shown in the `/me` timeline. If you omit `end`, it is the current job. `role`, `summary` and `location` can be a plain string (shown for every language) or an object per language that includes the default language.

```json
{
  "my-company": {
    "role": "Full Stack Developer",
    "company": "My company",
    "start": 2024,
    "summary": {
      "es": "Una línea honesta de lo que haces.",
      "en": "One honest line about what you do."
    },
    "tags": ["typescript", "cloudflare"]
  }
}
```

<!-- docs:start experience -->
| Key | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| `role` | `string \| { <locale>: string }` | yes |  | Job title: one string, or one text per locale such as `{ "es": "...", "en": "..." }` (max 80 characters each). |
| `company` | `string (max 80)` | yes |  | Company or client (max 80 characters). |
| `start` | `integer (min 1970)` | yes |  | Year the role started. |
| `end` | `integer (min 1970)` | no |  | Year the role ended. Omit for the current role (drawn with a solid dot). |
| `location` | `string \| { <locale>: string }` | no |  | Where the role was based: one string, or one text per locale (max 80 characters each). |
| `summary` | `string \| { <locale>: string }` | yes |  | One truthful summary, no bullets: one string, or one text per locale (max 280 characters each). |
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

Portfolio experiments (projects), published at `/experiments/` (and `/en/experiments/`) and as compact rows on `/me` (`experiments.meRows`, three by default, with a closing button to the full page). **Only link public repositories**; for private work leave `url` and `repo` out.

```json
{
  "agentic-dev-setup": {
    "title": "agentic-dev-setup",
    "description": { "es": "Entorno de desarrollo con agentes.", "en": "Multi-agent development setup." },
    "problem": { "es": "…", "en": "…" },
    "contribution": { "es": "…", "en": "…" },
    "result": { "es": "…", "en": "…" },
    "tags": ["ai-agents", "tooling"],
    "year": 2026,
    "repo": "https://github.com/elvinlab/agentic-dev-setup",
    "note": "agentic-dev-setup",
    "featured": true
  }
}
```

**How to add an experiment:** add an entry with a new key. The texts (`description`, `subtitle`, `problem`, `contribution`, `result`) are one string for every language or an object `{ "es": …, "en": … }`; say what you did yourself and what came out of it, with no invented numbers. `url` is the main link (live site) and `repo` the code link. `note` is the slug of a published note that tells the case: if it does not exist the build fails (a dead link never ships). For the screenshots, copy your own images (1280 x 800, 16:10) into the entry's own folder, `apps/web/src/assets/experiments/<entry key>/`, and list them in `images` (1 to 4, in display order): each has a `file` (for example `cover.jpg`), a required `alt` (up to 140 characters) and an optional `caption` (up to 120) shown under the image. The first one is the cover: `/me` and the first slide use it. One image shows as a figure; two or more show as a gallery with thumbnails that works without JavaScript; with no `images` the page shows a typographic cover. A file that does not exist also breaks the build. `status` accepts `running`, `shipped` and `archived`. Featured experiments come first (at most `experiments.maxFeatured`, 3 by default) and the first `experiments.meRows` appear on `/me`. The list is paginated: page 1 holds the featured pieces and the first `experiments.perPage` compact cards (12 by default), later pages live at `/experiments/page/N/` and exist only when needed. The complete "I want to change X" guide is [PORTFOLIO.en.md](PORTFOLIO.en.md); the `experiments` block of `site.config.ts` is in section 3. With `features.experiments` off there is no page and no links.

<!-- docs:start experiments -->
| Key | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| `title` | `string (max 80)` | yes |  | Project name (max 80 characters). |
| `description` | `string \| { <locale>: string }` | yes |  | What it is, in one or two sentences (max 200 characters each). One string, or one text per locale such as `{ "es": "...", "en": "..." }`. |
| `subtitle` | `string \| { <locale>: string }` | no |  | A short muted line under the title (max 200 characters each). One string, or one text per locale such as `{ "es": "...", "en": "..." }`. |
| `problem` | `string \| { <locale>: string }` | no |  | The problem it solves (max 200 characters each). One string, or one text per locale such as `{ "es": "...", "en": "..." }`. |
| `contribution` | `string \| { <locale>: string }` | no |  | What you did yourself, as opposed to tools or teammates (max 200 characters each). One string, or one text per locale such as `{ "es": "...", "en": "..." }`. |
| `result` | `string \| { <locale>: string }` | no |  | What it delivered, with no invented numbers (max 200 characters each). One string, or one text per locale such as `{ "es": "...", "en": "..." }`. |
| `tags` | `string[] (max 5)` | no | `[]` | Up to five kebab-case tags. |
| `year` | `integer (min 2000)` | yes |  | Year the project started or shipped. |
| `publishedAt` | `string` | no |  | Optional date it shipped (`YYYY-MM-DD`), used to sort the list by date. Without it the sort uses 1 January of `year`. Keep it inside `year`. |
| `status` | `'running' \| 'shipped' \| 'archived'` | no | `shipped` | `running` shows a green dot, `shipped` a violet one and `archived` a muted one. |
| `url` | `URL` | no |  | Live or main link (https only). Leave it out for private work: a private repository is never linked. |
| `repo` | `URL` | no |  | Public code link (https only). Never a private repository. |
| `note` | `string` | no |  | Slug of a published note that tells the case. The build fails if no such note is published. |
| `images` | `object[] (max 4)` | no |  | One to four screenshots, in display order. The first is the cover (used by `/me` and as the first slide). Use your own screenshots only; leave the field out for a typographic cover. |
| `images[].file` | `string` | yes |  | File name inside the own folder of the entry `apps/web/src/assets/experiments/<entry key>/` (png, jpg, webp or avif). |
| `images[].alt` | `string \| { <locale>: string }` | yes |  | Alternative text describing the screenshot (max 140 characters each). One string, or one text per locale such as `{ "es": "...", "en": "..." }`. |
| `images[].caption` | `string \| { <locale>: string }` | no |  | A short caption shown under the image in the gallery (max 120 characters each). One string, or one text per locale such as `{ "es": "...", "en": "..." }`. |
| `order` | `integer (min 0, max 1000)` | no |  | Position among entries of the same tier: lower comes first (default 100). Featured entries always come before the others; ties go to the newest year, then the key. |
| `featured` | `boolean` | no | `false` | Featured experiments lead the lists. |
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

A **release is a production day**: the page groups entries by `date` (the day they reached production), inside each day by kind (`added` New, `changed` Changes, `fixed` Fixes, `removed` Removed, `security` Security, `deprecated` Deprecated, in that fixed order) and, inside a kind, by title. It paginates by days with `changelog.perPage` (default 4): `/changelog/`, `/changelog/page/2/`, and so on. The two newest days of page 1 start open; the rest is collapsed, but its content stays in the HTML.

### Release headlines — `releases.json`

Optional. One short headline per day, so a day has a name besides its date. The key is the day (`YYYY-MM-DD`); a day without a headline shows only its date, and a key without entries is ignored.

```json
{
  "2026-10-07": { "title": "Experiments page and a clearer /me" }
}
```

<!-- docs:start releases -->
| Key | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| `title` | `string (max 80)` | no |  | Optional headline of the release day, shown beside its date (max 80 characters). Without it the day shows only its date. The key is the day, as YYYY-MM-DD; a day without entries is ignored. |
<!-- docs:end releases -->

Two commands keep the changelog current:

- `pnpm changelog:audit` finds the last release (the `develop: <sha>` line recorded by the release commit at the tip of `origin/main`, read from the local ref, no fetch), lists the `feat`, `fix` and `perf` commits since then that did **not** touch `changelog.json` (the entry travels in the same work unit) and exits non-zero if there are any. It says so when the commit has no `develop:` line.
- `pnpm changelog:stamp [--date YYYY-MM-DD] [--dry-run]` sets `date` (today by default) on the entries that are **not** in `origin/main`'s `changelog.json`, never touching published ones. Run it when preparing the release; `--dry-run` only prints.

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
| `SUBSCRIBE_FROM` | Worker (runtime) | yes | no | Sender of the subscription emails (`Name <address>` or a bare address), on a domain verified in Resend. Required only when `features.subscribe` is on. An address is never written in tracked files. | Cloudflare Worker secret; `.dev.vars` locally |
| `SUBSCRIBE_TOKEN_SECRET` | Worker (runtime) | yes | no | Random secret (at least 32 characters) that signs the unsubscribe link of every email. Required only when `features.subscribe` is on. Changing it invalidates the unsubscribe links already sent. | Cloudflare Worker secret; `.dev.vars` locally |
| `SUBSCRIBE_ADMIN_TOKEN` | Worker (runtime) | yes | no | Random secret (at least 32 characters) the owner sends as a Bearer token to `POST /api/subscribe/notify`, the trigger that emails a published note to the list (`pnpm notify:note`). Required only to send notes; without it the endpoint answers 503. Keep it in a password manager, never in the repository. | Cloudflare Worker secret; `.dev.vars` locally |
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

# Sender of the subscription emails (`Name <address>` or a bare address), on a domain verified in Resend. Required only when `features.subscribe` is on. An address is never written in tracked files.
SUBSCRIBE_FROM=

# Random secret (at least 32 characters) that signs the unsubscribe link of every email. Required only when `features.subscribe` is on. Changing it invalidates the unsubscribe links already sent.
SUBSCRIBE_TOKEN_SECRET=

# Random secret (at least 32 characters) the owner sends as a Bearer token to `POST /api/subscribe/notify`, the trigger that emails a published note to the list (`pnpm notify:note`). Required only to send notes; without it the endpoint answers 503. Keep it in a password manager, never in the repository.
SUBSCRIBE_ADMIN_TOKEN=
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
| `blog` | Notes index, notes and RSS | With no published notes, the menu hides "Notes" and the feed. With `blog: false` no notes route, RSS feed or sitemap entry is built (the routes in `src/blog-routes/` are injected only when the flag is on, by `integrations/blog-routes.ts`) |
| `comments` | Comments and reactions (Giscus) | Needs the `giscus` block; see 6.5 |
| `contact` | The `/contact` form | Needs the Worker secrets; without them it fails closed |
| `credentials` | Certificates on `/me` | |
| `experiments` | Experiments section and pages (`/experiments/`) | |
| `changelog` | The `/changelog` page and its link | When off the route is not generated (see "What each switch does") |
| `me` | The `/me` page (portfolio) | |
| `readingMode` | Reading mode on notes | Off: no button, script or CSS ships and nothing is stored in the browser |

#### What each switch does

All flags live under `features` in `site.config.ts`. The last four (interface) default to `true` when omitted. Checked against the code.

| Flag | What it controls | What disappears when it is off | Dependencies |
| --- | --- | --- | --- |
| `blog` | Lab Notes: `/notes` index, notes and the `/rss.xml` feed | The routes (`integrations/blog-routes.ts`), the "Notes" menu entry, the feed and the sitemap entries; the home and `/me` stop reading notes | With no published notes the menu also hides "Notes". `subscribe` requires `blog` |
| `comments` | Comments and reactions (Giscus) on notes | The component and its mention in the privacy and terms pages | Needs the `giscus` block; without it nothing renders |
| `contact` | The `/contact` page (and `/en/contact`) and the `contact` Action | The routes (`integrations/contact-routes.ts`), the Action (answers "unavailable" without reaching any provider), the menu entry, the author card and `/me` buttons, and the sitemap entry. The privacy and terms pages stop linking to contact (they point to "the channels published on this site") and privacy loses its "Contact form" section. The subscription error messages stop mentioning the Contact page | When on, needs the Worker secrets (`CONTACT_*`) and the Turnstile key; without them it fails closed |
| `credentials` | Certificates and degrees on `/me` | The certificates section of `/me` | |
| `experiments` | Experiments section | The `/experiments/` and `/en/experiments/` routes (`integrations/experiments-routes.ts`), the menu entry, the home section and the `/me` section, and its sitemap entry | `home.experiments` also needs it |
| `me` | The `/me` page | The "About" menu entry, the home hiring card, the notes sidebar link and the `/me` share card; the page is marked `noindex` and kept out of the sitemap | |
| `changelog` | The `/changelog` page (and `/en/changelog`) | The routes (`integrations/changelog-routes.ts`), the footer link and the sitemap entry | |
| `readingMode` | Reading mode on notes | Button, script and CSS; nothing is stored in the browser | |
| `marks` | Footprint button on notes and the home | The button and its counter, and the privacy section | Needs `SITE_DB` (D1) and `MARKS_RATE_LIMITER` |
| `subscribe` | Email subscription | The `/subscribe/**` routes, the `/api/subscribe/notify` endpoint, the footer link and form, and the privacy section | Needs `blog` and a Turnstile key to show the form; also `SITE_DB`, `SUBSCRIBE_RATE_LIMITER`, `SUBSCRIBE_FROM` and `SUBSCRIBE_TOKEN_SECRET` (see 6.14) |
| `backToTop` | Floating "back to top" button | The button and its script (nothing else depends on it) | |
| `languageHint` | Banner suggesting the other language from the browser settings | The banner and its script | |
| `themeToggle` | Navbar theme button | The button and its script. The theme still resolves on every page through the pre-paint script: system preference or default theme, and a choice saved earlier is forgotten | |
| `backgroundPicker` | Navbar button that cycles the banner effect | The button and its script; the background follows the `background` default and ignores a choice saved earlier | |

With `contact` off, the Action and routes do not exist, so the subscription error message simply asks the visitor to try again later.

#### Appearance and home sections

`appearance` picks the visual preset: `minimal` hides the hero pills (`heroPills`) and the pillars strip (`pillars`) on the home page; `full` (this site's choice since 2026-10-02) is the original look and shows everything. The "Now" card (`now`) shows under both presets. If you omit `appearance` it is `full`, so a config written before the preset existed does not change.

**Type scale.** `appearance` also sets the text size: it lands on `<html data-appearance>` and `apps/web/src/styles/type-scale.css` defines the scale once (`--type-*` variables), so a fork changes it by editing that file. `minimal`: hero 32/44 px (phone/`md`), section titles 20, note title 30/40, featured card 20/22, body and intro paragraph 17. `full` keeps the original sizes (hero 36/60 px, sections 24, note title 36/48, featured card 30/36, body 18). Reading mode has its own scale and does not change.

**Banners and notes.** The same preset lowers the banner heights (in `minimal`: 240 px on pages, expanded home between 360 and 460 px), makes every banner blend into the page through a 120 px gradient and, on notes, keeps only the date and reading time in the header (language and author move to the foot) with a more compact decision record. `full` keeps the original heights and header. Those values live in `apps/web/src/styles/calm-layout.css`.

`home` tunes each section on its own and **always wins over the preset**: a key you set rules, a key you omit follows the preset. Keys: `heroPills`, `authorCard`, `hiringCard`, `marks`, `now`, `pillars`, `notebookIndex` and `experiments` (which also needs `features.experiments`). A section that is off renders nothing (no heading, no gap), and when all the sidebar cards (`authorCard`, `hiringCard`, `marks`, `now`) are off the sidebar column disappears.

```ts
// Calm look, without the hiring card and without the "Now" card.
appearance: 'minimal',
home: { now: false, hiringCard: false },
```

**The "Now" card.** A dated sidebar card with what you are focused on right now. Its data lives in the optional `now` block of `site.config.ts`: `updatedAt` (a real `YYYY-MM-DD` date, shown as "Updated October 2, 2026") and one to three `items`, each with a `kind` (`focus`, `building`, `exploring` or `learning`), a `text` per locale (the default locale is required) and an optional `href` (an https URL or a site path starting with `/`). Bump `updatedAt` whenever you change the rows. Remove the `now` block and the card renders nothing (no heading, no gap), even with `home.now` on. It is the one dated section of the site: the exception to the timeless voice is in [BRAND.md](BRAND.md).

> **Breaking change for forks:** `home.labLog` is now `home.now`, and the "Lab log" box (since when, cadence, languages) was replaced by the "Now" card. A `home.labLog` in your config now fails the build (the schema rejects unknown keys): rename it to `home.now` and add the `now` block. The project is pre-1.0 and made a break like this before with `identity.avatar`.

### 6.3 Experience, certificates and experiments

Add an entry to the matching JSON (section 4) with a new key. To remove one, delete it. Build (`pnpm --filter web build`) to validate: an invalid field breaks the build and names the field.

### 6.4 Changelog

Add an entry **per visible change** in the same work unit that ships it (the right category; the date is stamped at release with `pnpm changelog:stamp`). Before releasing, `pnpm changelog:audit` lists the `feat`/`fix`/`perf` commits without an entry. Do not announce something that is not in production yet.

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
- **Favicon**: `apps/web/public/favicon.svg` (the icon the page declares) and `apps/web/public/favicon.ico` (16 and 32 px, what browsers, crawlers and link unfurlers request by default; without it `/favicon.ico` is a 404). Replace both together; regenerate the `.ico` from your SVG with `rsvg-convert -w 16 -h 16 favicon.svg -o f16.png`, the same at 32, then `magick f16.png f32.png favicon.ico`. `tests/browser/favicon.spec.ts` checks the file.
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

### 6.13 Footprints on notes (`marks`) and the site database

A one-tap, anonymous "I was here" button on every note (header and end of the article), with a per-note counter in Cloudflare D1. The settings are in `site.config.ts`: `features.marks` (on or off) and the `marks` block (`animation`: `stamp`, `burst`, `pulse` or `none`; `maxPerVisitor`; `showCountFrom`; the generated table in section 3 lists the defaults). Every animation stops under `prefers-reduced-motion`. The home page has its own footprint card in the sidebar, with its own counter (the fixed page key `home`, stored in the same table); the `home.marks` flag switches it on or off and it also needs `features.marks`. Decision record: [ADR 0013](adr/0013-footprints-on-notes-d1.md).

**One database for the whole site.** The database is `elvinlab-dev-db`, bound as `SITE_DB`, and it is meant to host future features too. The rules that keep it scalable:

- **One table per feature, named after it** (`note_footprints`; a future feature would add for example `page_views`). A feature reads and writes only its own tables, through its own adapter behind its own port (`features/<x>/adapters/d1.ts`); it never touches another feature's table.
- **Migrations are one shared, numbered sequence** in `apps/web/migrations/`, named `NNNN_<feature>_<change>.sql` (today `0001_note_footprints.sql`). Wrangler records what was applied in the `d1_migrations` table of that database.
- **Limits:** the free plan gives 5 GB per account. If a feature ever outgrows the shared database, give it its own database and its own binding.
- Bindings that are specific to a feature (the rate limiter `MARKS_RATE_LIMITER`) keep the feature's name; only the database is shared.

**Until the database exists and is bound the buttons do not appear** (the Actions answer "unavailable" and the page renders nothing): turning the flag on without the steps below is safe, it just shows nothing. These steps run in **your Cloudflare account**. *On elvinlab.dev steps 1 to 3 were done on 2026-10-05: database `elvinlab-dev-db` in region ENAM, its id and the `SITE_DB` binding are in `wrangler.jsonc` and the `note_footprints` table exists. (A first database named `elvinlab-marks` was created and deleted the same day, empty, to give the site one database that can grow.) Only the release (step 4) and the check (step 5) remain.*

1. Create the database (needs `wrangler login`): `cd apps/web && mise exec -- pnpm exec wrangler d1 create elvinlab-dev-db`. It prints a `database_id`.
2. Add the binding to `apps/web/wrangler.jsonc`:
   ```jsonc
   "d1_databases": [
     { "binding": "SITE_DB", "database_name": "elvinlab-dev-db", "database_id": "<the id from step 1>", "migrations_dir": "migrations" }
   ]
   ```
   (`MARKS_RATE_LIMITER`, the per-IP limit, is already declared under `ratelimits`.)
3. Create the tables in the real database: `mise exec -- pnpm exec wrangler d1 migrations apply elvinlab-dev-db --remote` (today it applies `apps/web/migrations/0001_note_footprints.sql`).
4. Release as usual (section 7). If the deploy fails with an authorization error, the API token of the GitHub `production` environment may lack permission to deploy a Worker with a D1 binding: add the D1 edit permission to the token. *Checked on elvinlab.dev on 2026-10-05: the existing deploy token deployed the Worker with the D1 binding with no extra permission.*
5. Check it: open a note, press the button and reload (the count is kept), or `curl -s -X POST https://YOUR-DOMAIN/_actions/marks.get/ -H 'content-type: application/json' -H 'origin: https://YOUR-DOMAIN' -d '{"slug":"<a published note slug>"}'`, which answers with the total.

To turn it off, set `features.marks: false`: no markup, no CSS and no script reach the page. To use another database (for example Turso), write an adapter for the `MarkStore` port in `apps/web/src/features/marks/ports.ts` next to `adapters/d1.ts`.

### 6.14 Email subscription to new notes (`subscribe`)

Visitors leave an email in the footer form (the subscription band, the only place of the subscription; it loads its code and Turnstile only on first focus) and get one email for each new note and, now and then, an announcement of one of the author's projects. The list lives in the shared D1 database (table `subscribers`), signing up needs a confirmation click (double opt-in), every email carries an unsubscribe link (also in the `List-Unsubscribe` header; no one-click POST, see ADR 0014), and Resend only sends (it sits behind a port). The flag is `features.subscribe` (ships **off**); the routes `/subscribe/confirm/`, `/subscribe/unsubscribe/` (and their `/en` twins) exist only while it and `features.blog` are on. The form also needs a Turnstile site key (recipe 6.6). Full guide (owner runbook, data, limits and troubleshooting): [`SUBSCRIPTION.en.md`](SUBSCRIPTION.en.md). Decision record: [ADR 0014](adr/0014-email-subscription-d1-list-resend-port.md); the privacy page gets its `subscribe` section when the flag is on.

Until every step below is done the form shows nothing useful (the Actions answer "unavailable"), so do them **in this order**, in your own accounts, before flipping the flag:

1. **Apply the migration to the real database** (needs `wrangler login`): `cd apps/web && mise exec -- pnpm exec wrangler d1 migrations apply elvinlab-dev-db --remote` (it applies every pending migration: `migrations/0002_subscribers.sql` and `migrations/0003_subscriber_notes.sql`; an installation that already ran 0002 gets only 0003, the table of notes already sent to each subscriber). The migrations create three tables: `subscribers`, `subscriber_notes` (which notes each subscriber already got, so a note is never sent twice) and `subscribe_quota` (a per-UTC-day counter of confirmation emails). The cap values (30 confirmations a day out of the provider's 100) live in `SUBSCRIBE_POLICY` (`features/subscribe/config.ts`); notes use what is left of the 100 each day.
2. **Create the two secrets** on the Worker (never in tracked files): `SUBSCRIBE_FROM`, the sender (`Name <address>`) on a domain verified in Resend, and `SUBSCRIBE_TOKEN_SECRET`, at least 32 random characters. Generate the second with `openssl rand -base64 48`, then `mise exec -- pnpm exec wrangler secret put SUBSCRIBE_TOKEN_SECRET` and the same for `SUBSCRIBE_FROM`. Locally put both in `apps/web/.dev.vars` (git-ignored). `RESEND_API_KEY` and `TURNSTILE_SECRET_KEY` are the ones the contact form already uses. Changing `SUBSCRIBE_TOKEN_SECRET` later invalidates the unsubscribe links already sent.
3. **Bind the rate limiter**: `SUBSCRIBE_RATE_LIMITER` is already declared under `ratelimits` in `wrangler.jsonc` (a unique `namespace_id`); it becomes active with the next deploy. Nothing to create by hand.
4. **Verify the sending domain in Resend** (DNS records SPF and DKIM in the Cloudflare zone) so `SUBSCRIBE_FROM` is accepted. The free plan allows 100 emails a day and 3,000 a month; the sender caps each run at 100.
5. **Flip the flag**: set `features.subscribe: true` in `site.config.ts`, run `pnpm docs:config` if you changed anything generated, and release (section 7).
6. **Check it** with a throwaway address you own: subscribe from the footer of any page, open the link in the email, press the button, then unsubscribe from a note email. Never test with someone else's address.
7. **Send a note to the list** (every time you publish one). The first time, create the trigger secret: `openssl rand -base64 48`, then `mise exec -- pnpm exec wrangler secret put SUBSCRIBE_ADMIN_TOKEN`, and keep it in a password manager (never in the repository or any tracked file; without it the endpoint answers 503 and the rest of the subscription keeps working). Order: **release the note first (section 7), then notify**. Run `SUBSCRIBE_ADMIN_TOKEN=... pnpm notify:note <slug>` (the token goes in an environment variable, never as an argument): it is a **dry run** that only counts recipients and the day's allowance and sends nothing. If the numbers look right, repeat it with `--send`. A Spanish note reaches only Spanish subscribers and an English one only English subscribers. The cap is 100 emails a day across confirmations and notes: when some are left, the command says so and you run it again the next day (it resumes where it stopped, with no repeated sends). The endpoint `POST /api/subscribe/notify` takes only the `slug`: the title, summary and link come from the published note.

To switch it off, set `features.subscribe: false`: the form and the pages disappear from the next build and the privacy section goes with them (the list stays in D1).

## 7. Releasing and rolling back

The full flow is decided in ADRs [0011](adr/0011-ci-gate-once-at-main-pr-no-staging.md) and [0012](adr/0012-direct-push-to-main-no-pr-gate.md). In short:

- **Day to day**: work on `develop` and push freely; no CI runs.
- **Before releasing**: run the local gates that the [verification ledger](../odd/verification-ledger.md) shows as stale (`typecheck`, `lint`, `test`, `depcruise`, the web build, `check:js-budget`, `test:white-label`, `check:dev-cold-start`, `test:e2e`, `test:lighthouse`), following the touch-scoped rule in [`TESTING.md`](TESTING.md); a gate whose files did not change since its last green entry is not repeated, because the CI on `main` runs everything once more before the deploy. Bring `changelog.json` up to date (`CLAUDE.md` explains how to find the commits that are missing).
- **Release**: what is on `develop` goes to `main`. That push is the **only** thing that triggers the CI (`static`, `e2e` and `lighthouse` in parallel → `checks` → `deploy`). The deploy goes straight to production and is checked with `.github/scripts/smoke-check.sh`, with an automatic rollback if it fails.

```bash
git fetch origin
git checkout main && git merge --ff-only develop && git push origin main
git checkout develop
```

The `main` rules require a **linear history** (no merge commits). If `main` and `develop` diverged (for example a PR merged with *squash*), a fast-forward is not possible; publish a single commit with `develop`'s tree:

```bash
git fetch origin
SHA=$(git commit-tree develop^{tree} -p origin/main -m "chore(release): release summary" -m "develop: $(git rev-parse develop)")
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
