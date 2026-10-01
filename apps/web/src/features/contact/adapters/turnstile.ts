import { z } from 'zod';

import { CONTACT_POLICY } from '@/features/contact/config.ts';
import type { ContactReport, ContactVerifier } from '@/features/contact/ports.ts';

import { readProviderJson } from './response.ts';

export type TurnstileConfig = { secretKey: string; hostname: string; action: string };
const verificationSchema = z.object({
  success: z.boolean(),
  hostname: z.string().optional(),
  action: z.string().optional(),
  'error-codes': z
    .array(z.string().regex(/^[a-z0-9-]{1,64}$/))
    .max(10)
    .optional(),
});

/** Verifies every token against the configured deployment identity; all failures deny delivery. */
export function createTurnstileVerifier(
  config: TurnstileConfig,
  request: typeof fetch = fetch,
  report: ContactReport = () => {},
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
        if (!response.ok) {
          await response.body?.cancel();
          report(`turnstile http ${response.status}`);
          return false;
        }
        const result = verificationSchema.safeParse(await readProviderJson(response, signal));
        if (!result.success) {
          report('turnstile unexpected response');
          return false;
        }
        const { data } = result;
        if (!data.success) {
          // Error codes are fixed provider identifiers (e.g. invalid-input-secret), not user data.
          report(`turnstile rejected: ${(data['error-codes'] ?? []).join(',') || 'no code'}`);
          return false;
        }
        if (data.hostname !== config.hostname) {
          report('turnstile hostname mismatch');
          return false;
        }
        if (data.action !== config.action) {
          report('turnstile action mismatch');
          return false;
        }
        return true;
      } catch {
        report('turnstile request failed');
        return false;
      }
    },
  };
}
