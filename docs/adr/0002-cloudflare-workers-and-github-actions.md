# 0002. Cloudflare Workers static assets, GitHub Actions + wrangler

Status: Accepted

## Context
Need hosting for the static Astro build with free tier, image optimization at build time, preview deployments per PR, and SHA-verified production deploys with rollback.

## Decision
- **Cloudflare Workers free plan** for static assets (`apps/web/dist`).
- **`imageService: 'compile'`** — images optimized at build time, no runtime Workers Images.
- **GitHub Actions + wrangler** (not Workers Builds) for deploy control.
- **Previews** via `--preview-alias` → `https://pr-<N>-elvinlab-staging.lab-previews.workers.dev`.
- **Production** (`main`) → `elvinlab`; **staging** (`develop`) → `elvinlab-staging`.
- **SHA-verified deploys** — the build writes the commit SHA to `version.txt`, the smoke check waits for it, and a failed check runs `wrangler rollback`.

## Consequences
- No Cloudflare Workers Builds (less control, harder rollback).
- `wrangler login` required locally; CI uses `CLOUDFLARE_API_TOKEN`.
- Smoke check script (`.github/scripts/smoke-check.sh`) runs after every deploy.
