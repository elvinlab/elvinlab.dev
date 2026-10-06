import { PROVIDER_RESPONSE_MAX_BYTES, PROVIDER_TIMEOUT_MS } from '@/shared/lib/provider-json.ts';

/** Public contact policy only; addresses and provider secrets belong to runtime bindings. */
export const CONTACT_POLICY = {
  mailSubject: 'New contact message',
  nameMaxLength: 100,
  emailMaxLength: 254,
  messageMaxLength: 5_000,
  tokenMaxLength: 2_048,
  minFillTimeMs: 3_000,
  providerTimeoutMs: PROVIDER_TIMEOUT_MS,
  providerResponseMaxBytes: PROVIDER_RESPONSE_MAX_BYTES,
  requestMaxBytes: 32_768,
  turnstileAction: 'contact',
} as const;
