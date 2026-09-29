/** Public contact policy only; addresses and provider secrets belong to runtime bindings. */
export const CONTACT_POLICY = {
  nameMaxLength: 100,
  emailMaxLength: 254,
  messageMaxLength: 5_000,
  tokenMaxLength: 2_048,
  minFillTimeMs: 3_000,
  rateLimit: { limit: 3, period: 60 },
} as const;
