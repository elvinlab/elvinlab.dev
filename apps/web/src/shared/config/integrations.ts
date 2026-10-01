export type IntegrationsInput = {
  cloudflareAnalyticsToken?: string | undefined;
  turnstileSiteKey?: string | undefined;
};

/** The build-time variables that may override an integration id from the site config. */
export type IntegrationsEnv = {
  PUBLIC_CF_ANALYTICS_TOKEN?: string | undefined;
  PUBLIC_TURNSTILE_SITE_KEY?: string | undefined;
};

const pick = (override: string | undefined, fallback: string | undefined): string | undefined => {
  const value = override?.trim();
  return value ? value : fallback;
};

/** The effective integration ids: a non-empty environment variable wins over the site config. */
export function resolveIntegrations(config: IntegrationsInput, env: IntegrationsEnv) {
  return {
    analyticsToken: pick(env.PUBLIC_CF_ANALYTICS_TOKEN, config.cloudflareAnalyticsToken),
    turnstileSiteKey: pick(env.PUBLIC_TURNSTILE_SITE_KEY, config.turnstileSiteKey),
  };
}
