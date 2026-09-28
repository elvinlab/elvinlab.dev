/** A theme the visitor can switch to, with the color scheme it belongs to. */
export type ThemeOption = { name: string; scheme: 'dark' | 'light' };

export type ResolveThemeInput = {
  themes: ThemeOption[];
  defaultTheme: string;
  /** Theme saved by the visitor, if any. */
  stored: string | null;
  /** Whether the operating system prefers a dark color scheme. */
  prefersDark: boolean;
};

/**
 * Picks the theme to render: the visitor's stored choice when it still exists, otherwise a theme
 * matching the system color scheme (the default theme first), otherwise the default theme.
 *
 * Must stay self-contained (no imports, no outer references): its source is inlined into the
 * pre-paint script by `buildThemeBootScript`.
 */
export function resolveTheme(input: ResolveThemeInput): string {
  const names = input.themes.map((theme) => theme.name);
  if (input.stored !== null && names.indexOf(input.stored) !== -1) {
    return input.stored;
  }
  const scheme = input.prefersDark ? 'dark' : 'light';
  const matching = input.themes.filter((theme) => theme.scheme === scheme);
  for (const theme of matching) {
    if (theme.name === input.defaultTheme) {
      return theme.name;
    }
  }
  const first = matching[0];
  return first ? first.name : input.defaultTheme;
}
