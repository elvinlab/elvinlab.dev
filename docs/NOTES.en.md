# How to create a note (post)

[Español](NOTES.md) · **English**

This guide explains, step by step and in detail, how to write and publish a **Lab Notes** note. For the rest of the site's configuration, see the [configuration guide](CONFIGURATION.en.md).

- [The 9-step summary](#the-9-step-summary)
- [1. What a note is here](#1-what-a-note-is-here)
- [2. Creating the draft](#2-creating-the-draft)
- [3. The frontmatter, field by field](#3-the-frontmatter-field-by-field)
- [4. The decision record](#4-the-decision-record)
- [5. Writing the body](#5-writing-the-body)
- [6. Seeing the result](#6-seeing-the-result)
- [7. What the site does for you](#7-what-the-site-does-for-you)
- [8. Translating a note](#8-translating-a-note)
- [9. Publishing](#9-publishing)
- [10. Editing or retiring a published note](#10-editing-or-retiring-a-published-note)
- [11. Checklist before publishing](#11-checklist-before-publishing)
- [12. Common errors](#12-common-errors)

## The 9-step summary

1. Create the draft: `mise exec -- pnpm new-post "Note title"`.
2. Start the site: `mise exec -- pnpm --filter web dev` and open `http://localhost:4321/notes/<slug>/` (drafts only exist in development).
3. Fill in the frontmatter and the **decision record** (sections 3 and 4).
4. Write on **one** concrete decision, starting with the problem. There is no word limit: the draft suggests about 500 words, but a longer note is fine when the decision needs it (note 003 has about 1,500).
5. Check the result on desktop and phone, in light and dark theme, and in reading mode.
6. Rehearse the publication: `mise exec -- pnpm publish-note <slug> --dry-run` (changes nothing).
7. Publish: `mise exec -- pnpm publish-note <slug>`. It moves the folder, sets today's date, adds the changelog entry, builds, commits and releases.
8. Wait for CI: a note takes the fast lane (a few minutes, no `e2e` or Lighthouse).
9. Check the note live (share card and comments).

## 1. What a note is here

Lab Notes **documents decisions and their reasoning**, not generic tutorials. Each note is a numbered entry ("Note 001") written in **one language** and summarized by a *decision record* (context, decision, outcome) shown before the text.

The voice is defined in [`docs/BRAND.md`](BRAND.md) (in Spanish). The rules that matter most when writing:

- **First person, direct and concrete.** Numbers and names, not adjectives ("went from 2.4 s to 1.5 s", not "much faster").
- **Timeless**: nothing that depends on "what I am working on this month".
- **Frameworks are named as tools**, not as a professional identity.
- **Humor in measure**; it does not compete with the content.
- **Never announce a project that does not exist yet**, never link a **private** repository, and never write your email in plain text (contact is `/contact`).

## 2. Creating the draft

```bash
mise exec -- pnpm new-post "Why I dropped X"                       # Spanish (default)
mise exec -- pnpm new-post "Why I dropped X" --lang en              # English
mise exec -- pnpm new-post "Why I dropped X" --lang en --number 3   # translation: reuses the number
```

What the command does:

- Creates `apps/web/src/content/drafts/<slug>/index.mdx`. The **slug** comes from the title: no accents, lowercase and hyphenated (`Why I dropped X` → `why-i-dropped-x`). If a note or draft with that slug already exists, it refuses to continue.
- Assigns the **next number** after the highest among notes and drafts (or the one you ask for with `--number`).
- Sets `pubDate` to **today's local date** and fills the frontmatter with valid sample values, so the draft already renders in development.
- Leaves a guide sentence in the body: *write about 500 words on one concrete decision; start with the problem.*

> **Drafts are not in git.** The `drafts/` folder is ignored on purpose: drafts never reach the repository or production, and so they are not backed up either. Make a copy if the draft is long.

## 3. The frontmatter, field by field

It is the block between `---` at the top of the file. The site validates it at build time: an invalid value breaks the build and names the file and the field. The table is generated from the schema:

<!-- docs:start note-frontmatter -->
| Key | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| `number` | `integer` | yes |  | Entry number shown as `Nota 001`; a translation reuses the number of its original. |
| `title` | `string (max 90)` | yes |  | Note title (max 90 characters): the page title and the headline of the share card. |
| `description` | `string (max 160)` | yes |  | One sentence for search results and link previews (max 160 characters). |
| `pubDate` | `date (YYYY-MM-DD)` | yes |  | Publication date. Notes with the same date sort by number, highest first. |
| `updatedDate` | `date (YYYY-MM-DD)` | no |  | Date of the last meaningful edit; must not be earlier than `pubDate`. |
| `lang` | `'es' \| 'en'` | yes |  | Language the note is written in (one language per note). |
| `translationOf` | `string` | no |  | Slug of the same note in the other language. One side is enough (the link works both ways). Both notes then point at each other with hreflang and the language switch goes to the translation. The target must be published too, or the build fails. |
| `category` | `string` | yes |  | One category in kebab-case (for example `decisiones`); shown above the title and used to group the index. |
| `tags` | `string[] (max 5)` | no | `[]` | Up to five kebab-case tags. |
| `startHere` | `1 \| 2 \| 3` | no |  | Marks the note as a start-here entry point and sets its order (1 to 3). Each value can be used once per language; requires `startHereNote`. |
| `startHereNote` | `string (max 120)` | no |  | One line saying why to start with this note (max 120 characters); required when `startHere` is set. |
| `decision` | `object` | yes |  | Decision record shown before the text: context, decision and outcome. |
| `decision.context` | `string (max 280)` | yes |  | What forced a decision (max 280 characters). |
| `decision.decision` | `string (max 280)` | yes |  | What you chose and what you ruled out (max 280 characters). |
| `decision.outcome` | `string (max 280)` | yes |  | What happened next (max 280 characters). |
<!-- docs:end note-frontmatter -->

A complete example, taken from a real note:

```yaml
---
number: 1
title: "How I built this site: decisions, budgets and a CI I kept simplifying"
description: "From plan to production in under a week: what I decided, what I measured and what broke."
pubDate: 2026-10-01
lang: en
category: decisions
tags: [astro, cloudflare, architecture, ci, testing]
decision:
  context: "I had a previous site that worked, but wanted a reusable, measurable base."
  decision: "Rebuild from scratch: monorepo, identity by configuration and budgets in CI."
  outcome: "In production since October 1, 2026, with mobile Lighthouse of 95 or more."
---
```

Details that avoid mistakes:

- **`title`**: in double quotes (colons and other signs break unquoted YAML). Maximum 90 characters. It is the page title, the headline of the share card and the search result text: make it concrete.
- **`description`**: one sentence, maximum 160. It is what someone sees in search results and in the link preview. Do not repeat the title.
- **`pubDate`**: `YYYY-MM-DD` format (the draft writes it unquoted). Two notes with the same date are ordered by number (the higher number first).
- **`number`**: the first note is 1. A translation reuses the original's number.
- **`category`**: just one, lowercase and hyphenated. There is no closed list; **keep using the same ones** you already have (the ones in the index sidebar) so they group well.
- **`tags`**: up to five, lowercase and hyphenated. They are used to compute "Keep reading".
- **`startHere` and `startHereNote`**: optional, set together. They mark the note as an entry point (section 3.1).
- **`updatedDate`**: only when you make a relevant edit to a published note (section 10).
- **`translationOf`**: the slug of the same note in the other language (section 8). Setting it on one of the two notes is enough.

### 3.1. "Start here" notes

`/notes/` opens with a "Start here" block of three notes, and the end of every note shows "Keep reading": those same notes first (unless the reader just saw them as previous/next), then related ones. They are chosen with two fields in the note itself:

```yaml
startHere: 2
startHereNote: "My thesis: understand and write down the intent before asking an AI for code."
```

- `startHere` is the order: `1`, `2` or `3`, each used once per language. `startHereNote` is the one-line reason (at most 120 characters) and is required whenever `startHere` is set.
- With fewer than three flagged in a language, the most recent notes of that language fill the rest (and the build prints a warning). The block is never empty and never stale.
- The build **fails** on a duplicate `startHere` in the same language, a missing reason, or a value outside 1 to 3.
- **How to choose**: a note that works as a way in for someone who does not know the site: the overview, the thesis and one concrete case with numbers. Publishing an ordinary note needs no change; review the flags only when a better entry point appears (in practice, every few notes).
- To change a flag, remove `startHere` and `startHereNote` from the old note and set them on the new one; if you retire a flagged note, the block fills itself.

### 3.2. Topics (static pages)

Tags filter in the browser (`/notes/?tag=x`), but a filter is not a page a search engine can index. **Topics** are: `/notes/tag/<topic>/` is a static page with its own title, description, an introduction you write and the list of its notes (newest first), with breadcrumbs (`BreadcrumbList`) and a sitemap entry. They are defined in `apps/web/src/content/topics.json`, an object keyed by the URL slug:

```json
"rendimiento-y-verificacion": {
  "title": "Rendimiento y verificación",
  "description": "Up to 160 characters for the search engine.",
  "intro": "Between 40 and 80 words written by you, unique to this topic.",
  "tags": ["rendimiento", "lcp", "lighthouse", "testing"]
}
```

- `tags` are **raw** note tags: several can point to one topic, and a note belongs to the topic when **any** of its tags is listed. A note can be in several topics. Every listed tag must exist in some note.
- A topic has a page only when it has an `intro` and at least `notes.topicMinNotes` Spanish notes (2 by default; set it in `site.config.ts`, section 3 of `CONFIGURATION.md`). Otherwise it is not generated, it is not in the sitemap and its chips keep pointing to the filter; the build prints a warning.
- Tag chips (on notes, on `/notes/` and in the sidebar) link to the topic page when the tag belongs to a topic that exists; if it belongs to two, the first in the file wins. `/notes/` shows a short "Topics" list so search engines reach the pages. `/notes/?tag=x` keeps working and its canonical points to `/notes/`.
- The build **fails** when a topic lists a tag no note carries, repeats a slug, uses a reserved slug (`page`, `tag`, `tags`) or one that is not kebab-case, when `description` is over 160 characters or when `intro` is not 40 to 80 words.
- **When to create a topic**: when several notes tell one story and you can write an introduction that says something the notes alone do not. A topic per tag is not the goal: thin pages hurt more than they help.

## 4. The decision record

Three sentences of **at most 280 characters** each; they are shown in three columns before the text. It is the first thing people read, so it works as a standalone summary:

| Field | Question it answers | Example |
| --- | --- | --- |
| `context` | What forced you to decide? | "I had a previous site that worked, but wanted a reusable, measurable base." |
| `decision` | What did you choose and what did you rule out? | "Rebuild from scratch: monorepo, identity by configuration and budgets in CI." |
| `outcome` | What happened next, with numbers? | "In production since October 1, 2026, with mobile Lighthouse of 95 or more." |

A good sign: if someone reads only these three sentences, they understand the decision. A bad one: adjectives without data ("a much better solution").

## 5. Writing the body

The body is **Markdown with MDX**. Stay with standard Markdown; the only custom pieces are the two ink components below ("Notebook ink").

**Structure**

- **Do not add a `#` title**: the title comes from the frontmatter.
- Use `##` for the main sections: they form the **side table of contents with progress** and get an automatic anchor. Use `###` for subsections (they do not appear in the table of contents).
- One idea per section. Notes run from about 500 to 1,500 words and the length is the author's call, not a limit; the draft's guide asks you to start with the problem.

**Available formatting** (verified with a test note):

- Paragraphs, **bold**, *italics* and `inline code`.
- Bulleted, numbered and task lists (`- [ ]`).
- Quotes with `>`: drawn with a pink bar; use them for the key idea.
- Footnotes (`text[^1]` and `[^1]: ...`).
- Tables: they render, but have **no site-specific styling** and on phones may look plain or overflow. Prefer lists; if you use one, look at it at 360 px.

**Code**

Blocks with a language, and optionally a title and line marks (provided by Expressive Code, with a copy button and light and dark themes):

````md
```ts title="adapters/turnstile.ts" {2} ins={3}
const a = 1;
const marked = 2;
const added = 3;
```
````

- `title="file.ts"` puts the file name in the frame.
- `{2}` highlights line 2; `ins={3}` / `del={3}` mark it as added or removed.
- For diagrams, use a `txt` block with ASCII art (there is no Mermaid).

**Images**

Put the file next to `index.mdx` and reference it with a relative path:

```md
![Description of what the image shows](./screenshot.png)
```

The site optimizes it on its own (converts it to WebP, sets width and height and loads it lazily) and frames it with the same rounded corners and hairline as its cards. **Always write the alt text.**

Tips, measured on a test note:

- A 1,600 px wide screenshot is enough: a 61 KB PNG became a 21.5 KB WebP, and the text column shows it at about 750 px (about 320 px on a phone). Do not upload originals of several MB.
- Images load lazily and carry their dimensions, so they do not move the text or slow the first paint. Keep the first screen text-only: put images below the first section, never before the title.
- A dark-theme screenshot sits fine in both themes because of the hairline frame; avoid screenshots with a transparent background.
- **Check before publishing that the image shows no email address, token, private repository or personal data.**
- The share card is generated from the title, not from the images of the note.

**Links**

- To another note: `/notes/other-slug/`. To an external site: the full URL.
- Never link private repositories or write an email.

**What every note gets automatically, and the `~~strike~~` convention**

Without touching the content, every note (existing and future) looks like a lab notebook: `##` headings carry a pink mono number (`01`, `02`, the same as the sidebar table of contents, hung in the margin from medium screens and above the heading on phones), **bold text** gets a soft marker band, links in running text are underlined by hand (and redrawn on hover or focus), the `>` quote is a margin note with an irregular stroke, and `---` is a wavy line. And `~~text~~` in Markdown strikes a mistake in ink (`<del>`), the same as `Fix`: use it to strike with no import. It is all CSS, honors "reduce motion", reading mode puts the numbers above the heading, and on paper everything falls back to plain rules.

**Notebook ink (`Fix` and `Ink`)**

Two optional components give the text a lab-notebook look. Import them at the top of `index.mdx`, right after the frontmatter:

```mdx
import Fix from '@/features/notes/components/Fix.astro';
import Ink from '@/shared/ui/Ink.astro';

I ran <Fix wrong="pnpm run publish" right="pnpm publish-note" /> and it did not exist.
What I take away: <Ink>a mistake corrected out loud teaches more</Ink>.
My motto: <Ink variant="circle">I write down what goes wrong</Ink>.
```

- `Fix` shows the struck-through mistake with the correction next to it. For screen readers it reads "wrong, corrected to, right" (in Spanish, "corregido a"): it uses `<del>` and `<ins>` plus a hidden label taken from the note's language. Pass `label="..."` only if you need different wording.
- `Ink` underlines by hand (it may wrap over several lines). `variant="circle"` rings the phrase: **only for short single-line phrases**, because it never wraps.
- **Density:** at most one ink effect per screen block and a handful per note; more and it stops being a signature and becomes decoration.
- The strokes are decorative (`aria-hidden`), never change the text, draw once and, under "reduce motion", appear already drawn. Nothing else to set up: the CSS ships only on pages that use the components.

## 6. Seeing the result

```bash
mise exec -- pnpm --filter web dev
```

In development, the `/notes/` index shows **notes and drafts** together. Check:

- **Desktop and phone**: open the browser tools and try a 360 px width.
- **Light and dark theme**: with the menu button.
- **Reading mode**: the button at the top of the note. Check the text reads well in a single column.
- **Side table of contents, decision record and previous/next.**

Two things you will **not** see in development:

- **The share card**: it is generated at build time. To see it, publish the note (section 9), run `mise exec -- pnpm --filter web build` and open `apps/web/dist/client/og/notes/<slug>.png`.
- **Real comments**: the section loads the real Giscus. **Do not post test comments from `localhost`**: they would create a real thread in the repository.

## 7. What the site does for you

When you publish a note **you do not have to do anything else** for this:

- It shows up in the **index** (grouped by year) with its language badge, and the "Notes" menu entry appears with the first published note.
- **Reading time** (at 220 words per minute) and **date** in the header.
- **Side table of contents** with the `##` sections, **share buttons** (copy link, X, WhatsApp and LinkedIn: plain links with no third-party script; X and WhatsApp pre-fill the message with the note title) and **"Keep reading"**: up to three notes in the same language, first those flagged "Start here", then those sharing tags (weighted double) or category; it never repeats the current note or the previous and next ones.
- **Previous / Next** between notes of the same language.
- If the note has a translation: **`hreflang`** between both and a direct **language switch** (section 8).
- **Comments and reactions** (if Giscus is configured): the thread is tied to the note's path.
- Its own **share card** (1200 × 630) with "Note 001", the title, your name and the date.
- **Search and social metadata**: `article` type, dates, tags and `BlogPosting` structured data with image and author.
- **RSS** (`/rss.xml`) and **sitemap**.

## 8. Translating a note

A translation is **another note** in the other language, not a switchable version:

```bash
mise exec -- pnpm new-post "Why I rebuilt my site from scratch" --lang en --number 1
```

- Reuse the **same number** as the original and write the text in the other language (adapt it, do not translate word for word).
- An English note is served at `/en/notes/<slug>/` and appears in the **index** (a single one, in Spanish) with its language badge. There is no English index.
- Each language has its own comment conversation, and "related" and "previous/next" only walk notes of the same language.
- Link them with `translationOf`: on the translation put the original's slug (or the other way round; **one side is enough**, it works in both directions). With three languages or more, they all end up in the same group.
- The two notes then declare each other with `hreflang` (plus `x-default`, pointing at the default-language version), and the **navbar language switch** and the **language suggestion** go straight to the translation instead of the other language's home. A note without a translation still goes to the home.
- The **slugs can differ** per language (`por-que-descarte-x` and `why-i-dropped-x`).
- If `translationOf` points to a note that does not exist (for example an unpublished draft), **the build fails** naming the notes: publish both together or remove `translationOf` until then. It also fails if a note translates itself, if the translation is in the same language or if two notes of the same language end up in one group.

## 9. Publishing

**The normal way: one command.** With the note finished and a clean git tree, on `develop`:

```bash
mise exec -- pnpm publish-note <slug> --dry-run   # rehearsal: prints the steps and changes nothing
mise exec -- pnpm publish-note <slug>             # publishes
```

It does the following in order and stops at the first failure: moves `drafts/<slug>` to `notes/<slug>`, sets `pubDate` to today's local date, adds the `note-NNN` entry to `changelog.json`, builds and checks the size budgets (the build validates the frontmatter and `translationOf`; if anything fails the note goes back to `drafts/`), dates the changelog, commits `feat(notes): publish "Title"`, runs the changelog audit, pushes `develop` and releases to `main`. **Running it is your authorization to push to `main`.** With `--no-release` it stops after the local commit.

That push triggers CI through the **notes-only fast lane** ([ADR 0016](adr/0016-publish-note-command-and-notes-fast-lane.md)): when the push only touches published notes and the changelog, `e2e` and Lighthouse are skipped and `static`, `notes-gate` (build and weight budgets) and the deploy with its smoke-check run. If the push includes any other change, everything runs. Follow the run with `gh run watch`; if anything fails, there is no deploy.

Afterwards, in production: open the note, check that the card looks right when you share the link (refresh the cache with the [Facebook Sharing Debugger](https://developers.facebook.com/tools/debug/) or the [LinkedIn Post Inspector](https://www.linkedin.com/post-inspector/)) and that comments load. If the subscription is on, tell the list with `SUBSCRIBE_ADMIN_TOKEN=... pnpm notify:note <slug>` (a dry run) and then with `--send` (recipe 6.14).

**The manual way** (if you want to pass every local gate before releasing):

1. Move the folder: `mv apps/web/src/content/drafts/<slug> apps/web/src/content/notes/<slug>` (a plain `mv`: `drafts/` is not in git). The final URL is `/notes/<slug>/`, the same as in the draft.
2. Put the publication date in `pubDate`.
3. Verify: `pnpm test`, `pnpm typecheck`, `pnpm lint`, `pnpm --filter web build`, `pnpm check:page-weight`, `pnpm check:js-budget` and `pnpm test:e2e` (browser tests use isolated test notes; the two size checks inspect the real build).
4. Check the card: `apps/web/dist/client/og/notes/<slug>.png`.
5. Commit, with a conventional message: `feat(notes): publish "Title"`. If you want to tell visitors, add an entry to `changelog.json` (configuration guide, recipe 6.4).
6. Push to `develop` and release to `main` ([configuration guide, section 7](CONFIGURATION.en.md#7-releasing-and-rolling-back)).
   If the subscription is on, once it is released tell the list with `SUBSCRIBE_ADMIN_TOKEN=... pnpm notify:note <slug>` (a dry run) and then with `--send` (recipe 6.14).
7. Once in production: open the note, check that the card looks right when you share the link (refresh the cache with the [Facebook Sharing Debugger](https://developers.facebook.com/tools/debug/) or the [LinkedIn Post Inspector](https://www.linkedin.com/post-inspector/)) and that comments load.

## 10. Editing or retiring a published note

### Size checks when publishing

Adding notes or extending their text does not require editing the HTML budget on each release.
`check:page-weight` budgets the rendered article body separately from the fixed page shell and
scales the index allowance with its actual note count. CSS, JavaScript and Lighthouse thresholds
stay unchanged. The report includes article bytes or row count next to total HTML; see
[Content-aware notes budgets](TESTING.md#content-aware-notes-budgets-2026-10-11).

If `article` fails, inspect long code blocks and content: the rendered body has a 64 KiB ceiling.
If total note HTML fails while its body is within that limit, the fixed shell grew. If the index
reaches 180000 B, paginate or simplify it. Do not raise ceilings automatically or move interface
elements inside the content boundaries. Measure the actual URL for unusually large images or
code-heavy articles: Lighthouse's synthetic notes do not cover every real article.

- **Editing**: change the text and add `updatedDate` with today's date (it cannot be earlier than `pubDate`). It shows on the note and in the metadata. `publish-note` only publishes drafts: for an edit, commit on `develop` and release by hand ([configuration guide, section 7](CONFIGURATION.en.md#7-releasing-and-rolling-back)). If the push only touches notes it still takes the fast lane.
- **Do not change the slug** (the folder name): it is the URL and the site has **no redirects**; links and comments point to it.
- **Retiring**: move the folder back to `drafts/` (it stops being published on the next release) or delete it. The URL will return 404. There is no command for this either: commit and release by hand.

## 11. Checklist before publishing

- [ ] One decision only, starting with the problem; numbers and names, not adjectives.
- [ ] `title` ≤ 90, `description` ≤ 160, each `decision` field ≤ 280, at most 5 `tags`.
- [ ] `category` and `tags` lowercase and hyphenated, consistent with your other notes.
- [ ] `pubDate`: `publish-note` sets it to today; for a manual publication, the real date in `YYYY-MM-DD` format.
- [ ] No `#` title; sections with `##`.
- [ ] Every image has alt text, is about 1,600 px wide at most and shows no private data.
- [ ] No private repository, no email, no project that does not exist yet.
- [ ] If it has a translation, `translationOf` points to a note that is published too.
- [ ] It reads well at 360 px, in light and dark theme and in reading mode.
- [ ] `pnpm test`, `typecheck`, `lint` and `build` pass (`publish-note` already runs the build; the rest is for the manual way).
- [ ] After the real build, `pnpm check:page-weight` and `pnpm check:js-budget` pass. `publish-note` already runs them right after the build (a few seconds), so a note that is too heavy fails before anything is pushed; CI (`notes-gate`) repeats them.
- [ ] The card in `dist/client/og/notes/<slug>.png` looks right.

## 12. Common errors

| What you see | Cause and fix |
| --- | --- |
| The build fails naming a field | The frontmatter breaks the schema (limits in section 3). The message gives the file and field |
| `title` breaks the YAML | The title needs double quotes |
| The note does not show in `/notes/` | It is in `drafts/` and you are not in development, or `index.mdx` is missing inside the folder |
| The note shows but with a strange date | `pubDate` must be in `YYYY-MM-DD` format (not `10/01/2026`) |
| The share card does not exist in development | That is normal: it is only generated when building published notes (section 6) |
| Comments do not show up | See recipe 6.5 of the configuration guide |
| The image does not show | The relative path is wrong or the file is not next to `index.mdx` |
| The build says "says it translates ... which does not exist" | `translationOf` points to a slug that does not exist or is a draft: publish both notes or remove `translationOf` |
| The table looks plain on a phone | Tables have no styling of their own: replace it with a list |
| `publish-note` says "run it on the develop branch" or "uncommitted changes" | It must run on `develop` with a clean tree (drafts do not count: `drafts/` is ignored). Commit or stash and retry |
| `publish-note` says "no draft at ..." or "already exists" | The slug does not match a folder in `drafts/`, or a published note with that slug or a `note-NNN` changelog entry already exists |
| `publish-note` says "the build or a size budget failed; the note was moved back to drafts" | Fix the error the build or budget printed (a field, `translationOf` or weight, section 10) and retry; nothing was left half-done |
| The note's CI ran `e2e` and Lighthouse | The push included more than notes and the changelog (for example `topics.json` or code): that release uses every gate. Check the `changes` job summary |
| `notes-gate` fails on weight | Unlikely (`publish-note` already checked), but possible on a manual edit: see section 10, "Size when publishing". There was no deploy: fix it, commit and release again |
