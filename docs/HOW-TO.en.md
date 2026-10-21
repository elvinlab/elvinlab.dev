# Frequent tasks: step by step

A recipe sheet for the things done by hand that are easy to forget. Every recipe is copy and paste; each one ends with a pointer to the full guide. All commands run from the repository root through `mise exec --`. Spanish version: [HOW-TO.md](HOW-TO.md).

Golden rules: **nothing reaches production without a release** (a push to `main`, recipe 9) and **no visible change ships without its changelog entry** (recipe 8).

## What gets updated, and how often

| What | Where | When | Recipe |
| --- | --- | --- | --- |
| A new note | `apps/web/src/content/drafts/` → `notes/` | Every time you publish | 1 |
| Email notice for that note or a new project | `pnpm notify:note <slug>` / `pnpm notify:project <key>` | After publishing and releasing | 2 |
| "Start here" notes | `startHere` in the frontmatter of 3 notes | When what you want to highlight changes | 3 |
| "Most active" ranking of `/notes/` | `pnpm pulse:snapshot` | Before every release | 4 |
| Home "Now" card | `now` block of `site.config.ts` (and `updatedAt`) | When your focus changes | 5 |
| Projects (experiments), their images and data | `content/experiments.json` + `assets/experiments/<key>/` | When a project is new or changes | 6 |
| CV, availability, experience, certificates, stack | `site.config.ts`, `experience.json`, `credentials.json` | When your situation changes | 7 |
| Changelog | `content/changelog.json` | On every visible change | 8 |
| Release | push to `main` | When there is something to publish | 9 |
| Legal dates | `legal.privacyUpdated` / `termsUpdated` | Only if the legal text changes | see `CONFIGURATION.en.md` 6.8 |
| Secrets (form, notices) | Cloudflare + `.dev.vars` | When rotating them | see `CONFIGURATION.en.md` 6.7 and `SUBSCRIPTION.en.md` |
| Dependencies and tools | `.mise.toml`, `package.json` | When due | see `CONFIGURATION.en.md` 6.11 |

The full "what do I change and where" map is in [`CONFIGURATION.en.md`](CONFIGURATION.en.md), section 1.

## 1. Write and publish a note

```bash
mise exec -- pnpm new-post "Note title"               # creates the draft (not in git)
mise exec -- pnpm --filter web dev                    # view it at http://localhost:4321/notes/<slug>/
```

1. Fill in the frontmatter and the decision record (`decision:`) in `apps/web/src/content/drafts/<slug>/index.mdx`.
2. Mandatory editorial review ([`NOTES.en.md`](NOTES.en.md), sections 1.1, 1.2 and 11): the narrator is the signing author, never the assistant; verify every claim against its source; read the complete text.
3. Dry run and publish (from `develop`, with a clean tree):

```bash
mise exec -- pnpm publish-note <slug> --dry-run       # shows what it would do
mise exec -- pnpm publish-note <slug>                 # moves, dates, changelog, build, commit, push and release
gh run watch                                          # the notes-only fast lane takes 2-3 min
```

4. Check in production that the card and the comments appear.

Details: [`NOTES.en.md`](NOTES.en.md) (quick recipe and step by step).

## 2. Email a note to subscribers

Manual by design. Only after the note is live.

```bash
export SUBSCRIBE_ADMIN_TOKEN="$(cat ~/.config/elvinlab/subscribe-admin-token)"
mise exec -- pnpm notify:note <slug>                  # dry run: counts recipients, sends nothing
mise exec -- pnpm notify:note <slug> --send           # real send
```

- Each person gets the notice in their language; only the slug travels; repeating it never duplicates.
- If the result says `remaining` is above 0 (daily limit), run it again the next day.
- The token goes only through an environment variable, never in a repository file. To rotate it: [`SUBSCRIPTION.en.md`](SUBSCRIPTION.en.md), section 6.

**Announcing a new project** (after releasing it, recipes 6 and 9): same flow with `notify:project` and the `experiments.json` key.

```bash
mise exec -- pnpm notify:project <key>                # dry run (with SUBSCRIBE_ADMIN_TOKEN exported)
mise exec -- pnpm notify:project <key> --send         # real send
```

The email is built from the experiment itself (title, description and link to its page) in both languages, each subscriber in theirs; the daily cap is a single one and repeating never duplicates. A project does not need a note of its own: nothing else has to be written.

## 3. Change "Start here"

It is set in the notes' frontmatter, not in the configuration.

1. On the note that leaves: remove `startHere` and `startHereNote`.
2. On the note that enters: add `startHere: 1` (or 2 or 3, unique per language) and `startHereNote: "Why start here"` (required, at most 120 characters).
3. `mise exec -- pnpm --filter web build` fails on duplicates, a missing reason or an out-of-range number.
4. If fewer than 3 are marked, the rest is filled with the latest notes.

Details: [`NOTES.en.md`](NOTES.en.md), section 3.1.

## 4. Refresh the "most active" notes ranking

It reads the production footprints (a read-only `SELECT` on D1 through a logged-in `wrangler`) and the page views of the last 30 days (a read-only Web Analytics query). Run it **before every release** and commit the result.

```bash
export CLOUDFLARE_ANALYTICS_TOKEN=...     # an "Account Analytics: Read" token; shell only, never in the repo
export CLOUDFLARE_ACCOUNT_ID=...          # or pass --account <id>
mise exec -- pnpm pulse:snapshot --dry-run    # prints without writing
mise exec -- pnpm pulse:snapshot              # rewrites apps/web/src/features/notes/lib/pulse-snapshot.ts
```

Without the token the command stops on purpose; `--marks-only` skips it and uses footprints alone. Views are estimates (Cloudflare samples them).

## 5. Update the home "Now" card

In `apps/web/src/site.config.ts`, `now` block: edit `items` (1 to 3 rows, `kind` is `focus`, `building`, `exploring` or `learning`, text in `es` and `en`, at most 120 characters) and **bump `updatedAt`** to today (`YYYY-MM-DD`). Without a fresh `updatedAt` the card shows an old date.

## 6. Add or edit a project (experiment), with its images and data

1. Data: `apps/web/src/content/experiments.json`, one key per project. Only `title`, `description` and `year` are required; the rest (`subtitle`, `problem`, `contribution`, `result`, `tags`, `publishedAt`, `status`, `url`, `repo`, `note`, `images`) is optional.
2. Images: your own 1280×800 (16:10) screenshots in `apps/web/src/assets/experiments/<key>/`, never in `public/`, each with its `alt`.
3. Privacy: never name or link private repositories; never announce projects that do not exist.
4. Verify: `mise exec -- pnpm test` · `pnpm typecheck` · `pnpm lint` · `pnpm verify`. If you changed a schema: `pnpm docs:config`.
5. Changelog (recipe 8) and release (recipe 9).

Details: [`PORTFOLIO.en.md`](PORTFOLIO.en.md), sections 1, 3 and 7.

## 7. Update the CV, availability, experience, certificates and stack

| What | Where |
| --- | --- |
| CV links (one per language), status, "what I look for" | `site.config.ts` → `recruiter.cvUrl`, `recruiter.status`, `recruiter.lookingFor` (`available`, `openToWork`) |
| Headline, pitch, facts, timezone, languages, `/me` stack | `site.config.ts` → `me.*` |
| Name, bio, role, socials | `site.config.ts` → `identity` |
| Photo and avatar | files in `apps/web/src/assets/` (`photo.jpg`, `avatar.png`); `site.config.ts` holds only the file names |
| Work experience | `content/experience.json`: one key per job; no `end` means "current" |
| Certificates and education | `content/credentials.json`: required `title`, `issuer`, `kind`, `year`; optional `month`, `url`, `credentialId`, `order`, `learnings`, `image` |

When you upload a new CV, replace the Drive link in `cvUrl` (one per language). An invalid value breaks the build and lists every problem.

Details: [`PORTFOLIO.en.md`](PORTFOLIO.en.md) and [`CONFIGURATION.en.md`](CONFIGURATION.en.md), sections 3, 4 and 6.

## 8. Record the change in the changelog

Every change a visitor or a developer can see gets an entry, in English, **in the same work unit that ships it**. In `apps/web/src/content/changelog.json` add a new key:

```json
"unique-key": {
  "date": "2026-10-21",
  "category": "added",
  "title": "What changed, in one line",
  "description": "One or two sentences with the why and the effect."
}
```

`category` is `added`, `changed`, `removed` or `fixed`. Before a release: `mise exec -- pnpm changelog:audit` (fails if a `feat`, `fix` or `perf` commit lacks one) and `mise exec -- pnpm changelog:stamp` (dates the entries with the release day). Notes published with `publish-note` already add theirs.

## 9. Release to production

It is your decision every time: a push to `main` deploys. `main` and `develop` have diverged histories, so never `git merge`:

```bash
git commit-tree 'develop^{tree}' -p origin/main -m "release: ..."   # a commit holding develop's tree
# fast-forward main to it, confirm `git diff main develop` is empty, then push
gh run list --branch main --limit 1                                   # CI runs once and deploys
curl -s https://elvinlab.dev/version.txt                              # must show the new commit
```

Exact steps and how to revert: [`CONFIGURATION.en.md`](CONFIGURATION.en.md), section 7. Before it: recipe 4 (ranking) and recipe 8 (changelog audit).
