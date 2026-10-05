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

/** What the marks Actions need from the Worker environment; anything missing disables the feature. */
export const marksBindingsSchema = z.object({
  MARKS_DB: z
    .custom<D1Binding>((value) => hasFunction(value, 'prepare'))
    .describe('Cloudflare D1 database binding that stores the footprint totals.'),
  MARKS_RATE_LIMITER: z
    .custom<RateLimitBinding>((value) => hasFunction(value, 'limit'))
    .describe('Cloudflare rate-limit binding declared in wrangler.jsonc.'),
});
