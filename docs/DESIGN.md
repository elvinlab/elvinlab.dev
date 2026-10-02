# Design

Source of truth for how elvinlab.dev looks and moves (design v3, "lab notebook"). Brand narrative and raw token values live in [BRAND.md](BRAND.md); this file explains how they are applied. The interactive prototype is a private Claude Design canvas; everything needed to build the site is summarized here.

## Direction

- Subject: a portfolio and the blog "Lab Notes — by an eternal junior" of a full-stack engineer who builds with AI agents. Audience: engineers, tech leads and recruiters. Spanish is the default locale at `/`; English is optional under `/en/`. The browser language only triggers a quiet, dismissible line of text ("also available in English") on Spanish pages, never a redirect (SEO and performance) and never on English pages, where the navbar always offers the switch. The English menu says plainly "Notes" even though the notes index is Spanish, and the site notice strip only appears when `notice` is set in the config (it is off now that the site is live).
- Identity comes from the subject: a lab and its notebook. Notes are numbered entries (`Note 003`), each summarized by a **decision record**: context, decision, outcome.
- **One bold element:** the full-bleed banner with the live cursor-reactive WebGL2 background and a large pixel-face display headline. Pink block accents are small and static across the home, navbar, about page, notes index and footer. Everything else stays quiet.
- Varied hierarchy instead of identical cards: the latest entry is large, older entries are index rows, projects are "experiments" tiles, and (in the `full` preset) the four pillars share one strip.
- Mechanics from [Fuwari](https://github.com/saicaca/fuwari) (MIT): grid, measurements, sidebar, motion timing. Identity is ours.
- White-label: another developer replaces name, bio, notes, experience, colors, favicon and socials through configuration, content and one theme file; the layout, motion and motifs above stay in code.

## Appearance presets

`appearance: 'minimal' | 'full'` in `site.config.ts` picks how loud the site is. `minimal` is the calm look and the choice of this site; `full` is the original look. The schema default is `full`, so a fork written before the preset existed does not change; this repo sets `minimal` explicitly. The preset reaches the document as `html[data-appearance]` (`BaseLayout`) and changes three things, each in one CSS file or resolver so components never test the preset:

- **Type scale:** `apps/web/src/styles/type-scale.css` (see Type).
- **Banner and note layout:** `apps/web/src/styles/calm-layout.css` (banner heights and padding, hero measure, decision record) and `note-meta.ts` (where the language badge and author go).
- **Home sections:** optional `home` booleans (`heroPills`, `authorCard`, `hiringCard`, `labLog`, `pillars`, `notebookIndex`, `experiments`) override the preset, resolved by `shared/config/appearance.ts`. `minimal` turns off `heroPills`, `labLog` and `pillars`; `full` shows everything; `experiments` also needs `features.experiments`. A section that is off renders nothing, and with every sidebar card off the aside column does not render. Reference: [CONFIGURATION.md](CONFIGURATION.en.md#appearance-and-home-sections).

Brand tokens, fonts, colors, motion and the accessibility floor are identical in both presets. Evidence and decisions: [minimal appearance preset](../odd/tasks/minimal-appearance-preset.md).

## Avoid

No gradient text on headlines, no ALL-CAPS eyebrow labels, no meta strings joined with `·`, no `→` in link text, mono only for entry numbers and code, no stock images.

## Color (semantic tokens)

| Token | Dark | Light | Use |
| --- | --- | --- | --- |
| page | `#07070f` | `#eef0ff` | Page background |
| card | `#121022` | `#ffffff` | Cards and navbar (no borders) |
| text | `#eceff4` | `#0d1117` | Body text |
| text-75 | `#c3c9d4` | `#30363d` | Secondary text |
| muted | `#8b949e` | `#57606a` | Meta (≥4.5:1 on card) |
| primary | `#a78bfa` | `#6d28d9` | Links, accent bars, icons |
| button | `#7c3aed` | `#7c3aed` | Fills behind white text (5.7:1) |
| cyan / pink | `#22d3ee` / `#ec4899` | `#155e75` / `#be185d` | Prompt, cursor, retro signature |

The brand gradient (violet → cyan → pink) appears only as a 3 px strip on recruiter cards and in the reading-progress bar. Brand violet `#8b5cf6` never carries white text (4.2:1 fails AA).

## Type

Space Grotesk for body, UI and note titles, JetBrains Mono for entry numbers and code, all self-hosted via Fontsource. Two pixel faces, each with one job:

- **Pixelify Sans** (`@fontsource-variable/pixelify-sans`, one variable file, weight 600) is the display face for the home hero headline and the accent-bar section titles (`SectionHeading`, so `/me` titles too). It is the core font token `pixel` (`font-pixel`, `packages/core/src/tokens/tokens.json`), so a theme can replace it. Only the Latin file is preloaded, on the home page only (~12 KB). Hero and section titles read the preset scale below (`text-hero`, `text-section`), with `text-balance` on the hero; the hero measure is a preset variable (16 ch in `full`, 22 ch from `md` in `minimal`, so the minimal hero sits on two lines on desktop).
- **Press Start 2P** stays the brand mark: navbar wordmark, retro footer signature and a larger signature on the 404 page.

Rule: pixel faces are for short, large text only, never paragraphs, note prose, note titles, navigation or forms. Known caveat: the pixel `e` is less legible at large sizes; it was judged acceptable at the `minimal` hero sizes (32 / 44 px). Brand decision in [BRAND.md](BRAND.md#tipografía).

### Scale

The scale is driven by `html[data-appearance]` and lives once in `apps/web/src/styles/type-scale.css` (web app, not `core`: it is keyed by the app-level `appearance`, while core tokens are keyed by color theme). Components use the `text-hero`, `text-section`, `text-note-title`, `text-card-title` and `text-intro` utilities, and `.prose` reads `--type-prose*`; none of them test the preset. Values are rem, so the visitor's font-size setting still scales them. Sizes are phone / from `md` (48 rem):

| Element | `minimal` | `full` (the look before the preset) |
| --- | --- | --- |
| Hero (pixel face) | 32 / 44 px | 36 / 60 px |
| Section titles (pixel face) | 20 px | 24 px |
| Note title | 30 / 40 px | 36 / 48 px |
| Latest-note card title | 20 / 22 px | 30 / 36 px |
| Home intro | 17 / 19 px | 18 / 20 px |
| Prose body | 17 px | 18 px |
| Prose h2 / h3 / blockquote | 24 / 19.2 / 17.6 px | 28 / 21.6 / 19.2 px |

Shared by both presets: prose line height 1.75 inside a 68 ch measure (16 px minimum on mobile), small card titles 18 px, meta 13 px (mono meta and chips use the 13 px `text-meta` token; the retro wordmark and signature stay 12 px). Reading mode keeps its own scale (19 px / 1.8, headings pinned to the `full` values). Not on the scale: the `/me` hero, the notes index h1 and the contact, legal and 404 headings. An earlier version of this file gave the `full` note title as 54 px; the real value was 36 / 48 px.

## Layout

- Page width 1200 px; grid `main | sidebar 280 px`, gap 16 px. The sidebar sits on the right and moves below the content under 1024 px.
- Navbar: 72 px card, radius `0 0 16px 16px`, sticky. Items: Home, Notes, Experiments, About (`/me`), Contact. It hides on scroll down and returns on scroll up; hiding closes an open mobile menu, and focus entering the navbar (or keyboard focus already inside it) keeps it on screen, so no control is focused off screen.
- The dismissible locale suggestion stays in document flow after the footer, within the page gutters; it appears only for a browser-language mismatch and never covers content or focus. It can extend document height, but avoids an overlay and does not shift the content above it.
- Banner: every banner takes `min(requested height, preset cap)` through variables in `calm-layout.css`, so a page never asks for a preset. `full` caps are no-ops, so its heights are the requested ones: home 150 px collapsed, `clamp(520px, 66vh, 620px)` expanded (~600 px on desktop), 28 rem on touch or phone-width screens (so the latest note starts near the fold at 390 px), ~340–380 px on the other banner pages. `minimal` caps: page banners 240 px, expanded home `clamp(360px, 48vh, 460px)`, compact 24 rem; banner padding is 5.5 rem top / 1.5 rem bottom (6 rem / 2 rem in `full`). Content overlaps the banner by 56 px.
- Banner edge: every banner blends its bottom edge into the page with the same server-rendered 120 px gradient (`data-banner-fade`, CSS only, no script, so the first paint is right). Before this, only the home had it (`homeFade`) and the notes index, notes and `/me` showed a hard step, worst in light theme. Reading mode hides it with the other banner effects. Pages without a banner: `/contact`, `/privacy`, `/terms`, `/changelog` and the 404.
- Cards: radius 16 px, no borders, no shadows; dashed dividers only. Inner radius follows the concentric rule (outer 16 − padding 12 = 4 px).
- Section titles: sentence case with a 4 × 20 px accent bar.
- Mobile first (390 px reference): single column, sidebar content moves below the main content, notes collapse into one card with dashed dividers.

## Pages

- **Home:** banner with the hero, latest entry with its decision record, notebook index, "Hiring?" recruiter card (availability, CV, link to `/me`), experiments, and, depending on the preset, hero pills, pillars and lab log. Each section follows its `home` flag (see Appearance presets): `minimal` turns off the hero pills, the lab log and the pillars; `full` shows all of them.
- **/notes:** Spanish index with search, language filter, entries grouped by year, categories, tags and RSS. English notes have `/en/notes/<slug>` detail routes; there is no English index.
- **Note:** reading-progress bar, decision record before the text (in `minimal` it is tightened: padding 20 to 16 px, gap 20 to 14 px, labels 13 px, body stays 14 px, same headings and content), a header with date and reading time only in `minimal` (the language badge moves to the foot beside the tags, and the author name to the foot meta line; on index rows the badge sits in the chip line and on the home card beside the CTA; `full` keeps them in the header), heading anchors, "Lab note" callout, copyable code (on touch screens the copy button is a 44 px target in its own strip above the first line, so it never covers code; with a mouse it stays the hover-only upstream button), translations (a note and its translation, linked with `translationOf`, declare each other with `hreflang` and `x-default`, and the language switch lands on the translation; invalid links fail the build), prev/next (with its own breathing room, 32 px below the article and 40 px in reading mode), related notes, and sticky table of contents with progress. Discussion shows Giscus comments and reactions only when `features.comments` is on and `site.config.ts` has a `giscus` block (repo and category ids from giscus.app); otherwise the section is absent, with no placeholder. It stays idle until it is within 200 px of the viewport, then loads giscus in the page locale with the built-in light or dark theme, and follows the theme toggle. Fallbacks: a static loading line, an error line, and a `noscript` link to the repository's discussions. Evidence: `tests/browser/comments.spec.ts` (giscus origin stubbed) and the white-label build, which asserts no section without config. **Reading mode** (`features.readingMode`, a central switch; off renders no toggle, script, CSS or stored key): each note has a toggle and, while on, a floating exit button. It sets `html[data-reading]` before first paint from `localStorage` (`reading-mode`) and, with CSS only, hides the site notice, the banner effects and the WebGL canvas (the effect is stopped, the saved background choice is untouched), turns the banner into a compact header, hides the sidebar, flattens the article card and sets one calm column (760 px minus 20 px gutters, so wider than the page measure on phones and narrower on desktop) at 19 px / 1.8. Title, decision record, comments, prev/next, the progress bar and the navbar stay. The served HTML is identical for everyone, so crawlers (no stored preference) see the normal page and SEO is unaffected; on a 390 px phone the text starts at 380 px instead of 538 px. Evidence: `tests/browser/reading-mode.spec.ts` (ES/EN, three widths, axe in both themes), `reading-mode.test.ts` and the white-label build, which asserts nothing of it ships with the flag off. Long-form policy prose uses a 68 ch measure without narrowing the page/sidebar grid.
- **Link previews:** every page emits Open Graph and Twitter tags (`summary_large_image`, 1200 x 630, alt text, `og:locale` as `es_ES`/`en_US`). Pages share `/og-image.png` except notes, which are `og:type=article` (published/modified time, tags) and get their own card at `/og/notes/<slug>.png`: dark page, cyan and pink glows, JetBrains Mono, domain in cyan, `NOTA 001` in pink, the title and author with date. Cards are rendered at build time by the `og-images` integration (satori to SVG, sharp to PNG) from the notes on disk, so they exist in builds, not in `astro dev`. `/me`, the portfolio page, has a card per locale at `/og/me-<locale>.png`: the photo ringed in the brand gradient, name, role, location, years of experience and the availability pill (green dot when `recruiter.openToWork`, the danger color otherwise), all read from the site config; it also has a real title (the owner's name) and the bio as description. The `BlogPosting` structured data carries `image` and `author.url`. Evidence: `tests/browser/link-previews.spec.ts` and `src/integrations/og-*.test.ts`. Social platforms cache previews; refresh them with the Facebook Sharing Debugger or LinkedIn Post Inspector after a change.
- **/me (recruiters):** photo, name, calls to action (CV, contact, LinkedIn, GitHub), at-a-glance strip, what I bring, experience timeline, latest experiments, latest notes, certificates and degrees by year, stack; prints cleanly to PDF.
- **Legal pages:** `/privacy` and `/terms` (ES/EN), both linked from every footer, indexable and in the sitemap, with a 68 ch measure and a last-updated date. They state only what is true of the site and what the providers themselves document, and they are not legal advice. Terms cover who publishes the site, the notes license (CC BY-NC-SA 4.0, as shown on each note), use "as is", comments through giscus/GitHub (only when configured), external links, professional information on `/me` (only when it is on), privacy and changes. Privacy lists the browser preferences (the reading mode one only when that feature is on), cites what Cloudflare states (no tracking of individual users across sites, no query strings), and says the site's own code sets no cookies without claiming anything about third parties, because Cloudflare's Web Analytics and Turnstile documentation do not state cookie behavior. `tests/browser/cookies.spec.ts` keeps that claim true (every third-party origin stubbed, zero cookies and no `Set-Cookie` on any page).
- **/contact:** when contact delivery is configured, the form has topic chips, validation and sent state; otherwise it exposes the configured unavailable state. The page states its purpose in a single sentence under the title (it is also the meta description), with no repeated introduction. The email address stays behind a click-to-reveal button.

## Motion

- Onload: fade-in-up 300 ms, staggered (navbar 0, sidebar 100, content 150, footer 250 ms).
- Page transitions: none. Navigation is a normal full page load (no View Transitions, no client router); hover and keyboard-focus prefetch (Astro `prefetch`, `hover` strategy, tap on slow or data-saver connections) makes it feel instant without prefetching links nobody shows interest in.
- Press: `scale(0.96)`; state transitions ≤150 ms on named properties only.
- Theme switch suppresses transitions for one frame.
- Everything stops under `prefers-reduced-motion`.

## Accessibility floor

WCAG AA contrast in both themes, visible 2 px focus ring, touch targets ≥44 px (including every navbar control, footer link, "all" link and the banner toggle, the reading-mode toggle and exit button, whose pill stays 36 px with an invisible expansion, the language suggestion and the code copy button), mono meta text at least 13 px, semantic landmarks (`header`, `nav`, `main`, `aside`, `footer`), `aria-label` on icon-only buttons, no information conveyed by color alone.

## October 2026 refinement

- Every banner blends into the page through a 120 px gradient (first the home only, now all of them; see Layout); the animated background stays sharp and interactive.
- Small static pink accents retain the terminal motif without repeated blinking. Retro type identifies the brand, not long-form text.
- The home author card uses the configured profile image, with initials when no image is configured. The hiring card separates status from its heading and removes repeated employment information. Its status dot is the `ok` green only when `recruiter.openToWork` is true (the default) and the `danger` color otherwise; the status text always states the situation, so color is never the only signal. `recruiter.available` only shows or hides the whole status line. Evidence: `tests/browser/smoke.spec.ts` (recruiter card) and the `recruiter.openToWork` cases in `schema.test.ts`.
- The locale hint sits after the footer: less immediately discoverable than an overlay, but it cannot cover reading or form controls or shift preceding content. The navbar language control remains available near the top.
- Existing semantic colors, content/sidebar geometry and theme behavior are preserved. UI UX Pro Max's generic palette suggestions were not adopted because they conflicted with the established brand.

### Audit pass (2026-10-01)

From the mobile and performance audit (Lighthouse mobile, screenshots, source review); all merged into `develop`, not yet released.

- **Touch and responsive:** the expanded home banner has a compact floor on touch or phone-width screens (557 px to ~490 px at 390 px); every navbar control, footer link, "all" link and the banner toggle has a ≥44 px hit area; mono meta and chips use the 13 px `text-meta` token; reading time never splits across lines; the background picker's galaxy icon is a sparkle, distinct from the theme sun.
- **Performance:** the Latin Space Grotesk and JetBrains Mono variable files are preloaded in `BaseLayout` (page CSS is inlined, so the browser would otherwise find the font URLs late; Latin-ext, Vietnamese and Press Start 2P stay lazy). The profile photo goes through Astro Image as webp with explicit dimensions; `identity.avatar` is a bare file name inside `apps/web/src/assets/` (breaking for forks that used a `public/` path; a missing file fails the build). The WebGL loop resumes on tab visibility only while the banner intersects the viewport. Hover and focus prefetch is on (`prefetch: { prefetchAll: true, defaultStrategy: 'hover' }`). Measured (Lighthouse mobile, fixture server, median of 3): home performance 0.96 to 0.98 (0.97 with the pixel font), FCP 2.19 s to 1.74 s, LCP unchanged at ~2.26 s (2.34 s with the pixel font, possibly noise), CLS 0. LCP is the hero headline text, so the remaining lever is the HTML/CSS path, not fonts or images. Evidence: `tests/browser/performance.spec.ts`, `gl-runner.test.ts`.
- **Interaction:** on touch devices (`hover: none`) the code copy button gets its own 44 px strip above the first line (about 40 px per code block); hiding the navbar closes the open mobile menu, and focus inside it reveals the navbar and keeps it visible; the reading-mode toggle and exit button have a 44 px hit area; `/contact` shows a single intro sentence (the `intro` field was removed, `pageDescription` carries it). Evidence: `tests/browser/mobile-ux.spec.ts` (touch, banner, meta), `tests/browser/interaction-polish.spec.ts` (interaction), `tests/browser/pixel-display.spec.ts` (pixel face).
- **Pixel display face:** adopted by the owner after a trial on screen (see Type).
- **Not done on purpose:** the hiring card shows "not available" next to its primary CTA; that is a content decision owned by the owner (`recruiter.openToWork`), not a defect.
- **Minimal preset (done, 2026-10-01):** the minimalist preset, the theme-driven type scale and the calmer note pages from this list shipped; see Appearance presets and Type.
- **Next (not started):** a faster local test loop (fast script, local workers, fixture-build reuse, tiered verification; measure first).

Implementation and check evidence: [home refinement](../odd/tasks/home-visual-refinement.md), [sitewide polish](../odd/tasks/sitewide-ui-polish.md), [mobile, UX and performance pass](../odd/tasks/mobile-ux-performance-pass.md), [pixel display font](../odd/tasks/pixel-display-font-experiment.md) and [minimal appearance preset](../odd/tasks/minimal-appearance-preset.md).

## Verification scope

The current sitewide visual audit covered 15 desktop routes in both themes plus representative home, about, contact, notes and 404 layouts at 360 px and 768 px. No horizontal overflow or page errors were observed in that sample. Browser fixtures exercise Spanish and English note rendering, including the localized English detail route; current real notes are drafts, so published-note behavior is not represented. Contact checks cover the configured local form without submitting to a real service. Disabled experiments and external contact delivery remain outside runtime coverage.

The 2026-10-01 mobile and performance audit covered mobile Lighthouse (home and the other fixture URLs, strict budgets), screenshots at 390, 768 and 1440 px in both themes, and browser assertions for hit areas, overflow, fold position and font loading. It did not cover screenshots at 360 and 1024 px, INP, or the real-GPU cost of the WebGL banner (the fixture runs on software rendering).

The 2026-10-01 minimal appearance preset (three work units on `feat/minimal-appearance-preset`, merged into `develop` by fast-forward and pushed to `origin/develop`, not released to `main`) was checked with unit tests (37 core and 529 web tests), typecheck, lint, the isolated production-build e2e at the `chromium-1280` project only (189 passed), the static build and the white-label build. The owner asked for a lighter local loop, so e2e at `chromium-1280` (about 49 s) replaced the full three-viewport suite (about 1.6 min). It did not re-run the full three-viewport e2e suite, mobile Lighthouse, `check:js-budget` or `check:dev-cold-start`, so the performance numbers above predate the preset. Known gaps: no automated test for the empty-aside layout (every sidebar card off); the before screenshots of the banner edge were lost, so the before/after comparison rests on what the writer saw plus an after set; on `/me/` at 1440 px the avatar sits about 8 px under the navbar; on the notes index the language badge can push a tag onto a second row.
