import { siteConfig } from '../../../site.config.ts';
import { type Feature, parseSiteConfig, type SiteConfig } from './schema.ts';

export { type Feature, parseSiteConfig, type SiteConfig } from './schema.ts';

/** The validated site config. Parsed on import, so a bad `site.config.ts` fails the build. */
export const site: SiteConfig = parseSiteConfig(siteConfig);

export function isEnabled(feature: Feature): boolean {
  return site.features[feature];
}
