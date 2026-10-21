export const DEFAULT_OG_IMAGE = '/og-image.png';

const OG_LOCALES: Record<string, string> = { es: 'es_ES', en: 'en_US' };

/** Open Graph wants `language_TERRITORY` (`es_ES`); unknown or already qualified values pass through. */
export function ogLocale(locale: string): string {
  return OG_LOCALES[locale] ?? locale;
}

/** FNV-1a over the text, as 8 hex digits: a short, stable version key, not a security hash. */
function versionKey(text: string): string {
  let hash = 0x811c9dc5;
  for (const char of text) {
    hash ^= char.codePointAt(0) ?? 0;
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, '0');
}

/**
 * Site path of the share card generated for a note at build time. Pass what the card draws (number
 * and title): it becomes a `?v=` key, so an edited title gets a new image URL and link previews
 * (WhatsApp, LinkedIn, X) that cache images by URL stop showing the old card.
 */
export function noteCardPath(slug: string, card?: { number: number; title: string }): string {
  const path = `/og/notes/${slug}.png`;
  return card ? `${path}?v=${versionKey(`${card.number}\n${card.title}`)}` : path;
}

/** Site path of the share card of a listing or legal page, generated at build time for each locale. */
export function pageCardPath(page: string, locale: string): string {
  return `/og/pages/${page}-${locale}.png`;
}

/** Site path of the share card of a notes topic page. */
export function topicCardPath(slug: string): string {
  return `/og/topics/${slug}.png`;
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
