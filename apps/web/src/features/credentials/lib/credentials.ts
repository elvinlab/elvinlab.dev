/** Minimal shape the credential helpers need; content entries and fixtures both satisfy it. */
type CredentialLike = { data: { year: number; month?: number | undefined } };

/** Credentials grouped by year (newest year first); within a year, newest month first. */
export function groupCredentialsByYear<T extends CredentialLike>(
  credentials: readonly T[],
): { year: number; items: T[] }[] {
  const groups = new Map<number, T[]>();
  for (const credential of credentials) {
    const bucket = groups.get(credential.data.year);
    if (bucket) bucket.push(credential);
    else groups.set(credential.data.year, [credential]);
  }
  return [...groups.entries()]
    .sort(([a], [b]) => b - a)
    .map(([year, items]) => ({
      year,
      items: [...items].sort((a, b) => (b.data.month ?? 0) - (a.data.month ?? 0)),
    }));
}
