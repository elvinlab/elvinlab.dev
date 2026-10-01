# 0009. Contact security and observability

Status: Accepted

## Context

The /contact form (Turnstile + Resend + IP rate limiter) needed to fail safe, avoid leaking secrets/PII in logs, and work under Cloudflare Workers' fetch restrictions.

## Decision

Turnstile widget loads lazily; public site key differs per environment; all provider secrets live only in Cloudflare (never in repo or client code); the form includes a honeypot field sent as a typed field; the Action fails closed (SERVICE_UNAVAILABLE) when required config/bindings are missing rather than silently succeeding or leaking internals. Diagnostics log only stage name and provider response codes, never field values, tokens or secrets. All provider fetch calls use `redirect: 'manual'` because Cloudflare Workers' fetch implementation rejects `redirect: 'error'` (TypeError at runtime) — this was a real production incident, root cause confirmed.

## Consequences

Safer defaults (fail closed, no secret leakage) at the cost of a less informative error for the end user; any future outbound fetch added to this codebase must also avoid `redirect: 'error'` on Workers.