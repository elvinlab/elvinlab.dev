type Flags = { readonly blog: boolean; readonly subscribe: boolean };

/**
 * Whether the subscription is switched on (blog and flag). `astro.config.ts` loads this before the
 * `@/` alias exists, so it stays here and self-contained; the footer reads its own copy of the rule
 * in `shared/subscribe/availability.ts`.
 */
export function isSubscribeActive(features: Flags): boolean {
  return features.blog && features.subscribe;
}
