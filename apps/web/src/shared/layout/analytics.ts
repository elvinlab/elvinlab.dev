/**
 * Helper to decide whether to render the Cloudflare Web Analytics beacon.
 * The beacon is rendered only when the build-time env var PUBLIC_CF_ANALYTICS_TOKEN
 * is a non-empty string.
 */
export function shouldRenderBeacon(): boolean {
  const token = import.meta.env.PUBLIC_CF_ANALYTICS_TOKEN;
  return typeof token === 'string' && token.length > 0;
}

export function getBeaconToken(): string | undefined {
  const token = import.meta.env.PUBLIC_CF_ANALYTICS_TOKEN;
  return typeof token === 'string' && token.length > 0 ? token : undefined;
}
