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
