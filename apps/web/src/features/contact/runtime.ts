import { z } from 'zod';

import { createResendSender } from './adapters/resend.ts';
import { createTurnstileVerifier } from './adapters/turnstile.ts';
import { CONTACT_POLICY } from './config.ts';
import { type ContactResult, submitContact } from './contact.ts';

interface RateLimitBinding {
  limit(options: { key: string }): Promise<unknown>;
}
const addressSchema = z
  .string()
  .max(CONTACT_POLICY.emailMaxLength)
  .regex(/^[^\r\n]*$/)
  .pipe(z.email());
const secretSchema = z.string().min(1).max(4_096).regex(/^\S+$/);
const bindingsSchema = z.object({
  RESEND_API_KEY: secretSchema,
  CONTACT_FROM: addressSchema,
  CONTACT_TO: addressSchema,
  TURNSTILE_SECRET_KEY: secretSchema,
  TURNSTILE_HOSTNAME: z
    .string()
    .max(253)
    .regex(/^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/),
  CONTACT_RATE_LIMITER: z.custom<RateLimitBinding>(
    (value) =>
      typeof value === 'object' &&
      value !== null &&
      'limit' in value &&
      typeof value.limit === 'function',
  ),
});
const allowedSchema = z.object({ success: z.literal(true) });

/** Reads private bindings per request; null means unavailable, never partial provider configuration. */
export async function submitConfiguredContact(
  input: unknown,
  ip: string | undefined,
  bindings: unknown,
  request: typeof fetch = fetch,
  log: (message: string) => void = console.error,
): Promise<ContactResult | null> {
  const parsed = bindingsSchema.safeParse(bindings);
  if (!parsed.success) {
    // Names only: a rejected value may be a secret, so it never reaches the log.
    const names = new Set(parsed.error.issues.map((issue) => String(issue.path[0] ?? 'bindings')));
    log(`contact unavailable, bindings rejected: ${[...names].join(', ')}`);
    return null;
  }
  const config = parsed.data;
  return submitContact(input, ip, {
    now: Date.now,
    limiter: {
      async allow(ip) {
        const result = await config.CONTACT_RATE_LIMITER.limit({ key: `contact:${ip}` });
        return allowedSchema.safeParse(result).success;
      },
    },
    verifier: createTurnstileVerifier(
      {
        secretKey: config.TURNSTILE_SECRET_KEY,
        hostname: config.TURNSTILE_HOSTNAME,
        action: CONTACT_POLICY.turnstileAction,
      },
      request,
    ),
    mailSender: createResendSender(
      {
        apiKey: config.RESEND_API_KEY,
        from: config.CONTACT_FROM,
        to: config.CONTACT_TO,
      },
      request,
    ),
  });
}
