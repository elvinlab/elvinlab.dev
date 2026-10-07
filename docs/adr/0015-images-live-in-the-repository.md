# 0015. Images live in the repository; Cloudflare R2 is the documented way out

Status: Accepted (2026-10-06)

See also: the image rules in `docs/DESIGN.md` ("Images of experiments and credentials") and ADR 0004 (white-label by configuration and content).

## Context
Experiments get screenshots and a small gallery, and the education page will show public copies of certificates. The owner asked whether these images should stay in the repository or move to Cloudflare. Today there are about a dozen images of roughly 100 KB each (about 1.2 MB of sources). The policy caps an experiment at four images, so even twenty experiments would be about a hundred images, around 10 MB. The site is static, built by Astro with `imageService: 'compile'` (images are optimized at build time), and ADR 0004 requires that a fork can replace the owner's content without touching code.

Cloudflare figures checked on 2026-10-06 in the vendor documentation: R2 free tier is 10 GB-month of storage, 1 million Class A and 10 million Class B operations per month, and egress to the Internet is free ([R2 pricing](https://developers.cloudflare.com/r2/pricing/)); Cloudflare Images transforms up to 5,000 unique images per month on the free plan, including images stored elsewhere such as R2 ([Images pricing](https://developers.cloudflare.com/images/pricing/)). Prices change: check the pages again before relying on them.

## Decision
- **Images stay in the repository**, under `apps/web/src/assets/experiments/<slug>/` and `apps/web/src/assets/education/<id>.<ext>`, never `public/`. They go through `astro:assets` (`<Image>`), which produces webp at several widths with explicit width and height at build time, so there is no layout shift and no runtime dependency.
- **A missing file fails the build** at load time, so a page can never ship a broken image.
- **All access goes through one helper** (`shared/lib/experiment-image.ts`). It is the single place that knows where an image comes from, which keeps the exit below cheap.
- **Sources stay small:** at most 1600 px wide and 500 KB each. A screenshot of the site is a snapshot: refresh it only when the design really changes, because every new version stays in the Git history forever (about 100 KB each).
- **Originals of personal documents never enter the repository**, only public copies without ID numbers, signatures or QR codes.

## Why not Cloudflare now
- It adds a bucket, a credential and an upload step, plus URLs in the content data, and every step in the owner's account is a remote operation that needs explicit authorization.
- Build-time dimensions and the build failure on a missing file would be lost, or would have to be rebuilt in a script.
- A fork of the site would need its own bucket, which breaks the "configuration and content only" promise of ADR 0004.
- The size problem it solves does not exist yet.

## When to move to R2
Move when one of these becomes true, and write a new ADR that supersedes this one:
1. The repository passes roughly 100 to 200 MB of image assets.
2. The site starts showing video, GIFs or full-resolution PDFs (for example certificates with a viewer).
3. Someone who does not touch code must add images without a deploy.

## Consequences
- The repository grows by the size of every committed image, and the build time grows slightly with the number of images.
- Replacing a screenshot is a commit, not an upload.
- Moving to R2 later means changing the helper so that `file` can be a URL, serving the images from a custom domain or a Worker, and optionally enabling Cloudflare Images transformations; the pages and components do not change.
