# 0006. DNS and hosting cutover

Status: Accepted

## Context

Domain was on Porkbun DNS pointing to GitHub Pages; needed Cloudflare Workers hosting with apex+www support.

## Decision

Moved DNS zone from Porkbun to Cloudflare (nameservers lara/maciej.ns.cloudflare.com). Worker `elvinlab` uses Cloudflare Custom Domains for both elvinlab.dev and www.elvinlab.dev. A Redirect Rule (301, preserve query) sends www -> apex. GitHub Pages retired (A records and www CNAME removed after cutover). Preserved existing mail-related TXT/MX records during migration (Resend DKIM, SPF, DMARC) even though the domain has no inbound email use today.

## Consequences

DNS now fully managed in Cloudflare (single provider for DNS+hosting+Workers); no more GitHub Pages; www always redirects, canonical host is apex.