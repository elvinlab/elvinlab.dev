# Architecture Decision Records

Index of ADRs for the elvinlab.dev monorepo. Each ADR follows the format:

```
# NNNN. Title

Status: <proposed | accepted | superseded>

## Context
<What is the issue?>

## Decision
<What are we doing?>

## Consequences
<What are the tradeoffs?>
```

Short (≤40 lines each).

---

## ADRs

| ID | Title | Status |
|----|-------|--------|
| [0001](./0001-astro-tailwind-pnpm-monorepo.md) | Astro + Tailwind v4 + React islands, pnpm workspace | Accepted |
| [0002](./0002-cloudflare-workers-and-github-actions.md) | Cloudflare Workers static assets, GitHub Actions + wrangler | Accepted |
| [0003](./0003-screaming-architecture-and-core-boundary.md) | Screaming architecture, core presentation-only boundary | Accepted |
| [0004](./0004-white-label-configuration.md) | White-label via config + data collections + theme file | Accepted |
| [0005](./0005-preact-for-islands.md) | Preact for islands (amends 0001) | Accepted |
| [0006](./0006-dns-cloudflare-custom-domains.md) | DNS and hosting cutover: Porkbun to Cloudflare, Custom Domains | Accepted |
| [0007](./0007-ci-parallel-gates-aggregate.md) | CI shape: parallel gates behind one required aggregate | Accepted |
| [0008](./0008-launch-gate-feature-flags.md) | Launch gate via feature flags (experiments, /me) | Accepted |
| [0009](./0009-contact-security-observability.md) | Contact form security and observability | Accepted |
| [0010](./0010-visitor-changelog-no-semver-single-language.md) | Visitor-facing changelog: dated entries, no semver, single language (amended 2026-10-07: grouped by production day and kind) | Accepted |
| [0011](./0011-ci-gate-once-at-main-pr-no-staging.md) | CI gates once at the develop -> main PR; no staging environment | Accepted |
| [0012](./0012-direct-push-to-main-no-pr-gate.md) | Direct push to main, no PR gate (scaling-back path documented) | Accepted |
| [0013](./0013-footprints-on-notes-d1.md) | Footprints on notes: an anonymous counter in Cloudflare D1 | Accepted |
| [0014](./0014-email-subscription-d1-list-resend-port.md) | Email subscription: the list lives in D1, the mail provider behind a port | Accepted |
| [0015](./0015-images-live-in-the-repository.md) | Images live in the repository; Cloudflare R2 is the documented way out | Accepted |
