# Design

Source of truth for how elvinlab.dev looks and moves (design v3, "lab notebook"). Brand narrative and raw token values live in [BRAND.md](BRAND.md); this file explains how they are applied. The interactive prototype is a private Claude Design canvas; everything needed to build the site is summarized here.

## Direction

- Subject: a portfolio and the blog "Lab Notes — by an eternal junior" of a full-stack engineer who builds with AI agents. Audience: engineers, tech leads and recruiters (English first, Spanish second).
- Identity comes from the subject: a lab and its notebook. Notes are numbered entries (`Note 003`), each summarized by a **decision record**: context, decision, outcome.
- **One bold element:** the full-bleed banner with the live cursor-reactive WebGL2 background and a large solid display headline with the pink block cursor. Everything else stays quiet.
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
| cyan / pink | `#22d3ee` / `#ec4899` | `#0e7490` / `#be185d` | Prompt, cursor, retro signature |

The brand gradient (violet → cyan → pink) appears only as a 3 px strip on recruiter cards and in the reading-progress bar. Brand violet `#8b5cf6` never carries white text (4.2:1 fails AA).

## Type

Space Grotesk for display and body, JetBrains Mono for entry numbers and code, both self-hosted via Fontsource. Press Start 2P only in the retro footer signature and the 404 page.

Scale: note title 54 px (hero) / 36 px, card title 26–28 px, body 18 px at 1.75 line height inside a 68 ch measure (16 px minimum on mobile), meta 14 px.

## Layout

- Page width 1200 px; grid `main | sidebar 280 px`, gap 16 px. The sidebar sits on the right and moves below the content under 1024 px.
- Navbar: 72 px card, radius `0 0 16px 16px`, sticky. Items: Home, Notes, Experiments, About (`/me`), Contact.
- Banner: ~600 px on home, ~380 px elsewhere; content overlaps it by 56 px.
- Cards: radius 16 px, no borders, no shadows; dashed dividers only. Inner radius follows the concentric rule (outer 16 − padding 12 = 4 px).
- Section titles: sentence case with a 4 × 20 px accent bar.
- Mobile first (390 px reference): single column, sidebar content moves below the main content, notes collapse into one card with dashed dividers.

## Pages

- **Home:** banner, latest entry with its decision record, notebook index, "Hiring?" recruiter card (availability, CV, link to `/me`), experiments, pillars, lab log.
- **/notes:** search, language filter, entries grouped by year, categories, tags, RSS.
- **Note:** reading-progress bar, decision record before the text, heading anchors, "Lab note" callout, copyable code, prev/next, related notes, Giscus discussion, sticky table of contents with progress.
- **/me (recruiters):** photo, name, calls to action (CV, contact, LinkedIn, GitHub), at-a-glance strip, what I bring, experience timeline, latest experiments, latest notes, certificates and degrees by year, stack; prints cleanly to PDF.
- **/contact:** form with topic chips, validation and sent state; email address only behind a click-to-reveal button.

## Motion

- Onload: fade-in-up 300 ms, staggered (navbar 0, sidebar 100, content 150, footer 250 ms).
- Page transitions: Astro View Transitions, fade plus 16 px slide, 200 ms.
- Press: `scale(0.96)`; state transitions ≤150 ms on named properties only.
- Theme switch suppresses transitions for one frame.
- Everything stops under `prefers-reduced-motion`.

## Accessibility floor

WCAG AA contrast in both themes, visible 2 px focus ring, touch targets ≥44 px, semantic landmarks (`header`, `nav`, `main`, `aside`, `footer`), `aria-label` on icon-only buttons, no information conveyed by color alone.
