# Link previews: metadata fixes and one share card per note

## Objective and authorization
The user asked on 2026-10-01 for shared links to look good, then approved both options: fix the metadata gaps and generate one share card per note with its title. Local commits on `feat/link-previews` and a push to `develop` only; release to `main` needs a separate request. New devDependencies (`satori`, `@fontsource/jetbrains-mono`) are covered by that approval.

## Problem and why
Every page shares one `/og-image.png`, so a shared note link shows the generic "Elvin González" card instead of the note's title. Also: notes are `og:type=website`, `og:locale` is `es`/`en` instead of a valid `es_ES`/`en_US`, images have no alt text, and the `BlogPosting` JSON-LD lacks `image` and `author.url` (issue #51, T33, unblocked now that notes exist).

## Scope
- In: pure SEO helpers, `article` Open Graph tags, valid `og:locale`, image alt, JSON-LD `image` and `author.url`, a build-time card renderer (satori to SVG, sharp to PNG), an Astro integration that writes `/og/notes/<slug>.png` into the build, wiring in `Seo.astro`, e2e, docs, changelog.
- Out: per-page cards for non-note pages (they keep `/og-image.png`), `twitter:site`/`creator` (needs a handle in config; not asked), cards for translations beyond what notes already provide, dev-server card preview.

## Decisions and constraints
- Render in Node at `astro:build:done` (like `noindexHeaders`), not as an Astro endpoint: with the Cloudflare adapter prerendering may run in workerd, where `node:fs`/`sharp` are not available. Frontmatter is read from disk with the same approach as `readNoteDatesFromDisk` (no `astro:content` at config time). Consequence: cards exist only in builds, not in `astro dev`.
- `sharp` is already a direct dependency; satori emits SVG with text as paths, so no resvg. Fonts: satori cannot read woff2, and the installed JetBrains Mono is variable woff2 only, so add the static `@fontsource/jetbrains-mono` (OFL-1.1) as a devDependency. `satori` is MPL-2.0 and build-time only.
- Card style matches `public/og-image.png`: dark page, cyan and pink radial glows, JetBrains Mono, cyan domain label, pink cursor block; plus note number, title and date.
- Fixture builds (e2e, Lighthouse, white-label) run the integration too (config is copied), so e2e can assert real PNGs for the fixture notes.
- Strict TDD: Vitest for pure helpers and the renderer (PNG signature, 1200x630), Playwright for head tags and image responses. RDD off (disabled/unmanaged). Route: inline by the user's preference.
- Social platforms cache previews: after release the user may need to refresh them (Facebook Sharing Debugger, LinkedIn Post Inspector); not automatable here.

## Tasks
- [x] T1 — Pure helpers + JSON-LD: `ogLocale`, `noteCardPath`, article meta, `BlogPosting` `image` and `author.url`; unit tests first.
- [x] T2 — Card renderer + integration: `buildCardTree`, `renderCardPng`, `ogImages()` integration, devDependencies, tests (PNG signature, 1200x630, long titles), wired in `astro.config.ts`.
- [ ] T3 — Wire `Seo.astro`/`BaseLayout`/`NotePage`, e2e (tags and real PNG responses), docs, changelog, visual check of both note cards, full suites.

## Acceptance criteria
- Note pages emit `og:type=article`, `article:published_time` (and modified, tags), `og:image` and `twitter:image` pointing at that note's card, with alt text; other pages keep the default image. `og:locale` is `es_ES`/`en_US`.
- Each published note has a 1200x630 PNG at `/og/notes/<slug>.png` in the build, served with an image content type.
- `BlogPosting` JSON-LD includes `image` and `author.url`.
- Full suites green: unit, e2e, white-label, build, JS budget, typecheck, lint, depcruise, diff check.

## Progress and evidence
Exploration done: `Seo.astro`, `jsonld.ts`, `note-dates.ts`, `noindex-headers.ts`, package versions (satori 0.33.5, @fontsource/jetbrains-mono 5.3.0, sharp 0.35.4 direct).

T1 done: RED observed (missing `og.ts`, JSON-LD without `image`/`author.url`), then GREEN 21 SEO tests; typecheck 0 errors, Biome clean. T2 done: RED observed (modules missing), then GREEN 31 integration tests (title sizing, 1200x630 PNG, longest title, differing cards, frontmatter parsing incl. quoted/escaped titles, drafts ignored, hook writes PNGs); typecheck 0 errors. Real build logs `Generated 2 share card(s)` and both PNGs (~90 KB) were inspected visually: on-brand, accents render, titles wrap in 3 lines. Dependencies added without age-policy exceptions: satori 0.33.5 (+ pure JS/WASM transitive deps, no install scripts) and @fontsource/jetbrains-mono 5.3.0. Next step: T3 wire `Seo.astro`, e2e, docs, changelog.

Engram mirror: `odd/link-previews/tasks`.
