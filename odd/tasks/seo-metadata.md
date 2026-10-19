# Feature: SEO and metadata across the whole site

Objective: every page and every shareable link of elvinlab.dev reads well and is found in classic and AI search. Branch: `develop` (no PR, ADR 0012). Delivery: commits per task on `develop`, no push or release until the owner asks. Test runner: Vitest (`mise exec -- pnpm --filter web exec vitest run <path>`), build check via `pnpm --filter web build`.

## Specs

- S1: "esos issues que son 3 estan para verlos despues de momento no" (#49, #67, #89 stay untouched).
- S2: "quiero que me ayudes a ver como sale mi blog en los diferetnes motores de busqueda tanto clasica como por ia y me ayudes a configurar bien esa metadata que salga buena informacion y si es posible imagen, practicamente es reforzar el seo y la metadata de todo no solo de un link sino de todo lo que tenemos en la web"
- S3: "tiene que verse muy llamativa y confiable" (how people find the owner by name, brand, a note or the CV).
- S4: "si, permitilos, y dale con todo el plan" (AI crawlers allowed to index and cite; run the whole plan).
- S5: "experientos todo todo esa metada la quiero bonita y que se encuentre y se lea bonita y llamativa" (experiments included).
- S6: "es que no se si dimensionas, es todo, cada pagina, cada link todo".
- S8: "y bueno lo que sea mas personal que tambie sea centralizado y configurable" (every personal SEO fact lives in `site.config.ts`, validated by the schema and documented in `docs/CONFIGURATION*.md`; components and generators read it, never hardcode it).
- S7 (from the screenshot, 2026-10-19): the home snippet showed "GitHub (se abre en una pestaña nueva)"; `/education` showed its English description on the Spanish URL; `/experiments` showed card text instead of its description; there are no sitelinks.

## Tasks

- [x] T1 Clean snippets: `data-nosnippet` on every visually hidden new-tab hint, own description for `/notes`, `/me` title by language, richer home description. S2 S7. Route: inline. Evidence: typecheck 0 errors, 72 test files and 721 tests green over `shared`, `integrations`, `features/{privacy,terms,me,notes}`. Commit: see Log.
- [x] T2 Page matrix: every URL type gets a unique, in-language title (about 60 characters) and description (120 to 160). Changelog pages 2 to 4, tags, subscribe, contact, privacy, terms, education, experiments and cases included. S2 S5 S6. Route: inline.
- [x] T3 Share card for every page type that still uses `/og-image.png` (hubs, tags, changelog, contact, legal, subscribe), both locales. S2 S3 S6. Route: inline (extends `integrations/og-card.ts`).
- [x] T4 Structured data: complete `Person`, `ProfilePage` on `/me`, `Blog` and `CollectionPage` on the hubs, `BreadcrumbList` on every non-home page, `CreativeWork` on experiment cases; check hreflang of pages with an English twin (the `/education` mix). S3 S7 S8. Route: inline. New config fields (`identity.knowsAbout`, country, extra `sameAs`) go through `schema.ts` and `pnpm docs:config`.
- [x] T5 AI visibility: `llms.txt`, explicit allow rules for AI crawlers in `robots.txt`. S4 S8. Route: inline. Policy and `llms.txt` copy come from config.
- [x] T6 Close: build, crawl every URL of the build for title, description, canonical, hreflang, og:image (exists, 1200x630), JSON-LD validity; `pnpm docs:config`, changelog entry, ledger. S2 S6. Route: inline, verifier by named risk only.

## Log

- L1 (2026-10-19): "mira quiero que me ayudes a ver como sale mi blog en los diferetnes motores de busqueda tanto clasica como por ia y me ayudes a configurar bien esa metadata que salga buena informacion y si es posible imagen, practicamente es reforzar el seo y la metadata de todo no solo de un link sino de todo lo que tenemos en la web"
- L2 (2026-10-19): "es que no se si dimensionas, es todo, cada pagina, cada link todo"
- Audit baseline (live, 43 sitemap URLs): all pages have title, description, canonical, hreflang, og:image 1200x630. Gaps: no `llms.txt` (404); JSON-LD is `WebSite` + `Person` only outside notes and tags; hubs, tags, changelog, contact, legal and subscribe share `/og-image.png`; `robots.txt` has no AI crawler rules.
- T1 in progress: `data-nosnippet` applied in `ExternalHint.astro`, `external-anchor.ts`, `external-links.ts` and `AuthorCard.astro` (tests updated); `notes.description` added with its own 160-character limit; `me.seoTitle` added; home descriptions rewritten.
- L3 (2026-10-19): "y bueno lo que sea mas personal que tambie sea centralizado y configurable" (S8).
- T2 and T4 done in one slice: `shared/seo/page-copy.ts` (built-in copy with `{name}` and `{domain}`) plus `seo` in `site.config.ts` (`country`, `knowsAbout`, `sameAs`, `aiCrawlers`, `llmsSummary`, `pages` overrides), `pageSeo()` wired into notes, me, contact, education, experiments, changelog, subscribe, privacy and terms; case titles via `caseTitle()`; `pageJsonLd()` (`ProfilePage`, `Blog`, `CollectionPage`, `ContactPage`, `CreativeWork`) and automatic `BreadcrumbList` in `Seo.astro` (`trail` prop; `TopicPage` migrated). Typecheck 0 errors; `src/shared`, `src/features`, route folders: 108 files, 1258 tests green; `pnpm docs:config` regenerated. Not done yet: the `/education` hreflang mix (to inspect on the build).
- T3 done: `pageCardPath`/`topicCardPath` in `shared/seo/og.ts`; `integrations/og-images.ts` writes a card per hub page and locale plus one per topic (34 cards in the build); every hub, legal and topic page passes `ogImage`. Commit: see git log.
- T5 done: `buildRobotsTxt` takes `aiCrawlers` (`allow` names 13 AI crawlers with Allow; `search-only` blocks the training ones; noindex builds get nothing), `shared/seo/llms.ts` builder plus `pages/llms.txt.ts` (pages, notes, experiments, facts; empty on noindex builds). Checked on a `SITE_INDEXABLE=true` build. 135 tests green over `shared/seo` and `integrations`.
- T6 done: crawl of the 43 indexable pages of an indexable build: title, description (70-170), canonical, og:image 1200x630 and valid JSON-LD on every page, no duplicate descriptions. Fixed /me (pitch over 160 characters) and changelog pages 2-4 (54 characters). `/education` hreflang is correct. Left as is: note titles are the author's editorial titles (73-104 characters with the site suffix; Google truncates the display). Full `test:e2e:quick` 1096 passed (one unrelated flaky run that did not repeat), `test:white-label` ok, lint and typecheck clean, `docs:config` regenerated. `changelog:audit` still lists the four SEO commits because the entry was added in the last commit, not in each one.
