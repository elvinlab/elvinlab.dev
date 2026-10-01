/// <reference types="astro/client" />

// Runtime values are deliberately unknown until the per-request contact validator accepts them.
declare module 'cloudflare:workers' {
  export const env: Record<string, unknown>;
}

// Build-time environment variables.
interface ImportMetaEnv {
  readonly PUBLIC_CF_ANALYTICS_TOKEN: string;
  readonly SITE_INDEXABLE: string | undefined;
  readonly PUBLIC_TURNSTILE_SITE_KEY: string | undefined;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
