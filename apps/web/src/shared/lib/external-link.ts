const WEB_PROTOCOLS = new Set(['http:', 'https:']);
const WWW_PREFIX = 'www.';

/** Host without a trailing dot, lowercase (the URL parser already lowercases it). */
function normalizeHost(hostname: string): string {
  return hostname.endsWith('.') ? hostname.slice(0, -1) : hostname;
}

/**
 * True when `href` leaves the site: an absolute (or protocol-relative) http(s) URL whose host is
 * not the site's own domain. The apex, `www` and any subdomain of the domain in `siteUrl` count as
 * the site itself. Relative paths, anchors, `mailto:`, `tel:` and malformed URLs are never
 * external: they keep the default behavior (same tab).
 */
export function isExternalHref(href: string, siteUrl: string): boolean {
  try {
    const site = new URL(siteUrl);
    // Resolving against the site makes relative paths and anchors land on its own host.
    const target = new URL(href.trim(), site);
    if (!WEB_PROTOCOLS.has(target.protocol)) return false;
    const siteHost = normalizeHost(site.hostname);
    const own = siteHost.startsWith(WWW_PREFIX) ? siteHost.slice(WWW_PREFIX.length) : siteHost;
    const host = normalizeHost(target.hostname);
    return host !== own && !host.endsWith(`.${own}`);
  } catch {
    return false;
  }
}

/** Attributes of a link that may leave the site (`{}` when it stays on the site). */
export type ExternalLinkAttrs = { target?: '_blank'; rel?: string };

/**
 * The attributes a link needs: an external one opens in a new tab so the visitor keeps their place
 * (`noopener noreferrer` so the new page cannot reach back or see where it came from). `rel` keeps
 * an existing token such as `me` in front. Use it for every link whose destination can be
 * external, and pair the link text with `ExternalHint` so assistive technology announces the tab.
 */
export function externalLinkAttrs(href: string, siteUrl: string, rel?: string): ExternalLinkAttrs {
  if (!isExternalHref(href, siteUrl)) return rel ? { rel } : {};
  return { target: '_blank', rel: [rel, 'noopener', 'noreferrer'].filter(Boolean).join(' ') };
}
