import { z } from 'zod';

import { createTurnstileVerifier } from '@/shared/lib/turnstile.ts';

import { createResendSender } from './adapters/resend.ts';
import { bindingsSchema } from './bindings.ts';
import { CONTACT_POLICY } from './config.ts';
import { type ContactResult, submitContact } from './contact.ts';

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
  const report = (detail: string) => log(`contact rejected: ${detail}`);
  return submitContact(input, ip, {
    now: Date.now,
    report,
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
      report,
    ),
    mailSender: createResendSender(
      {
        apiKey: config.RESEND_API_KEY,
        from: config.CONTACT_FROM,
        to: config.CONTACT_TO,
      },
      request,
      report,
    ),
  });
}
