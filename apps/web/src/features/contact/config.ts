/** Public contact policy only; addresses and provider secrets belong to runtime bindings. */
export const CONTACT_POLICY = {
  mailSubject: 'New contact message',
  nameMaxLength: 100,
  emailMaxLength: 254,
  messageMaxLength: 5_000,
  tokenMaxLength: 2_048,
  minFillTimeMs: 3_000,
  providerTimeoutMs: 5_000,
  providerResponseMaxBytes: 8_192,
  rateLimit: { limit: 3, period: 60 },
} as const;
