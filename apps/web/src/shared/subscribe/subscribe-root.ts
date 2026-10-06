import { integrations } from '@/shared/config/index.ts';
import { type Locale, t } from '@/shared/i18n/index.ts';
import { SUBSCRIBE_CLIENT_POLICY } from '@/shared/subscribe/client-policy.ts';

/**
 * The attributes of the element that holds a subscription form. `form-client.ts` reads the texts and
 * the Turnstile site key from them, so every surface that renders the form spreads the same set.
 */
export function subscribeRootAttributes(locale: Locale): Record<string, string | undefined> {
  return {
    'data-subscribe': '',
    'data-locale': locale,
    'data-site-key': integrations.turnstileSiteKey,
    'data-action': SUBSCRIBE_CLIENT_POLICY.turnstileAction,
    'data-sending': t(locale, 'subscribe.sending'),
    'data-verifying': t(locale, 'subscribe.verifying'),
    'data-success': t(locale, 'subscribe.success'),
    'data-error': t(locale, 'subscribe.error'),
    'data-capped': t(locale, 'subscribe.capped'),
    'data-rate-limited': t(locale, 'subscribe.rateLimited'),
    'data-interactive': t(locale, 'subscribe.interactive'),
    'data-timeout': t(locale, 'subscribe.timeout'),
    'data-code-label': t(locale, 'subscribe.codeLabel'),
  };
}
