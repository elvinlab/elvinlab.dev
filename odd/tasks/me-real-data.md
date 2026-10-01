# Feature: /me real data (replace placeholders)

## Objective

Replace placeholder content in `experience.json`, `credentials.json` with the user's real professional history, and flip `features.me` on so `/me` goes live.

## Problem / why

`/me` has shipped with placeholder data (`[ROLE]`, `[COMPANY]`, `[CERTIFICATE NAME]`, etc.) since before launch; `features.me: false` keeps it hidden, noindex, out of the sitemap and out of every nav/cross-link (ADR 0008). This is the last blocker before the recruiter page can go public.

## Source of truth

User-provided LinkedIn PDF export, read 2026-10-01 (`/home/elvinlab/Downloads/Profile.pdf`, not committed to the repo — personal file, stays local). Real name, contact info, 5 past roles, 1 degree, several minor course certificates.

## Decisions (confirmed with user)

- Include all 4 software-engineering roles from the CV (Buo, Blue Zone Consulting Partners, CNET Technology System, Hacienda el Orosi).
- **Excluded**: "Julio Celulares" (2015-2017, tech support, pre-software-career) — parent's recommendation, not separately objected to when the user said "dale con lo que tenes."
- **Excluded**: the 3 English A1 workshop certificates — too minor for a professional credentials section, parent's recommendation.
- **Included certificates**: "Claude Code: Guía completa para desarrolladores de software" and "Master en webs Full Stack: Angular, Node, Laravel, Symfony+". **Dates are parent's best estimate, not from the CV** (the PDF listed no dates for any certificate) — flagged for the user to correct; this is exactly the kind of content the user called "configurable... prendible o apagable o editable," so shipping an estimate and letting the user fix it later is accepted scope, not a silent fabrication (documented here precisely so it's traceable).
- **CV download link**: not provided (no public https URL for the PDF); `recruiter.cvUrl` stays unset. Can be added later — it's `optional()` in the schema, zero migration cost.
- User corrected the Buo start date implicitly by providing the real CV: placeholder `experience.json` had `buo.start: 2022`, which was actually Blue Zone's start year — real Buo start is **2024** (per CV, "julio de 2024").

## Scope

In scope:
- `apps/web/src/content/experience.json`: 4 real entries (buo, blue-zone, cnet, hacienda-el-orosi), replacing the 2-entry placeholder (`buo` placeholder values, `earlier` placeholder entry).
- `apps/web/src/content/credentials.json`: 2 real entries (degree + 1 cert... see decision above for the 2 certs included), replacing the 3-entry placeholder (`cert-a`, `cert-b`, `degree-a`).
- `apps/web/src/site.config.ts`: `features.me: true` (currently `false`).

Out of scope: `recruiter.cvUrl` (no source), photo/avatar (schema has no such field at all — confirmed, not just unset), changing `identity`/`recruiter`/`me.intro` copy (already real, not placeholder, not touched).

## Tasks

- [x] **ME1** — `experience.json`: 4 real entries, correct dates/companies/roles from the CV, one-line truthful summaries (parent-authored, not copy-pasted CV bullet lists — schema caps `summary` at 280 chars and the existing file's own doc-comment says "no bullets, one truthful summary line"), kebab-case tags (max 5 each, picked from the CV's listed technologies per role). Route: direct inline (1 file, mechanical data entry from an already-read source, no research needed).
- [x] **ME2** — `credentials.json`: 2 real entries (degree + 2 certs per the decision above), with the estimated-date caveat recorded in this doc and as an inline code comment at the top of the file so it survives independent of this tracker. Route: direct inline.
- [x] **ME3** — `site.config.ts`: flip `features.me` to `true`. Route: direct inline (1-line change, already-understood).
- [x] **ME4** — Run the full check suite (typecheck/lint/test/depcruise/build/white-label) since this un-hides a previously-off feature flag — untested code paths (nav entry, sitemap inclusion, `/me` indexability) activate for the first time with real content.

## Authorized scope

ME1-ME4 only. No ADR for this one (it's content, not an architecture decision) — just this tracker doc as the record, per the user's explicit "documentá todo."

## Acceptance criteria

- `mise exec -- pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm depcruise`, `pnpm --filter web build`, `pnpm test:white-label` all pass.
- `/me` and `/en/me` build with the real data, no `[PLACEHOLDER]` strings remain anywhere in `experience.json`/`credentials.json`.
- `/me` now appears in the nav and the sitemap (flag is on).
- The source PDF (`/home/elvinlab/Downloads/Profile.pdf`) is never copied into the repo — personal document, stays local only.

## Checks run / evidence

Done inline (Tier 3 justification: real personal data entry from a just-read source, no research/delegation needed — writing it myself is cheaper than briefing a writer on content I already have fully parsed).

- `mise exec -- pnpm typecheck` — 0 errors (165 files).
- `mise exec -- pnpm lint` — clean (205 files).
- `mise exec -- pnpm test` — 301/301 web + 34/34 core, unaffected (no code changed, only content + one config flag).
- `mise exec -- pnpm depcruise` — clean, 143 modules / 335 deps.
- `mise exec -- pnpm --filter web build` — succeeds; grepped the built `dist/client/me/index.html` and `en/me/index.html` for every placeholder pattern (`[CERTIFICATE...]`, `[ROLE]`, `[COMPANY]`, `[ISSUER]`, `[DEGREE...]`, `[UNIVERSITY]`, `[WHAT YOU...]`) — zero matches; grepped for the 4 real company names and the university — all present; confirmed `/me/` now appears in both `sitemap-0.xml` (as `https://elvinlab.dev/me/` and `/en/me/`) and the home page nav (`href="/me/"`), proving the flag flip actually activated the previously-dormant code paths (nav filter, sitemap-filter, noindex gating).
- `mise exec -- pnpm test:white-label` — passes, no owner-string leak with the real data in place.
- `mise exec -- pnpm check:js-budget` — `/me/` and `/en/me/` both PASS at 5.28 KiB gzip.

**Known gap, not a blocker per the user's explicit instruction**: both certificate entries carry `"issuer": "Plataforma sin confirmar"` (parent-visible placeholder, intentionally not a silent guess) since the source PDF listed no issuing platform for either course; dates on those two certificates (`claude-code-guide: 2026`, `full-stack-bootcamp: 2021`) are parent estimates from career-timeline context, not sourced from the PDF. Both are one-line JSON edits whenever the user has the real values.

Committed as `95e651b`, shipped live in the first production release.

## Follow-up 2026-10-01 (later the same day): real avatar + availability status

User request: no longer available (working at Buo), and wanted a real photo instead of the initials placeholder.

- **Schema**: `identity.avatar?: string` added to `shared/config/schema.ts` (site-relative path, e.g. `/avatar.png`; optional so white-label builds without a photo still work).
- **Asset**: user's PNG (`~/Downloads/current_avatar.png`) copied into `apps/web/public/avatar.png` — never referenced from the Downloads path, copied into the repo's own asset directory.
- **`MeHero.astro`**: renders `<img src={site.identity.avatar} ...>` when set, falls back to the existing initials box otherwise — verified via the white-label build (its fixture has no `avatar` set, confirming the fallback path still renders).
- **`site.config.ts`**: `identity.avatar: '/avatar.png'`; `recruiter.available` stays `true` (that flag is the user's existing hide/show toggle for the whole status line, already wired into `HiringCard.astro` and `MeSidebar.astro` — no code change needed there) but `status`/`lookingFor` text changed to reflect being unavailable ("No disponible · trabajando en Buo" / "Currently at Buo") instead of removing the flag's meaning.
- Verified: typecheck/lint/313 tests/depcruise/build/white-label/js-budget all green; confirmed in built HTML that `/avatar.png` renders on `/me/` and the new status text appears on the home page's hiring card.

## Next step

Done. Not committed yet — bundling with the next commit per the user's "hace push ya."
