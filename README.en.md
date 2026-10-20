<a id="top"></a>

<div align="center">

<img src="docs/assets/banner.webp" alt="The elvinlab.dev/me card: photo, name, role, location, experience and availability status" width="100%">

</div>

[Español](README.md) · **English**

# elvinlab.dev

> **Full-stack engineer building with AI agents.** Portfolio and **Lab Notes** —*by an eternal junior*—: a blog that documents the decisions behind what I build, not generic tutorials.

<div align="center">

[![CI](https://github.com/elvinlab/elvinlab.dev/actions/workflows/ci.yml/badge.svg)](https://github.com/elvinlab/elvinlab.dev/actions/workflows/ci.yml) ![Site](https://img.shields.io/website?url=https%3A%2F%2Felvinlab.dev&label=elvinlab.dev&style=flat-square) ![Astro](https://img.shields.io/badge/Astro-7-ff5d01?logo=astro&logoColor=white&style=flat-square) ![Tailwind](https://img.shields.io/badge/Tailwind-4-06b6d4?logo=tailwindcss&logoColor=white&style=flat-square) ![TypeScript](https://img.shields.io/badge/TypeScript-6-3178c6?logo=typescript&logoColor=white&style=flat-square) ![Cloudflare Workers](https://img.shields.io/badge/Cloudflare-Workers-f38020?logo=cloudflare&logoColor=white&style=flat-square)

**[See the site](https://elvinlab.dev/en/)** · **[Lab Notes](https://elvinlab.dev/notes/)** · **[About me](https://elvinlab.dev/en/me/)** · **[Configuration guide](docs/CONFIGURATION.en.md)** · **[How to create a note](docs/NOTES.en.md)**

</div>

## What it is

It is my portfolio (`/me`) and my blog (`/notes`) in a single site, and the first project of the **elvinlab** brand. Each note tells **one concrete decision**: the problem, what I tried, what I ruled out and why, with numbers. It is built to be **fast, accessible, honest and easy to operate**, and so that someone else can adopt it by changing only configuration and content.

It is also where [`@elvinlab/core`](packages/core) is born, the design base (tokens, themes and i18n) my next projects will share.

## Screenshots

<div align="center">

<picture>
  <source media="(prefers-color-scheme: light)" srcset="docs/assets/home-light.webp">
  <img src="docs/assets/home-dark.webp" alt="The elvinlab.dev home page: headline, latest note with its decision record and profile card" width="100%">
</picture>

<img src="docs/assets/note-dark.webp" alt="A Lab Notes note with its decision record, side table of contents and reading mode available" width="72%"> <img src="docs/assets/reading-mode-phone.webp" alt="Reading mode on a phone: a single column, no noise around the text" width="24%">

<sub><b>Home, a note and reading mode on mobile.</b> Everything looks the same in light and dark theme.</sub>

</div>

## Philosophy

These ideas are already decided and repeat across the code, the tests and the documents:

- **A blog of decisions, not tutorials.** Each note is one decision: context, what I chose and what came out of it, with numbers and names instead of adjectives.
- **It is born in the project, it moves to `core` when it repeats.** The shared base is not designed in advance. `core` is presentation only (tokens, themes, i18n): it never does `fetch` or stores data.
- **Measured, not promised.** Performance and accessibility budgets that **break the CI** when they are not met.
- **Accessible and respectful.** WCAG AA, 44 px touch targets, it honors `prefers-reduced-motion`, self-hosted fonts, the site sets no cookies of its own and the browser language never redirects.
- **Honest.** It only states what it can verify (privacy included), does not announce projects that do not exist, does not link private repositories and never publishes my email.
- **White-label by design.** Someone else adopts it **with configuration and content only**; the style (layout, motion, motifs) stays in the code. A test builds the site with another identity and fails if anything of mine leaks.
- **Spanish by default, English optional.** One note, one language. The interface is in both.
- **Simple to operate.** A single environment, a push to `main` is a release and the CI runs **once** before deploying.

## Built with agentic-dev-setup

This site was built with [**agentic-dev-setup**](https://github.com/elvinlab/agentic-dev-setup), my open-source (MIT) multi-agent development environment: **Claude Code thinks and reviews, cheaper models type**. Bounded work is delegated to OpenCode agents through herdr, OmniRoute routes them to free models with a local `qwen3:14b` as the last step, and Engram gives everyone a shared memory.

```mermaid
flowchart LR
    U([Me]) --> C[Claude Code<br/>tier 3 · reviews every diff]
    C -- delegates via herdr --> O[OpenCode<br/>tiers 1 and 2]
    O --> R{{OmniRoute}}
    R --> M[Free models<br/>Groq · NVIDIA · Mistral · Gemini]
    R --> L[(local qwen3:14b)]
    C <--> E[(Engram<br/>shared memory)]
    O <--> E
```

This is how work goes here: every task is an *issue* written as a delegation brief with a **tier** (1 trivial, 2 bounded, 3 complex); development is **strict TDD**; and a more expensive model **reviews every diff** written by a cheaper one. The full story is in the note [Claude thinks, cheap models type](https://elvinlab.dev/notes/agentic-dev-setup/) (in Spanish).

## Technologies

| Layer | Technology | What it is used for |
| --- | --- | --- |
| Framework | **Astro 7** + MDX | Prerendered pages, MDX content and islands only where needed |
| Interface | **Tailwind CSS 4**, **Preact 11**, **TypeScript 6** (strict) | Styles with semantic tokens; a single island (the contact form) |
| Content | **Content Collections** with **Zod 4**, **Expressive Code** | MDX notes and JSON validated at build time; code blocks with frames and copy |
| SEO and sharing | Sitemap, RSS, JSON-LD, **Sharp**, **Satori** | Metadata, optimized images and one share card per note |
| Typography and graphics | IBM Plex Sans, JetBrains Mono, Pixelify Sans, Press Start 2P (Fontsource) and custom **WebGL2** | Self-hosted fonts and animated banner backgrounds, no libraries |
| Hosting | **Cloudflare Workers** + **Wrangler** | A single environment; domain and DNS on Cloudflare |
| Services | **Turnstile**, **Resend**, **Web Analytics**, **Giscus** | Anti-bot, form email, minimal analytics and comments on GitHub Discussions |
| Quality | **Vitest 5**, **Playwright** + **axe-core**, **Lighthouse CI**, **Biome**, **dependency-cruiser** | Tests, accessibility, performance, formatting and architecture boundaries |
| Tooling | **pnpm 12** (workspaces), **mise** (Node 24), **GitHub Actions**, **Dependabot** | Monorepo, pinned versions, CI/CD and weekly updates |
| Assisted development | **agentic-dev-setup**: Claude Code, herdr, OpenCode, OmniRoute, Ollama and Engram, with **gentle-ai** for review and verification (pi and Codex optional) | How it was built (previous section) |

## What it includes

- **Lab Notes**: index by year with a filter, side table of contents with progress, decision record, reading time, related notes, previous/next and RSS.
- **"Most active"**: in the `/notes/` index, the notes with the most footprints, comments and reads over the last 30 days; refreshed with `pnpm pulse:snapshot` before a release.
- Optional **reading mode** on every note: a single column, no animated banner or sidebar, for comfortable reading on mobile and desktop.
- **Comments and reactions** with Giscus, loaded only when you reach them.
- Own **share cards** for each note, each experiment case page and `/me`, generated at build time.
- **Experiment case pages** (`/experiments/<slug>/`, ES/EN): the problem, my part, the gallery, the result and, at the end, the related note; each section appears only when it has content.
- **`/me`**: a portfolio with experience, education and experiments; it prints cleanly to PDF.
- A safe **contact form**: Turnstile, a send limit and it fails closed when configuration is missing.
- **Email subscription**: readers get new notes (and, now and then, an announcement of a project) with double opt-in and a one-page unsubscribe; I trigger each send by hand. Guide: [`docs/SUBSCRIPTION.en.md`](docs/SUBSCRIPTION.en.md).
- A **public changelog**, **privacy and terms pages** and a **light/dark theme** with selectable animated backgrounds.
- **Configurable appearance**: the `appearance` preset (`minimal` or `full`) sets the type scale, the banner heights and the note detail, and `home` switches each home section on or off.
- A **card for the latest experiment**: static after every note and on the home, with an optional floating variant (`nudge.floating`, off on this site); closing it hides it for a while (`nudge.reappearAfterDays`).
- An anonymous **footprint button** ("I was here") on notes, and small interface touches: back to top, a hint to switch language, a theme button and a button that cycles the banner effect.
- A **notebook look** (hand-drawn ink, stamps, a struck-through mistake with its correction) and pixel details.
- **Bilingual** (ES/EN) with no language redirects.
- **Installable** as an app (manifest + icons), with no service worker.

## Turning things on and off

Everything optional is a switch in [`site.config.ts`](apps/web/src/site.config.ts), under `features`. Off means it ships nothing: no route, no menu entry, no script or CSS. An invalid value breaks the build and names the problem.

| Switch (`features.`) | What it adds | Needs |
| --- | --- | --- |
| `blog` | Lab Notes: index, notes and RSS | |
| `comments` | Giscus comments and reactions on notes | the `giscus` block |
| `contact` | The `/contact` form | Turnstile and email secrets (fails closed without them) |
| `me` | The `/me` portfolio page | |
| `credentials` | Certificates and degrees on `/me` | |
| `education` | `/education/` page and the "Recent education" block on `/me` | |
| `experiments` | `/experiments` and its sections on the home and `/me` | |
| `experimentNudge` | The latest-experiment card (off by default) | `experiments` |
| `changelog` | The public `/changelog` | |
| `readingMode` | Reading mode on notes | |
| `readingProgress` | Remembers where you stopped in a note and marks read notes | |
| `marks` | The "I was here" footprint button | a D1 database and a rate limiter |
| `subscribe` | Email subscription with double opt-in | `blog`, D1, Turnstile and email secrets |
| `backToTop`, `languageHint`, `themeToggle`, `backgroundPicker` | Interface touches (on by default) | |

Beyond the switches:

- **Home sections** (`home`): hero pills, author card, hiring card, footprints, "Now" card, pillars, notebook index and experiments, each on or off. The `appearance` preset (`minimal` or `full`) sets the starting point.
- **Colors, radii and fonts**: `packages/core/src/tokens/tokens.json`. **Banner effect**: `background`. **Site notice**: `notice`.
- **Texts**: your name, bio and links in `site.config.ts`; notes and portfolio entries in `apps/web/src/content/`; interface texts (ES/EN) in `apps/web/src/shared/i18n/index.ts`; privacy and terms in their `content.ts`.
- **Text lengths**: every interface text and 26 visible fields of `site.config.ts` have a maximum length, in Spanish and English, checked by tests, so a longer text fails with its name instead of overflowing. Table in [`docs/CONFIGURATION.en.md`](docs/CONFIGURATION.en.md#changing-a-text-length-limits-spanish-and-english).

These switches and home sections are everything configurable today; the rest of the layout is code. The full reference, with every key and default, is in [`docs/CONFIGURATION.en.md`](docs/CONFIGURATION.en.md#62-turning-features-on-or-off).

## Measured quality

The CI verifies all of this; if something fails, there is no deploy:

- **Mobile Lighthouse** ≥ 95 in all four categories, CLS ≤ 0.1 and LCP ≤ 2.7 s ([testing](docs/TESTING.md)).
- **JavaScript** ≤ 30 KiB (gzip) per page.
- **Accessibility with axe** (WCAG 2 A, AA and 2.1 AA) in light and dark theme and at 360, 768 and 1280 px.
- Over **1800 unit tests** and over **500 e2e** tests in a browser.
- One test checks that the site **sets no cookies of its own** and another that nothing of the owner leaks into a build with another identity.

## Getting started

You need [mise](https://mise.jdx.dev) (it installs the pinned Node and pnpm versions).

```bash
git clone https://github.com/elvinlab/elvinlab.dev.git
cd elvinlab.dev
mise install                                   # Node 24 and pnpm 12
mise exec -- pnpm install                      # dependencies
mise exec -- pnpm exec playwright install chromium   # once, for the browser tests
mise exec -- pnpm --filter web dev             # http://localhost:4321
```

The contact form needs Cloudflare secrets; without them it shows the "unavailable" state. [The configuration guide](docs/CONFIGURATION.en.md#5-reference-environment-variables-and-secrets) explains how to try it locally with the test keys.

## Commands

| Command | What it does |
| --- | --- |
| `pnpm --filter web dev` | Development server (includes note drafts) |
| `pnpm --filter web build` | Production build in `apps/web/dist` |
| `pnpm test` | Unit tests |
| `pnpm test:e2e` | Browser tests: smoke, accessibility, theme, comments, reading mode |
| `pnpm typecheck` · `pnpm lint` · `pnpm depcruise` | Types, format and lint, architecture boundaries |
| `pnpm check:js-budget` · `pnpm test:lighthouse` | JavaScript and Lighthouse budgets |
| `pnpm test:white-label` | Builds with another identity and looks for owner leaks |
| `pnpm new-post "Title"` | Creates a note draft |
| `pnpm publish-note <slug>` | Publishes a draft end to end (move, date, changelog, build, commit and release; `--dry-run`, `--no-release`) |
| `pnpm verify` | Touch-scoped verification plan for uncommitted changes (`--run` executes it) |
| `pnpm pulse:snapshot` | Refreshes the "most active" list from footprints and views (read-only; needs a `wrangler` session and `CLOUDFLARE_ANALYTICS_TOKEN`) |
| `pnpm docs:config` | Regenerates the tables in the configuration guide |

All of them run with `mise exec -- pnpm ...` to use the pinned versions.

## Repository structure

```
apps/web/        → the site (Astro): features/ by functionality, pages/, shared/ and content/
packages/core/   → @elvinlab/core: tokens, themes and i18n (presentation only)
docs/            → guides, brand, design, plan and ADRs
tests/           → e2e tests (Playwright) and isolated test notes
.github/         → CI, Dependabot and task template
odd/tasks/       → tracking of each feature
```

## Documentation

| Document | What it covers |
| --- | --- |
| [Configuration and update guide](docs/CONFIGURATION.en.md) | **Where each thing is configured and how everything is updated**: settings, content, secrets, dependencies and releases |
| [How to create a note](docs/NOTES.en.md) | A six-command quick recipe and, below it, the detailed step by step from draft to production |
| [`docs/PORTFOLIO.en.md`](docs/PORTFOLIO.en.md) | Editing `/me` and adding an experiment (also in [Spanish](docs/PORTFOLIO.md)) |
| [`docs/SUBSCRIPTION.en.md`](docs/SUBSCRIPTION.en.md) | Email subscription: how it works, data and privacy, limits, how to send a note and common problems (also in [Spanish](docs/SUBSCRIPTION.md)) |
| [`docs/PLAN.md`](docs/PLAN.md) | Vision, scope and rules (in Spanish) |
| [`docs/BRAND.md`](docs/BRAND.md) | Narrative, voice and brand tokens (in Spanish) |
| [`docs/DESIGN.md`](docs/DESIGN.md) | Visual direction, pages and accessibility |
| [`docs/CONVENTIONS.md`](docs/CONVENTIONS.md) | Architecture, code, styling and git flow |
| [`docs/TESTING.md`](docs/TESTING.md) | Browser tests and quality budgets |
| [`docs/adr/`](docs/adr/README.md) | Architecture decisions, one per document |

## Releasing

Work happens on `develop` with free pushes. A release is a push to `main`, which triggers the CI once (`static`, `e2e` and `lighthouse` → `checks` → `deploy`) and deploys to production with a smoke check and automatic rollback. A new **note** does not need that full run: `pnpm publish-note <slug>` publishes it and CI takes a **fast lane** (`static` → `notes-gate` → `deploy`, about 2 to 3 minutes; [ADR 0016](docs/adr/0016-publish-note-command-and-notes-fast-lane.md)). The exact steps, how to roll back and what to check afterwards are in [the configuration guide](docs/CONFIGURATION.en.md#7-releasing-and-rolling-back).

## Using it as a base

The site is meant to be adopted by someone else by replacing `site.config.ts`, the content and the images in `public/`. The full recipe, with the list of everything that still belongs to the author (`i18n` texts, `manifest`, `wrangler`, CI) and how to verify it, is in [the guide](docs/CONFIGURATION.en.md#10-using-this-site-as-a-base-for-someone-else-white-label).

**The CI follows your configuration.** Switching features off (or changing a name, a text or the palette) does not require editing tests: the browser specs read what is on and skip what is off. Four adopter scenarios (`quiet`, `blog-only`, `me-only`, `bare`) run the whole suite with `pnpm test:profiles`, and a CI job runs them without blocking the release. Texts have length limits in both languages so they cannot overflow. Details in [the guide](docs/CONFIGURATION.en.md#10-using-this-site-as-a-base-for-someone-else-white-label) and [TESTING.md](docs/TESTING.md#the-suite-follows-the-config-adopter-profiles).

## Status and license

In production at [elvinlab.dev](https://elvinlab.dev) since October 1, 2026. Progress is in the [GitHub Project](https://github.com/users/elvinlab/projects/2) and the history of visible changes in the [changelog](https://elvinlab.dev/en/changelog/).

The code is released under the [MIT license](LICENSE). The notes (the content of `content/notes`) are published under [CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/).

## Author

**Elvin González** · Costa Rica · [elvinlab.dev](https://elvinlab.dev/en/) · [GitHub](https://github.com/elvinlab) · [LinkedIn](https://www.linkedin.com/in/elvinlab) · [X](https://x.com/elvinlabweb)

<p align="right"><a href="#top">↑ Back to top</a></p>
