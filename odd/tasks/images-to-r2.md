# Feature: move image originals out of the repository (Cloudflare R2)

Status: **recorded, not started** (owner, 2026-10-06: "I want to move images out of the repo, I think it is bad practice, and I would like to work on it soon"). Supersedes the decision of `docs/adr/0015-images-live-in-the-repository.md` once done (new ADR 0016); until then 0015 stands.
Tier: 3 (architecture, build pipeline, remote infrastructure).

## Objective

The repository keeps only references to images (key, alt, caption, dimensions). The original files live in a Cloudflare R2 bucket served from a public domain, and the site keeps its current performance: pages still ship optimized webp with explicit dimensions, no runtime dependency on the bucket.

## Proposed design (to validate in the first step)

1. **Storage:** an R2 bucket with public access through a custom domain (for example `img.<site domain>`), keys like `experiments/<slug>/<name>.jpg` and `education/<id>.<ext>`. R2 free tier checked 2026-10-06: 10 GB-month, 1 M Class A and 10 M Class B operations per month, free egress.
2. **Build keeps optimizing:** Astro's `<Image>` accepts remote sources listed in `image.domains` / `remotePatterns`; the build downloads each original once, produces webp at several widths and writes them into `dist` (so visitors never hit the bucket). Dimensions are stored next to the reference (or inferred at build with `inferSize`), so there is no layout shift.
3. **Data model:** `images[].file` becomes a key (or full URL) resolved against a new config value `images.baseUrl` in `site.config.ts` (white-label: a fork points it at its own bucket or at a local folder). A local fallback (a folder path) keeps `astro dev` and the fixture/e2e builds working without network and without owner images.
4. **Seam:** every access already goes through one helper (`shared/lib/experiment-image.ts`); the loader checks existence at build time (HEAD request or manifest), so a missing object still fails the build.
5. **Upload workflow:** a small documented command (`wrangler r2 object put` or a script) plus a checklist (privacy, size, format); no secrets in the repo; CI needs no write credential (public read only).
6. **Migration:** upload the current files (`assets/experiments/**`), switch the references, delete the files from the working tree. Git history keeps the old blobs (about 0.6 MB): no history rewrite (destructive, not worth it).
7. **Docs and records:** new ADR 0016 (supersedes 0015), `docs/PORTFOLIO.md` upload steps, `docs/DESIGN.md` image policy update, `docs/CONFIGURATION*.md` for `images.baseUrl`, changelog, verification map (the build now depends on the network: decide the CI behavior if the bucket is unreachable).

## Remote operations that need the owner's explicit authorization (each time: destination, operation, credential/session)

- Create the R2 bucket in the Cloudflare account.
- Enable public access / attach the custom domain (DNS record on the zone).
- Upload the existing image files (`wrangler r2 object put`) with the owner's `wrangler` login.
- Any CORS or cache rule on the bucket or the zone.
Nothing remote is done before that authorization; local code, schema, docs and tests can be prepared first.

## Risks and checks

- Build reproducibility: the build now needs the bucket (or the local fallback); define the failure behavior and keep the e2e/fixture builds offline.
- White-label: neutral build must not reference the owner's bucket; `white-label-check.ts` must still catch a leak.
- Performance: no change expected for visitors (assets are optimized at build and served from the site); measure `/experiments/` and `/me/` with Lighthouse before and after.
- Dev experience: `astro dev` with remote originals must not be slow or blank on first load (the cold-start check applies).
- Images of personal documents: only public copies, never originals.

## Acceptance

- No image original under `apps/web/src/assets/experiments/` or `education/` in the working tree; references resolve from `images.baseUrl`.
- Builds, `pnpm verify --run`, white-label and Lighthouse pass; a missing object fails the build with a clear message.
- ADR 0016 written, ADR 0015 marked superseded, docs and changelog updated.

## Suggested timing

After today's Experiments release (which ships with images in the repo, because the helper is the single seam and the move needs Cloudflare authorizations and its own verification), as the next infrastructure task.

## Progress

- 2026-10-06: recorded only.
