# Design

Source of truth for how elvinlab.dev looks and moves (design v3, "lab notebook"). Brand narrative and raw token values live in [BRAND.md](BRAND.md); this file explains how they are applied. The interactive prototype is a private Claude Design canvas; everything needed to build the site is summarized here.

## Direction

- Subject: a portfolio and the blog "Lab Notes — by an eternal junior" of a full-stack engineer who builds with AI agents. Audience: engineers, tech leads and recruiters. Spanish is the default locale at `/`; English is optional under `/en/`. The browser language only triggers a quiet, dismissible line of text ("also available in English") on Spanish pages, never a redirect (SEO and performance) and never on English pages, where the navbar always offers the switch. The English menu says plainly "Notes" even though the notes index is Spanish, and the site notice strip only appears when `notice` is set in the config (it is off now that the site is live).
- Identity comes from the subject: a lab and its notebook. Notes are numbered entries (`Note 003`), each summarized by a **decision record**: context, decision, outcome.
- **One bold element:** the full-bleed banner with the live cursor-reactive WebGL2 background and a large solid display headline. Pink block accents are small and static across the home, navbar, about page, notes index and footer. Everything else stays quiet.
- Varied hierarchy instead of identical cards: the latest entry is large, older entries are index rows, projects are "experiments" tiles, the four pillars share one strip.
- Mechanics from [Fuwari](https://github.com/saicaca/fuwari) (MIT): grid, measurements, sidebar, motion timing. Identity is ours.
- White-label: another developer replaces name, bio, notes, experience, colors, favicon and socials through configuration, content and one theme file; the layout, motion and motifs above stay in code.

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

Space Grotesk for display and body, JetBrains Mono for entry numbers and code, both self-hosted via Fontsource. Press Start 2P marks the navbar wordmark and retro footer signature, with a larger signature on the 404 page.

Scale: note title 54 px (hero) / 36 px, card title 26–28 px, body 18 px at 1.75 line height inside a 68 ch measure (16 px minimum on mobile), meta 14 px.

## Layout

- Page width 1200 px; grid `main | sidebar 280 px`, gap 16 px. The sidebar sits on the right and moves below the content under 1024 px.
- Navbar: 72 px card, radius `0 0 16px 16px`, sticky. Items: Home, Notes, Experiments, About (`/me`), Contact.
- The dismissible locale suggestion stays in document flow after the footer, within the page gutters; it appears only for a browser-language mismatch and never covers content or focus. It can extend document height, but avoids an overlay and does not shift the content above it.
- Banner: ~600 px on home, ~380 px elsewhere; content overlaps it by 56 px.
- Cards: radius 16 px, no borders, no shadows; dashed dividers only. Inner radius follows the concentric rule (outer 16 − padding 12 = 4 px).
- Section titles: sentence case with a 4 × 20 px accent bar.
- Mobile first (390 px reference): single column, sidebar content moves below the main content, notes collapse into one card with dashed dividers.

## Pages

- **Home:** banner, latest entry with its decision record, notebook index, "Hiring?" recruiter card (availability, CV, link to `/me`), experiments, pillars, lab log.
- **/notes:** Spanish index with search, language filter, entries grouped by year, categories, tags and RSS. English notes have `/en/notes/<slug>` detail routes; there is no English index.
- **Note:** reading-progress bar, decision record before the text, heading anchors, "Lab note" callout, copyable code, prev/next (with its own breathing room, 32 px below the article and 40 px in reading mode), related notes, and sticky table of contents with progress. Discussion shows Giscus comments and reactions only when `features.comments` is on and `site.config.ts` has a `giscus` block (repo and category ids from giscus.app); otherwise the section is absent, with no placeholder. It stays idle until it is within 200 px of the viewport, then loads giscus in the page locale with the built-in light or dark theme, and follows the theme toggle. Fallbacks: a static loading line, an error line, and a `noscript` link to the repository's discussions. Evidence: `tests/browser/comments.spec.ts` (giscus origin stubbed) and the white-label build, which asserts no section without config. **Reading mode** (`features.readingMode`, a central switch; off renders no toggle, script, CSS or stored key): each note has a toggle and, while on, a floating exit button. It sets `html[data-reading]` before first paint from `localStorage` (`reading-mode`) and, with CSS only, hides the site notice, the banner effects and the WebGL canvas (the effect is stopped, the saved background choice is untouched), turns the banner into a compact header, hides the sidebar, flattens the article card and sets one calm column (760 px minus 20 px gutters, so wider than the page measure on phones and narrower on desktop) at 19 px / 1.8. Title, decision record, comments, prev/next, the progress bar and the navbar stay. The served HTML is identical for everyone, so crawlers (no stored preference) see the normal page and SEO is unaffected; on a 390 px phone the text starts at 380 px instead of 538 px. Evidence: `tests/browser/reading-mode.spec.ts` (ES/EN, three widths, axe in both themes), `reading-mode.test.ts` and the white-label build, which asserts nothing of it ships with the flag off. Long-form policy prose uses a 68 ch measure without narrowing the page/sidebar grid.
- **Link previews:** every page emits Open Graph and Twitter tags (`summary_large_image`, 1200 x 630, alt text, `og:locale` as `es_ES`/`en_US`). Pages share `/og-image.png` except notes, which are `og:type=article` (published/modified time, tags) and get their own card at `/og/notes/<slug>.png`: dark page, cyan and pink glows, JetBrains Mono, domain in cyan, `NOTA 001` in pink, the title and author with date. Cards are rendered at build time by the `og-images` integration (satori to SVG, sharp to PNG) from the notes on disk, so they exist in builds, not in `astro dev`. `/me`, the portfolio page, has a card per locale at `/og/me-<locale>.png`: the photo ringed in the brand gradient, name, role, location, years of experience and the availability pill (green dot when `recruiter.openToWork`, the danger color otherwise), all read from the site config; it also has a real title (the owner's name) and the bio as description. The `BlogPosting` structured data carries `image` and `author.url`. Evidence: `tests/browser/link-previews.spec.ts` and `src/integrations/og-*.test.ts`. Social platforms cache previews; refresh them with the Facebook Sharing Debugger or LinkedIn Post Inspector after a change.
- **/me (recruiters):** photo, name, calls to action (CV, contact, LinkedIn, GitHub), at-a-glance strip, what I bring, experience timeline, latest experiments, latest notes, certificates and degrees by year, stack; prints cleanly to PDF.
- **Legal pages:** `/privacy` and `/terms` (ES/EN), both linked from every footer, indexable and in the sitemap, with a 68 ch measure and a last-updated date. They state only what is true of the site and what the providers themselves document, and they are not legal advice. Terms cover who publishes the site, the notes license (CC BY-NC-SA 4.0, as shown on each note), use "as is", comments through giscus/GitHub (only when configured), external links, professional information on `/me` (only when it is on), privacy and changes. Privacy lists the browser preferences (the reading mode one only when that feature is on), cites what Cloudflare states (no tracking of individual users across sites, no query strings), and says the site's own code sets no cookies without claiming anything about third parties, because Cloudflare's Web Analytics and Turnstile documentation do not state cookie behavior. `tests/browser/cookies.spec.ts` keeps that claim true (every third-party origin stubbed, zero cookies and no `Set-Cookie` on any page).
- **/contact:** when contact delivery is configured, the form has topic chips, validation and sent state; otherwise it exposes the configured unavailable state. The email address stays behind a click-to-reveal button.

## Motion

- Onload: fade-in-up 300 ms, staggered (navbar 0, sidebar 100, content 150, footer 250 ms).
- Page transitions: Astro View Transitions, fade plus 16 px slide, 200 ms.
- Press: `scale(0.96)`; state transitions ≤150 ms on named properties only.
- Theme switch suppresses transitions for one frame.
- Everything stops under `prefers-reduced-motion`.

## Accessibility floor

WCAG AA contrast in both themes, visible 2 px focus ring, touch targets ≥44 px, semantic landmarks (`header`, `nav`, `main`, `aside`, `footer`), `aria-label` on icon-only buttons, no information conveyed by color alone.

## October 2026 refinement

- The home banner blends into the page through a 120 px gradient; the animated background stays sharp and interactive.
- Small static pink accents retain the terminal motif without repeated blinking. Retro type identifies the brand, not long-form text.
- The home author card uses the configured profile image, with initials when no image is configured. The hiring card separates status from its heading and removes repeated employment information. Its status dot is the `ok` green only when `recruiter.openToWork` is true (the default) and the `danger` color otherwise; the status text always states the situation, so color is never the only signal. `recruiter.available` only shows or hides the whole status line. Evidence: `tests/browser/smoke.spec.ts` (recruiter card) and the `recruiter.openToWork` cases in `schema.test.ts`.
- The locale hint sits after the footer: less immediately discoverable than an overlay, but it cannot cover reading or form controls or shift preceding content. The navbar language control remains available near the top.
- Existing semantic colors, content/sidebar geometry and theme behavior are preserved. UI UX Pro Max's generic palette suggestions were not adopted because they conflicted with the established brand.

Implementation and check evidence: [home refinement](../odd/tasks/home-visual-refinement.md) and [sitewide polish](../odd/tasks/sitewide-ui-polish.md).

## Verification scope

The current sitewide visual audit covered 15 desktop routes in both themes plus representative home, about, contact, notes and 404 layouts at 360 px and 768 px. No horizontal overflow or page errors were observed in that sample. Browser fixtures exercise Spanish and English note rendering, including the localized English detail route; current real notes are drafts, so published-note behavior is not represented. Contact checks cover the configured local form without submitting to a real service. Disabled experiments and external contact delivery remain outside runtime coverage.
