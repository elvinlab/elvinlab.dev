export const GISCUS_ORIGIN = 'https://giscus.app';
export const GISCUS_CLIENT_SRC = `${GISCUS_ORIGIN}/client.js`;

export type GiscusConfig = {
  repo: string;
  repoId: string;
  category: string;
  categoryId: string;
};

export type GiscusTheme = 'light' | 'dark';

/** Giscus ships built-in `light` and `dark` themes; any non-light site theme maps to dark. */
export function giscusThemeFor(siteTheme: string | null): GiscusTheme {
  return siteTheme !== null && /light/i.test(siteTheme) ? 'light' : 'dark';
}

/** The `data-*` attributes giscus' client script reads from its own `<script>` tag. */
export function buildGiscusAttributes(
  config: GiscusConfig,
  locale: string,
  theme: GiscusTheme,
): Record<string, string> {
  return {
    'data-repo': config.repo,
    'data-repo-id': config.repoId,
    'data-category': config.category,
    'data-category-id': config.categoryId,
    'data-mapping': 'pathname',
    'data-strict': '1',
    'data-reactions-enabled': '1',
    'data-emit-metadata': '0',
    'data-input-position': 'bottom',
    'data-theme': theme,
    'data-lang': locale,
    'data-loading': 'lazy',
  };
}
