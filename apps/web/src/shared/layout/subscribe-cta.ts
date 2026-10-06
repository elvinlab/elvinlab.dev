type Input = {
  features: { readonly blog: boolean; readonly subscribe: boolean };
  turnstileSiteKey: string | undefined;
  /** Route path without locale prefix. */
  path: string;
  /** The recruiter page prints as a CV and never carries a call to action. */
  printable: boolean;
};

/**
 * Whether the footer shows the "get the notes by email" band. It only links to the form on `/notes/`
 * (no script, no Turnstile on other pages), so it is shown wherever the form is reachable and the
 * page is not the one that already holds the form, a subscription page, or the printable CV.
 */
export function showSubscribeCta({ features, turnstileSiteKey, path, printable }: Input): boolean {
  if (printable || !features.blog || !features.subscribe) return false;
  if ((turnstileSiteKey?.trim() ?? '') === '') return false;
  return path !== '/notes/' && !path.startsWith('/subscribe/');
}
