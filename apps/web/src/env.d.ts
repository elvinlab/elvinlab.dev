// Runtime values are deliberately unknown until the per-request contact validator accepts them.
declare module 'cloudflare:workers' {
  export const env: Record<string, unknown>;
}

/// <reference types="astro/client" />

interface ImportMetaEnv {
  readonly PUBLIC_CF_ANALYTICS_TOKEN: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
