/** The part of the subscription policy the footer form needs in the browser; the server policy reads it from here. */
export const SUBSCRIBE_CLIENT_POLICY = {
  emailMaxLength: 254,
  turnstileAction: 'subscribe',
} as const;
