import { PROVIDER_RESPONSE_MAX_BYTES, PROVIDER_TIMEOUT_MS } from '@/shared/lib/provider-json.ts';

const HOUR_MS = 60 * 60 * 1_000;
const MINUTE_MS = 60 * 1_000;

/** Public subscription policy only; addresses and provider secrets belong to runtime bindings. */
export const SUBSCRIBE_POLICY = {
  emailMaxLength: 254,
  tokenMaxLength: 2_048,
  minFillTimeMs: 3_000,
  providerTimeoutMs: PROVIDER_TIMEOUT_MS,
  providerResponseMaxBytes: PROVIDER_RESPONSE_MAX_BYTES,
  requestMaxBytes: 8_192,
  turnstileAction: 'subscribe',
  /** A confirmation link stops working after this long. */
  confirmExpiryMs: 48 * HOUR_MS,
  /** A second subscribe of a pending address re-sends the link only after this long. */
  resendCooldownMs: 10 * MINUTE_MS,
  /** Pending rows older than this are deleted on the next subscription. */
  pendingPurgeMs: 7 * 24 * HOUR_MS,
  /** Emails per provider call (Resend batch limit). */
  batchSize: 100,
  /** Notes sent per run: the free Resend plan allows 100 emails a day. */
  dailyCap: 100,
} as const;

/** Where the confirmation and unsubscribe pages live (relative to the locale root). */
export const SUBSCRIBE_PATHS = {
  confirm: '/subscribe/confirm/',
  unsubscribe: '/subscribe/unsubscribe/',
} as const;
