import { siteConfig } from '@/site.config.ts';

import { buildEnv } from './env.ts';
import { resolveIntegrations } from './integrations.ts';
import { type Feature, parseSiteConfig, type SiteConfig } from './schema.ts';

export { type Feature, parseSiteConfig, type SiteConfig } from './schema.ts';

/** The validated site config. Parsed on import, so a bad `site.config.ts` fails the build. */
export const site: SiteConfig = parseSiteConfig(siteConfig);

export function isEnabled(feature: Feature): boolean {
  return site.features[feature];
}

/** Integration ids after applying the environment overrides (env wins over the config). */
export const integrations = resolveIntegrations(site.integrations, buildEnv);

export { buildEnv } from './env.ts';
