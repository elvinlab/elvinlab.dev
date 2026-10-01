export const DEFAULT_OG_IMAGE = '/og-image.png';

const OG_LOCALES: Record<string, string> = { es: 'es_ES', en: 'en_US' };

/** Open Graph wants `language_TERRITORY` (`es_ES`); unknown or already qualified values pass through. */
export function ogLocale(locale: string): string {
  return OG_LOCALES[locale] ?? locale;
}

/** Site path of the share card generated for a note at build time. */
export function noteCardPath(slug: string): string {
  return `/og/notes/${slug}.png`;
}

/** Site path of the `/me` share card for a locale, generated at build time. */
export function profileCardPath(locale: string): string {
  return `/og/me-${locale}.png`;
}

export type ArticleInput = {
  pubDate: Date;
  updatedDate?: Date | undefined;
  tags?: readonly string[] | undefined;
};

/** The `article:*` Open Graph properties for a note, in emission order. */
export function articleMetaTags(article: ArticleInput): { property: string; content: string }[] {
  return [
    { property: 'article:published_time', content: article.pubDate.toISOString() },
    ...(article.updatedDate
      ? [{ property: 'article:modified_time', content: article.updatedDate.toISOString() }]
      : []),
    ...(article.tags ?? []).map((tag) => ({ property: 'article:tag', content: tag })),
  ];
}
