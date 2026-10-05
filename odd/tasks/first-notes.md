# First two Lab Notes (in Spanish)

## Objective and authorization
The user asked on 2026-10-01 for two published notes, in Spanish and well written, so the Giscus comments can be tried on real pages: (1) the process of building this blog/portfolio and (2) their public repo `agentic-dev-setup`. Local commits on `feat/first-notes` and a push to `develop` only; releasing to `main` needs a separate request, and the user reviews the text first because it is written in their voice and goes public.

## Problem and why
The comments feature is live but there are no published notes, so it cannot be seen or tested on production pages. The success criterion of the repo is the blog live with notes.

## Constraints
- Voice from `docs/BRAND.md`: first person, direct, numbers and names instead of adjectives, decisions and their reasoning (not generic tutorials), timeless, frameworks named as tools, never announce projects that do not exist, never link private repositories.
- Facts only from verified sources: `agentic-dev-setup` README and LESSONS (public repo, MIT), this repo's ADRs, `site.config.ts`, code and git history. No invented numbers or feelings.
- Spanish only (one language per note). Body uses headings, lists, titled code blocks and block quotes: `.prose` has no table styling, so no markdown tables.
- Schema limits (`features/notes/schema.ts`): title <= 90, description <= 160, decision fields <= 280 each, tags <= 5 kebab-case.
- Drafts in `content/drafts/` are the user's scratch files (git-ignored); not touched. Published notes live in `content/notes/<slug>/index.mdx`.
- Route: inline by the user's explicit request (writing in their voice); TDD does not apply to prose, so the checks are the schema (build), the existing a11y/e2e/white-label suites and a real-build axe pass over the two pages. RDD off (disabled/unmanaged).

## Tasks
- [x] T1 — Note 001 `como-construi-este-sitio`: decisions, budgets, CI simplification, real bugs, launch gates, working process, comments.
- [x] T2 — Note 002 `agentic-dev-setup`: tiered delegation, OmniRoute combos with local fallback, local model on a 12 GB GPU, shared memory, real lessons.
- [x] T3 — Verify on the real build (schema, pages, links, axe both themes, mobile width), run the full suites, update the visitor changelog only if a visible change needs it, commit.

## Acceptance criteria
- Both notes build, appear in `/notes/`, are linked to each other, and every claim traces to a source above.
- No axe violations on the two pages in both themes; no horizontal overflow at 360 px.
- Full suites green; the real privacy page and comments section still behave.

## Progress and evidence
Sources read: `agentic-dev-setup` README, `docs/LESSONS.md`, `override.conf`; this repo's ADRs 0007/0008/0011/0012, `lighthouserc.json`, `a11y.spec.ts`, `turnstile.ts`. Numbering: 1 = site, 2 = setup (same pubDate, `sortNotes` puts the higher number first).

T1-T3 done (2026-10-01). Notes written from verified sources and fact-checked line by line; one extrapolated sentence about Engram was replaced by the README's own claim, a voseo slip fixed. Real-build verification (production build served with `astro preview`): schema validated by the build, both notes in `/notes/` index, RSS (2 items), sitemap, home and nav ("Notas"); axe wcag2a/2aa/21aa clean on both notes and the index in both themes; no horizontal overflow at 360 px; JS budget 9.13 KiB gzip per note page (limit 30). Found and fixed a real regression: published notes were copied into fixture builds and broke the white-label check (RED test, then fix in `fixture-workspace.ts`, commit separate). Final suites: 368 unit, 189 e2e, white-label, typecheck, lint, depcruise, diff check green. Changelog entry `first-notes` added. Not released: the user must read both notes first (they are in the user's voice and go public).

Next step: user reviews the text; release to `main` on request.

Engram mirror: `odd/first-notes/tasks`.

## Note 003 published (2026-10-05)
The owner brought a finished post written outside this repo (`index.mdx`, a Claude web project fed with the repo's docs and Engram): "Vibe coding o especificar primero: por qué defino antes de pedirle código a la IA", `number: 3`, category `agentes-ia`, about 1,470 words. Slug chosen by the owner: the short one, `vibe-coding-o-especificar-primero` (the title-derived slug would have been about 80 characters).
- Review before publishing, no text changed: frontmatter inside the schema limits (title 81 of 90, description 139 of 160, decision fields 162 to 187 of 280, 5 kebab-case tags); every factual claim traced to the repo: 12 ADRs, ADR 0005 (about 69 KiB with React 19 against about 7.3 KiB with Preact, 30 KiB budget), tokens RED then GREEN 8/8 (T06, 2026-09-28), `tokens.json` values, the `task.yml` Files field, the T21 agent that added "Privacy" to the main nav (reverted; 768 px overflow, 3 smoke failures, circular import, hardcoded owner data, two unverified privacy claims) and the stale tracker line about `/contact/` that the T19 UI had already made false on 2026-09-30. No email address, no private repository, no unannounced project, no em dashes.
- Isolated build (fixture workspace with the two real notes plus this one): compiles, h1 and decision record render, 4 titled code blocks, `BlogPosting` JSON-LD, share card, RSS and sitemap entries, listed on `/notes/`, link to note 002 resolves.
- Owner's stance recorded in the docs: posts are complete and not limited in words, so `docs/NOTES*.md` now say there is no word limit (the scaffold's draft sentence still suggests about 500; left as is, it is a suggestion).
- Success criterion of the repo (3 published notes) met: `docs/PLAN.md`.

## Images in notes and shorter preview titles (2026-10-05, owner: "sí, implementa las dos mejoras")
Triggered by the owner asking whether images in notes were a good idea and whether the social metadata looks the same everywhere.
- Finding: images already worked (`![alt](./file.png)` next to `index.mdx`): on a throwaway fixture note Sharp turned a 61 KB PNG into a 21.5 KB WebP, with `width` and `height`, `loading="lazy"`, `decoding="async"`, shown at about 750 px in the column and 318 px at 390 px wide. Missing: any frame (0 px radius, no outline), so a dark screenshot blended into the card.
- Change 1, test first (RED: radius `0px`): `.prose img` in `styles/global.css` gets the inner radius and a 1 px hairline outline, the same as the `/me` portrait. Cost: +104 bytes of inline CSS (note page 48,064 to 48,168). The e2e adds an image to the DOM instead of changing the fixture notes (a new fixture note would change every list and count). `docs/NOTES*.md` gain image tips and a stricter checklist line (about 1,600 px wide, no private data).
- Change 2, test first (RED: `og:title` still ended with " — elvinlab.dev"): in `Seo.astro` an article's `og:title` is the note title alone; the `<title>` tag, `og:site_name` and the card keep the domain. LinkedIn and X cut titles at about 70 characters and the note 003 title with the suffix was about 108.
- Checks: typecheck, lint (one formatting fix), 657 unit tests, depcruise, full e2e 540 passed and 231 skipped by annotation, `docs:config`; `pnpm test:lighthouse` after the CSS change: worst LCP `/notes/smoke-es/` 2265 ms (unchanged), `/` 2206, `/contact/` 1814, performance 98 or 99. Changelog entry `note-images-and-share-titles`.
- Not changed: no figure or caption support, no lightbox, share cards still come from the title only.

## Share on X (2026-10-05, owner: "en X también el link")
The owner asked for an X link in the note share panel (it had copy link and LinkedIn). `ShareCard.astro` gets an X anchor next to LinkedIn: `https://x.com/intent/post?url=<canonical>&text=<note title>`, a plain link with the shared `externalLinkAttrs` and `ExternalHint`, no script. `ShareCard` now takes a `title` prop (`NotePage.astro` passes `entry.data.title`). Layout: the icon links get `shrink-0` (they were squeezed to 43 px) and the copy button `whitespace-nowrap px-2` (its label wrapped at 136 px), so at 1280 and 390 px all controls are at least 44 px and the copy label stays on one line (screenshots checked).
- Test first, new `tests/browser/note-share.spec.ts` (ES and EN notes, 1280 px): LinkedIn URL (regression), X URL with canonical and title, `target=_blank`, `rel` noopener, every control at least 44 x 44. RED: the two X tests failed (no X link), LinkedIn and size tests passed; GREEN after the change.
- Checks: lint, typecheck, 657 unit tests, depcruise, full e2e 546 passed and 243 skipped by annotation. Changelog entry `note-share-x`; `docs/NOTES*.md` describe the share panel.
- Not added, owner decides: WhatsApp (a plain `https://wa.me/?text=` link, the most used channel for Spanish speakers), Facebook, Telegram, Reddit. With a fourth control the panel would need a wrapping row. TikTok and Instagram have no web share URL.
