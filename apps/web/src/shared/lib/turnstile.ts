import { z } from 'zod';

import { PROVIDER_TIMEOUT_MS, readProviderJson } from './provider-json.ts';

/** Diagnostic sink: codes and names only, never user data, secrets or tokens. */
export type ProviderReport = (detail: string) => void;

/** Decides whether an anti-bot token is valid for a client address. */
export interface TokenVerifier {
  verify(token: string, ip: string): Promise<boolean>;
}

export type TurnstileConfig = { secretKey: string; hostname: string; action: string };
const verificationSchema = z.object({
  success: z.boolean(),
  hostname: z.string().optional(),
  action: z.string().optional(),
  metadata: z.object({ result_with_testing_key: z.boolean().optional() }).optional(),
  'error-codes': z
    .array(z.string().regex(/^[a-z0-9-]{1,64}$/))
    .max(10)
    .optional(),
});

/** Error type and message only: network errors never carry the request body or the secret. */
const describeError = (error: unknown): string =>
  error instanceof Error ? `${error.name}: ${error.message}`.slice(0, 160) : 'non-error';

/** Verifies every token against the configured deployment identity; all failures deny delivery. */
export function createTurnstileVerifier(
  config: TurnstileConfig,
  request: typeof fetch = fetch,
  report: ProviderReport = () => {},
): TokenVerifier {
  return {
    async verify(token, ip) {
      try {
        const signal = AbortSignal.timeout(PROVIDER_TIMEOUT_MS);
        const response = await request(
          'https://challenges.cloudflare.com/turnstile/v0/siteverify',
          {
            method: 'POST',
            redirect: 'manual', // Workers has no 'error'; a 3xx is not ok, so it is rejected below
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
        // Cloudflare's testing secrets omit `action`; they already accept any token by design.
        const testingKey = data.metadata?.result_with_testing_key === true;
        if (!testingKey && data.action !== config.action) {
          report('turnstile action mismatch');
          return false;
        }
        return true;
      } catch (error) {
        report(`turnstile request failed: ${describeError(error)}`);
        return false;
      }
    },
  };
}
