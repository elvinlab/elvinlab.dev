/**
 * Client identity for rate limiting. In production Cloudflare overwrites `cf-connecting-ip`, so it
 * is the only trusted source. Local dev has no proxy and therefore no header: loopback keeps the
 * form testable there, and is never used in a production build.
 */
export function resolveClientIp(header: string | null, isDev: boolean): string | undefined {
  if (header) return header;
  return isDev ? '127.0.0.1' : undefined;
}
