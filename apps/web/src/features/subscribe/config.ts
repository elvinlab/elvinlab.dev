import { PROVIDER_RESPONSE_MAX_BYTES, PROVIDER_TIMEOUT_MS } from '@/shared/lib/provider-json.ts';
import { SUBSCRIBE_CLIENT_POLICY } from '@/shared/subscribe/client-policy.ts';

/** Resend free plan: emails per day in total, shared by confirmation and note emails. */
const PROVIDER_DAILY_TOTAL = 100;
const HOUR_MS = 60 * 60 * 1_000;
const MINUTE_MS = 60 * 1_000;

/** Public subscription policy only; addresses and provider secrets belong to runtime bindings. */
export const SUBSCRIBE_POLICY = {
  emailMaxLength: SUBSCRIBE_CLIENT_POLICY.emailMaxLength,
  tokenMaxLength: 2_048,
  minFillTimeMs: 3_000,
  providerTimeoutMs: PROVIDER_TIMEOUT_MS,
  providerResponseMaxBytes: PROVIDER_RESPONSE_MAX_BYTES,
  requestMaxBytes: 8_192,
  /** The owner trigger takes `{ slug, dryRun }` only. */
  notifyRequestMaxBytes: 1_024,
  turnstileAction: SUBSCRIBE_CLIENT_POLICY.turnstileAction,
  /** A confirmation link stops working after this long. */
  confirmExpiryMs: 48 * HOUR_MS,
  /** A second subscribe of a pending address re-sends the link only after this long. */
  resendCooldownMs: 10 * MINUTE_MS,
  /** Pending rows older than this are deleted on the next subscription. */
  pendingPurgeMs: 7 * 24 * HOUR_MS,
  /** Emails per provider call (Resend batch limit). */
  batchSize: 100,
  /** The provider pool per UTC day (Resend free plan), shared by confirmations and notes. */
  providerDailyTotal: PROVIDER_DAILY_TOTAL,
  /** Global cap of confirmation emails per UTC day, so an attack cannot burn the whole pool. */
  confirmationsDailyCap: 30,
  /** Notes sent per run: never more than the provider pool (confirmations use part of it, see sendNote). */
  dailyCap: PROVIDER_DAILY_TOTAL,
} as const;

/** Where the confirmation and unsubscribe pages live (relative to the locale root). */
export const SUBSCRIBE_PATHS = {
  confirm: '/subscribe/confirm/',
  unsubscribe: '/subscribe/unsubscribe/',
  privacy: '/privacy/',
} as const;
