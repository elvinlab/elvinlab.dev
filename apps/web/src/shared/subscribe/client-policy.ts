/** The part of the subscription policy the footer form needs in the browser; the server policy reads it from here. */
export const SUBSCRIBE_CLIENT_POLICY = {
  emailMaxLength: 254,
  turnstileAction: 'subscribe',
  /** People paste an address and press Enter, so the server only rejects a form filled faster than this. */
  minFillTimeMs: 1_500,
} as const;

/** How long a pressed button waits for a Turnstile token before telling the reader to try again. */
export const VERIFY_TIMEOUT_MS = 25_000;

/**
 * The fixed Action message of the per-minute rate limiter. The client tells it apart from the daily
 * cap by this text only; the Action throws it and the form compares against it.
 */
export const SUBSCRIBE_RATE_LIMITED_MESSAGE =
  'Too many attempts in a row. Please wait a minute and try again.';
