import { isIndexable } from '@/shared/seo/isIndexable.ts';

/**
 * The one place that reads build-time environment variables for runtime code (see ENV_VARS for the
 * full list and what each does). Vite replaces each variable reference literally, so each one is
 * written out here once. Config-time Node code (`astro.config.ts`, integrations) reads
 * `process.env` and is listed in the same registry.
 */
export const buildEnv = {
  /** True only for production builds (SITE_INDEXABLE is exactly "true"). */
  siteIndexable: isIndexable({ SITE_INDEXABLE: import.meta.env.SITE_INDEXABLE }),
  PUBLIC_CF_ANALYTICS_TOKEN: import.meta.env.PUBLIC_CF_ANALYTICS_TOKEN as string | undefined,
  PUBLIC_TURNSTILE_SITE_KEY: import.meta.env.PUBLIC_TURNSTILE_SITE_KEY as string | undefined,
};
