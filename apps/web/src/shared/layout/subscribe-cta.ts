import { isSubscribeFormShown } from '@/shared/subscribe/availability.ts';

type Input = {
  features: { readonly blog: boolean; readonly subscribe: boolean };
  turnstileSiteKey: string | undefined;
  /** Route path without locale prefix. */
  path: string;
  /** The recruiter page prints as a CV and never carries a call to action. */
  printable: boolean;
};

/**
 * Whether the footer shows the subscription form band. The form lives only there, so it is shown on
 * every page except the subscription pages themselves (confirm and unsubscribe), the contact page
 * (which already has a form of its own) and the printable CV, and only when the blog, the flag and
 * a Turnstile key are all present.
 */
export function showSubscribeCta({ features, turnstileSiteKey, path, printable }: Input): boolean {
  if (printable || path.startsWith('/subscribe/') || path === '/contact/') return false;
  return isSubscribeFormShown(features, turnstileSiteKey);
}

/**
 * Whether the footer links to the subscription page: wherever the subscription is reachable, so a
 * reader can always find the shareable page. Only the printable CV never carries it.
 */
export function showSubscribeLink({
  features,
  turnstileSiteKey,
  printable,
}: Pick<Input, 'features' | 'turnstileSiteKey' | 'printable'> & { path?: string }): boolean {
  return !printable && isSubscribeFormShown(features, turnstileSiteKey);
}
