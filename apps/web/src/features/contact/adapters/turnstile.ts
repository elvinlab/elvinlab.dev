import { z } from 'zod';

import { CONTACT_POLICY } from '@/features/contact/config.ts';
import type { ContactVerifier } from '@/features/contact/ports.ts';

import { readProviderJson } from './response.ts';

export type TurnstileConfig = { secretKey: string; hostname: string; action: string };
const verificationSchema = z.object({
  success: z.literal(true),
  hostname: z.string(),
  action: z.string(),
});

/** Verifies every token against the configured deployment identity; all failures deny delivery. */
export function createTurnstileVerifier(
  config: TurnstileConfig,
  request: typeof fetch = fetch,
): ContactVerifier {
  return {
    async verify(token, ip) {
      try {
        const signal = AbortSignal.timeout(CONTACT_POLICY.providerTimeoutMs);
        const response = await request(
          'https://challenges.cloudflare.com/turnstile/v0/siteverify',
          {
            method: 'POST',
            redirect: 'error',
            headers: { 'Content-Type': 'application/json' },
            signal,
            body: JSON.stringify({ secret: config.secretKey, response: token, remoteip: ip }),
          },
        );
        const result = verificationSchema.safeParse(await readProviderJson(response, signal));
        return (
          result.success &&
          result.data.hostname === config.hostname &&
          result.data.action === config.action
        );
      } catch {
        return false;
      }
    },
  };
}
