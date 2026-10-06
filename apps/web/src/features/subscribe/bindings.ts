import { z } from 'zod';

import { SUBSCRIBE_POLICY } from './config.ts';

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

const secretSchema = z.string().min(1).max(4_096).regex(/^\S+$/);
// `Name <address>` or a bare address: the sender line of the emails. Never one control character.
const fromSchema = z
  .string()
  .max(SUBSCRIBE_POLICY.emailMaxLength + 100)
  .regex(/^[^\r\n]*$/)
  .regex(/^(?:[^<>]+<[^<>\s]+@[^<>\s]+>|[^<>\s]+@[^<>\s]+)$/);

/** What the subscribe Actions need from the Worker environment; anything missing disables the feature. */
export const subscribeBindingsSchema = z.object({
  SITE_DB: z
    .custom<D1Binding>((value) => hasFunction(value, 'prepare'))
    .describe(
      'The site-wide Cloudflare D1 database (`elvinlab-dev-db`). Every feature keeps its own tables in it; this one reads and writes `subscribers`.',
    ),
  SUBSCRIBE_RATE_LIMITER: z
    .custom<RateLimitBinding>((value) => hasFunction(value, 'limit'))
    .describe('Cloudflare rate-limit binding declared in wrangler.jsonc.'),
  RESEND_API_KEY: secretSchema.describe(
    'Resend API key used to send the confirmation and note emails (shared with the contact form).',
  ),
  SUBSCRIBE_FROM: fromSchema.describe(
    'Sender of the subscription emails, on a domain verified in Resend.',
  ),
  SUBSCRIBE_TOKEN_SECRET: z
    .string()
    .min(32)
    .max(4_096)
    .regex(/^\S+$/)
    .describe('Secret that signs the unsubscribe links (at least 32 characters).'),
  TURNSTILE_SECRET_KEY: secretSchema.describe(
    'Turnstile secret key for server-side verification (shared with the contact form).',
  ),
  TURNSTILE_HOSTNAME: z
    .string()
    .max(253)
    .regex(/^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/)
    .describe('Hostname a valid Turnstile token must report.'),
});

/** Confirming and unsubscribing only touch the list and the signing secret. */
export const listBindingsSchema = subscribeBindingsSchema.pick({
  SITE_DB: true,
  SUBSCRIBE_TOKEN_SECRET: true,
});

/** Sending a note needs the list, the secret and the mail provider, but no visitor-facing gates. */
export const sendBindingsSchema = subscribeBindingsSchema.pick({
  SITE_DB: true,
  SUBSCRIBE_TOKEN_SECRET: true,
  RESEND_API_KEY: true,
  SUBSCRIBE_FROM: true,
});
