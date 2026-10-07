# Portfolio guide: profile and experiments

[Español](PORTFOLIO.md) · **English**

An "I want to change X: which file, which field, an example" guide for what a recruiter or visitor sees: the `/me` page, the experiments page and its rows on `/me`. The per-field reference tables are generated from the code in [CONFIGURATION.en.md](CONFIGURATION.en.md) (`pnpm docs:config`); this guide has the steps and the examples to copy.

- [1. Where everything lives](#1-where-everything-lives)
- [2. Edit the `/me` profile](#2-edit-the-me-profile)
- [3. Add or edit an experiment](#3-add-or-edit-an-experiment)
- [4. Pagination and tiers of the list](#4-pagination-and-tiers-of-the-list)
- [5. Experience entries](#5-experience-entries)
- [6. Credentials and education](#6-credentials-and-education)
- [7. Checklist before publishing](#7-checklist-before-publishing)
- [8. Limits and errors](#8-limits-and-errors)

## 1. Where everything lives

| I want to change... | File | Field or folder |
| --- | --- | --- |
| Name, role, bio, location, photo | [`apps/web/src/site.config.ts`](../apps/web/src/site.config.ts) | `identity` (`name`, `role`, `bio`, `location`, `avatar`, `photo`) |
| Headline, pitch, at-a-glance facts, "what I bring" | `site.config.ts` | `me.headline`, `me.pitch`, `me.intro`, `me.facts`, `me.strengths` |
| Availability and CV | `site.config.ts` | `recruiter.status`, `recruiter.lookingFor`, `recruiter.cvUrl` |
| Spoken languages, timezone, work mode | `site.config.ts` | `me.languages`, `me.timezone`, `me.workMode` |
| Stack (tool groups) | `site.config.ts` | `me.stack` |
| Work experience | `apps/web/src/content/experience.json` | one key per role |
| Experiments (projects) | `apps/web/src/content/experiments.json` | one key per experiment |
| Images of an experiment | `apps/web/src/assets/experiments/<key>/` | files listed in `images` |
| Page size, featured limit, `/me` rows, page intro and words | `site.config.ts` | the `experiments` block |
| Notes | `apps/web/src/content/notes/<slug>/index.mdx` | see [NOTES.en.md](NOTES.en.md) |
| Certificates and degrees (shown on `/me` today) | `apps/web/src/content/credentials.json` | one key per credential |
| Display names of experiment tags (`ai-agents` shows "AI agents") | `apps/web/src/features/portfolio/lib/experiments.ts` | `EXPERIMENT_TAG_LABELS` |
| Generic interface labels (buttons, statuses, "More experiments", the pager) | `apps/web/src/shared/i18n/index.ts` | `experiments.*`, `exp.status.*`, `me.*` keys |

Rule: **the owner's voice goes in config or content; generic interface labels go in the i18n dictionary.** No component has owner sentences written inside.

## 2. Edit the `/me` profile

Everything is in `site.config.ts`. Texts are one object per language (the default language is required):

```ts
me: {
  headline: { es: 'Ingeniero de software full-stack, con enfoque en frontend.', en: 'Full-stack software engineer with a frontend focus.' },
  pitch: { es: 'Desarrollo interfaces, servicios y herramientas para productos web.', en: 'I build interfaces, backend services and tools for web products.' },
  languages: { es: 'Español nativo · Inglés B1', en: 'Spanish native · English B1' },
}
```

- **Availability:** `recruiter.status` is the short label ("Collaborations and projects") and `recruiter.lookingFor` the sidebar line. `recruiter.available: false` hides the whole line.
- **CV:** `recruiter.cvUrl` takes one https URL or one per language. With no CV the button does not render.
- **Stack:** each `me.stack` group has `label`, `items` and, optionally, `icon` and `hint` (the tooltip sentence). To keep `/me` fast, do not add icons or tooltips per tool.
- **Photos:** `identity.avatar` and `identity.photo` are file names inside `apps/web/src/assets/`.

## 3. Add or edit an experiment

1. **Pick the key** (lowercase with hyphens, for example `my-project`): it is the identifier, the anchor on its generated experiments page and the name of the images folder. Entries shown on `/me` stay on page 1 (`/experiments/#my-project`); other entries can appear on later pages.
2. **Copy the images** (your own screenshots only, 1280 x 800, 16:10) to `apps/web/src/assets/experiments/my-project/`. Never to `public/`: that way they are optimized and a missing file breaks the build. Policy and reasons: [DESIGN.md](DESIGN.md#images-of-experiments-and-credentials-policy-2026-10-06) and [ADR 0015](adr/0015-images-live-in-the-repository.md).
3. **Add the entry** to `apps/web/src/content/experiments.json` with this template (it uses every field; delete what you do not need, only `title`, `description` and `year` are required):

```json
{
  "my-project": {
    "title": "my-project",
    "subtitle": { "es": "Una línea corta bajo el título", "en": "A short line under the title" },
    "description": {
      "es": "Qué es, en una o dos frases.",
      "en": "What it is, in one or two sentences."
    },
    "problem": { "es": "El problema que resuelve.", "en": "The problem it solves." },
    "contribution": { "es": "Lo que hice yo, no las herramientas ni el equipo.", "en": "What I did myself, not tools or teammates." },
    "result": { "es": "Lo que entregó, sin cifras inventadas.", "en": "What it delivered, with no invented numbers." },
    "tags": ["astro", "typescript"],
    "year": 2026,
    "publishedAt": "2026-03-14",
    "status": "shipped",
    "url": "https://example.dev",
    "repo": "https://github.com/user/my-project",
    "note": "slug-of-a-published-note",
    "images": [
      {
        "file": "cover.jpg",
        "alt": { "es": "Captura de la página de inicio", "en": "Screenshot of the home page" },
        "caption": { "es": "Inicio", "en": "Home" }
      },
      {
        "file": "detail.jpg",
        "alt": { "es": "Captura del detalle", "en": "Screenshot of the detail view" }
      }
    ],
    "order": 10,
    "featured": false
  }
}
```

**What the fields that matter do**

- `images[]`: one to four, **in display order**. The first is the cover: `/me` rows, the compact card and the first slide use it. `alt` is required (up to 140 characters); `caption` is optional (up to 120) and shows under the image. One image is a plain figure; two or more are a gallery with thumbnails that works without JavaScript; none gives a typographic cover (never a fake screenshot).
- `featured: true`: the experiment is a **big piece** (gallery, three facts, actions). At most `experiments.maxFeatured` (3 by default). If none is featured, the first entry by the usual order is the big piece.
- `order`: position within the same tier (lower first, 100 by default) and the tie-break of every sort. Featured entries always come first. `publishedAt` (optional, `YYYY-MM-DD`) sets the exact date used to sort by date; without it 1 January of `year` is used.
- `status`: `running` (green dot, "In progress"), `shipped` (violet, "Published") or `archived` (muted, "Archived").
- `note`: slug of a **published** note; adds the "Read the case" button (it names the note's language when it differs from the page's).
- `url` and `repo`: https only; never a private repository. Leave both out for private work.
- `tags`: up to 5 in kebab-case; big pieces show 3 and compact cards 2. For a nice name (`ai-agents` to "AI agents") add the tag to `EXPERIMENT_TAG_LABELS`; otherwise it shows as written.

**Validation errors you will see (they break the build and name the field)**

- `N experiments are featured (a, b, c, d), but at most 3 may be ...`: more featured entries than `experiments.maxFeatured`; set `featured: false` on the others or raise the limit.
- `Experiment "x" points to note "y", which is not published`: the note does not exist or is still a draft.
- `experiment "x" points to an image src/assets/experiments/x/f.jpg, which does not exist`: the file is not in the entry's folder.
- A field out of range (text too long, non-https URL, more than 4 images): the Zod message gives the exact path.

## 4. Pagination and tiers of the list

The list builds itself from the data; there is nothing to configure per page.

- **Big tier:** the `featured` entries (up to `experiments.maxFeatured`). They show as exhibition pieces on page 1 only.
- **Compact tier:** every other entry, as quiet cards (a cover only when the entry has a real image, a status only when it is not "Shipped", up to two tags). They are grouped by year only when the visible page holds two or more years and the sort is by date.
- **Static pagination:** page 1 (`/experiments/`, `/en/experiments/`) holds every big piece and the first `experiments.perPage` cards (12 by default). When there are more cards, the next pages live at `/experiments/page/2/`, `/experiments/page/3/` ... (and the `/en/...` twins), with `experiments.perPage` cards each and no big pieces. **Extra pages exist only when needed**: with up to `perPage` compact cards none is generated and no pager renders. `/experiments/page/1/` does not exist (it answers 404; page 1 is the base URL). Every page has its own title, description, canonical, hreflang and `rel="prev"`/`rel="next"`, and is in the sitemap.
- **Sorting:** `experiments.defaultSort` (`newest` by default), `experiments.sorts` (the sorts a visitor can choose: `newest`, `oldest`, `title` A to Z) and `experiments.sortFrom` (4 by default). The sort applies to the compact cards only; the big pieces always lead page 1. An entry's date is `publishedAt` (`YYYY-MM-DD`, optional) or, when missing, 1 January of its `year`; ties go to `order`, then the key. The "Sort" switch and the pages of the other sorts (`/experiments/oldest/`, `/experiments/oldest/page/2/` and the `/en/...` twins) exist only when the compact cards number at least `sortFrom` and more than one sort is enabled. Those pages carry `noindex, follow`, a self canonical and are not in the sitemap: the default sort is the only indexable one, so there is no duplicate content. Everything is real links, with no client-side sorting or filtering.
- **`/me` rows:** `experiments.meRows` (3 by default). The first entries by the usual order always stay on page 1, so the `/experiments/#<id>` links never point at another page. `meRows` never exceeds `perPage`: a larger value is lowered to `perPage`.
- **Cost:** the 30- and 100-entry stress fixtures measured 929 and 919 bytes (about 1 KB) of marginal HTML per compact card, comparing page 2 and later only (page 1 also holds the big pieces and has another shell). It depends on the content of each entry. Measure your own entries; lazy images and off-screen rendering do not remove HTML download or parse costs.
- **When filters or tag pages would be added** (not implemented): above about 24 entries, or once the tags are varied; always as static pages `/experiments/tag/<tag>/`, never client-side filtering.
- **Try it with many:** `pnpm stress:experiments [count]` generates entries in a temporary workspace (it never touches your files), builds and reports pages, HTML bytes and cost per card; see [TESTING.md](TESTING.md#stress-the-experiments-list-pnpm-stressexperiments).

### Reusing the listing kit (for Education or any other list)

Sorting, pagination and their controls are generic and live in `shared/`; Experiments is only the first user. For a new list:

1. **Pure logic** (`apps/web/src/shared/lib/listing.ts`, tested): `sortItems(items, key, comparators)` (stable), `paginate(items, { perPage, leading?, pinned? })`, `pageWindow(current, total)`, `summaryRange(page, perPage, total)`, `listingPath({ base, sort, defaultSort, page })` and `availableSorts(...)`. They know nothing about config or Astro.
2. **A list adapter** (like `features/portfolio/lib/pagination.ts`): define your list's comparators (all ending in the same tie-break: `order`, then the id), which entries are the "leading" content of page 1, and call the kit. A thin file with its tests.
3. **Settings**: a block in `site.config.ts` with `perPage`, `defaultSort`, `sorts` and `sortFrom` (same schema as `experiments`; the sort keys are those of `LISTING_SORTS`), then `pnpm docs:config`.
4. **Static routes**: a base page, `page/[page]`, `[sort]` and `[sort]/page/[page]` (and the `/en/` twins), each with a `getStaticPaths` that generates only what exists: the routes of an alternate sort only when it is enabled and the list reaches `sortFrom`. Alternate sorts carry `noindex, follow`, a self canonical, `prev`/`next` inside the same sort, hreflang to the same sort and page, and stay out of the sitemap (`sitemap-filter.ts`).
5. **UI**: `shared/ui/Pager.astro`, `SortSwitch.astro` and `ListingSummary.astro` with your URLs and labels (`listing.*` in the dictionary). They are real links (the current one has `aria-current`); there is no client-side sorting or filtering.
6. **Tests**: copy the pattern of `pnpm stress:experiments` for your list (pages, links, canonical, `noindex` and no routes for disabled sorts).

Header texts of the page (optional, defaulting to the dictionary):

```ts
experiments: {
  perPage: 12,
  maxFeatured: 3,
  meRows: 3,
  defaultSort: "newest",
  sorts: ["newest", "oldest", "title"],
  sortFrom: 4,
  intro: { es: 'Proyectos que construí, decisiones que tomé y lo que aprendí.', en: 'Projects I built, decisions I made and what I learned.' },
  words: { es: ['construir', 'probar', 'aprender', 'repetir'], en: ['build', 'test', 'learn', 'repeat'] },
},
```

`words` is the decorative comment stack beside the title (desktop only, 1 to 6 words per language, the `// ` is added for you).

These settings are the editorial tunables, not every presentation constant. Gallery limits (1-4 images), visible tag counts (3 on big pieces, 2 on compact cards), the seven-page pager window, image dimensions and grid breakpoints remain schema/component rules. The `/me` notes preview still takes three notes; `experiments.meRows` controls experiments only. Changes to those rules require code and relevant tests, not another `site.config.ts` field.

## 5. Experience entries

`apps/web/src/content/experience.json`, one key per role. Without `end` it is the current role.

```json
{
  "my-company": {
    "role": { "es": "Desarrollador full-stack", "en": "Full Stack Developer" },
    "company": "My company",
    "start": 2024,
    "location": "Remote",
    "summary": { "es": "Una línea honesta de lo que haces (hasta 280 caracteres).", "en": "One honest line about what you do." },
    "tags": ["typescript", "cloudflare"]
  }
}
```

Contributions and outcomes you have not validated are not published: no invented numbers, users or team sizes.

## 6. Credentials and education

Today credentials show on `/me`, grouped by year (needs `features.credentials`). They are edited in `apps/web/src/content/credentials.json`:

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

The dedicated education page (`/education/`) is planned and does not exist yet; when it lands this guide gets its section.

## 7. Checklist before publishing

1. **Privacy:** no email address in tracked files (contact goes through `/contact`), no private repository named or linked, screenshots without personal or third-party data.
2. **Validated texts:** the contribution, the result and any numbers are true and you reviewed them; what is still to be validated is not published.
3. **Images:** your own, in `apps/web/src/assets/experiments/<key>/`, with `alt` (policy in [DESIGN.md](DESIGN.md#images-of-experiments-and-credentials-policy-2026-10-06) and [ADR 0015](adr/0015-images-live-in-the-repository.md)).
4. `pnpm docs:config` if you changed a schema or `shared/config/env-vars.ts`.
5. `pnpm test` (and `pnpm typecheck` / `pnpm lint`).
6. `pnpm verify` (prints the verification plan for the uncommitted work; `--run` executes it).
7. **Changelog:** one entry in `apps/web/src/content/changelog.json` for every visible change, in English, on the day it reaches production.
8. Releasing to `main` follows section 7 of [CONFIGURATION.en.md](CONFIGURATION.en.md).

## 8. Limits and errors

| What | Limit | What happens if you exceed it |
| --- | --- | --- |
| `experiments.perPage` | integer 4 to 48 (12 by default) | the build fails and names the field |
| `experiments.maxFeatured` | integer 1 to 6 (3 by default) | the build fails; more featured entries than the limit also fails |
| `experiments.meRows` | integer 1 to 6 (3 by default), never more than `perPage` | above `perPage` it is lowered to `perPage` |
| `experiments.defaultSort` | `newest`, `oldest` or `title` (`newest` by default), must be in `sorts` | the build fails and names the field |
| `experiments.sorts` | at least one of `newest`, `oldest`, `title` | the build fails; with a single sort the switch does not render |
| `experiments.sortFrom` | integer 2 to 48 (4 by default) | below that many compact cards there is no switch and no alternate-sort pages |
| `publishedAt` of an experiment | a valid `YYYY-MM-DD` date | the build fails |
| `experiments.intro` | text per language (default language required) | the build fails if the default language is missing or an unsupported one is present |
| `experiments.words` | 1 to 6 words per language, up to 24 characters each | the build fails |
| `images[]` of an experiment | one to four, file name without folders | the build fails; a missing file fails too |
| `description`, `problem`, `contribution`, `result`, `subtitle` | up to 200 characters per language | the build fails |
| `images[].alt` / `caption` | up to 140 / 120 characters | the build fails |
| `tags` | up to 5, kebab-case | the build fails |
| `url`, `repo` | https only | the build fails |
| `note` | slug of a published note | the build fails |
| Experience `summary` | up to 280 characters per language | the build fails |
