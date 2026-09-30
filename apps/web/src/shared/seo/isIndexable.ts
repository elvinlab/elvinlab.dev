/** Returns true only when SITE_INDEXABLE is exactly the string "true". */
export function isIndexable(env: Record<string, string | undefined>): boolean {
  return env['SITE_INDEXABLE'] === 'true';
}
