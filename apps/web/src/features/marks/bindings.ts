import { z } from 'zod';

export interface D1Binding {
  prepare(sql: string): unknown;
}

export interface RateLimitBinding {
  limit(options: { key: string }): Promise<unknown>;
}

const hasFunction = (value: unknown, name: string): boolean =>
  typeof value === 'object' &&
  value !== null &&
  name in value &&
  typeof (value as Record<string, unknown>)[name] === 'function';

/** What the marks Actions need from the Worker environment; anything missing disables the feature.
 * `SITE_DB` is shared by every feature of the site (one database, one table per feature); the rate
 * limiter is specific to this one. */
export const marksBindingsSchema = z.object({
  SITE_DB: z
    .custom<D1Binding>((value) => hasFunction(value, 'prepare'))
    .describe(
      'The site-wide Cloudflare D1 database (`elvinlab-dev-db`). Every feature keeps its own tables in it; this one reads and writes `note_footprints`.',
    ),
  MARKS_RATE_LIMITER: z
    .custom<RateLimitBinding>((value) => hasFunction(value, 'limit'))
    .describe('Cloudflare rate-limit binding declared in wrangler.jsonc.'),
});
