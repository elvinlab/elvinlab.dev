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
 * every page except the subscription pages themselves (confirm and unsubscribe) and the printable
 * CV, and only when the blog, the flag and a Turnstile key are all present.
 */
export function showSubscribeCta({ features, turnstileSiteKey, path, printable }: Input): boolean {
  if (printable || path.startsWith('/subscribe/')) return false;
  return isSubscribeFormShown(features, turnstileSiteKey);
}
