type Flags = { readonly blog: boolean; readonly subscribe: boolean };

/** The subscription announces the notes, so it needs the blog as well as its own flag. */
export function isSubscribeActive(features: Flags): boolean {
  return features.blog && features.subscribe;
}

/** The form also needs a Turnstile site key: without one nobody could pass the check anyway. */
export function isSubscribeFormShown(features: Flags, siteKey: string | undefined): boolean {
  return isSubscribeActive(features) && (siteKey?.trim() ?? '') !== '';
}
