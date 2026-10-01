import { z } from 'zod';

import { CONTACT_POLICY } from './config.ts';

export interface RateLimitBinding {
  limit(options: { key: string }): Promise<unknown>;
}

const addressSchema = z
  .string()
  .max(CONTACT_POLICY.emailMaxLength)
  .regex(/^[^\r\n]*$/)
  .pipe(z.email());
const secretSchema = z.string().min(1).max(4_096).regex(/^\S+$/);

/** What the contact Action needs from the Worker environment; anything missing disables the form. */
export const bindingsSchema = z.object({
  RESEND_API_KEY: secretSchema.describe('Resend API key used to send the notification email.'),
  CONTACT_FROM: addressSchema.describe('Sender address of the notification email.'),
  CONTACT_TO: addressSchema.describe('Inbox that receives the contact messages.'),
  TURNSTILE_SECRET_KEY: secretSchema.describe('Turnstile secret key for server-side verification.'),
  TURNSTILE_HOSTNAME: z
    .string()
    .max(253)
    .regex(/^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/)
    .describe('Hostname a valid Turnstile token must report.'),
  CONTACT_RATE_LIMITER: z
    .custom<RateLimitBinding>(
      (value) =>
        typeof value === 'object' &&
        value !== null &&
        'limit' in value &&
        typeof value.limit === 'function',
    )
    .describe('Cloudflare rate-limit binding declared in wrangler.jsonc.'),
});
