import type { Locale } from '@/shared/i18n/index.ts';

/** Minimal view of the site config the JSON-LD builders read. */
type SiteLike = {
  url: string;
  title: string;
  identity: { name: string; role: Record<string, string>; bio: Record<string, string> };
  socials: readonly { url: string }[];
};

const personId = (site: SiteLike): string => `${site.url}/#person`;

/** schema.org Person for the site owner (stable @id so other nodes can reference it). */
export function personJsonLd(site: SiteLike, locale: Locale): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'Person',
    '@id': personId(site),
    name: site.identity.name,
    url: site.url,
    jobTitle: site.identity.role[locale],
    description: site.identity.bio[locale],
    sameAs: site.socials.map((social) => social.url),
  };
}

/** schema.org WebSite node. */
export function websiteJsonLd(site: SiteLike): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${site.url}/#website`,
    url: site.url,
    name: site.title,
    publisher: { '@id': personId(site) },
  };
}

export type BlogPostingInput = {
  site: SiteLike;
  locale: Locale;
  url: string;
  title: string;
  description: string;
  pubDate: Date;
  updatedDate?: Date | undefined;
  /** Absolute URL of the note's share card. */
  image?: string | undefined;
};

/** schema.org BlogPosting for a note, authored by the owner Person. */
export function blogPostingJsonLd(input: BlogPostingInput): Record<string, unknown> {
  const { site, url, title, description, pubDate, updatedDate, image } = input;
  return {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: title,
    description,
    datePublished: pubDate.toISOString(),
    ...(updatedDate ? { dateModified: updatedDate.toISOString() } : {}),
    ...(image ? { image } : {}),
    mainEntityOfPage: url,
    url,
    author: { '@type': 'Person', '@id': personId(site), name: site.identity.name, url: site.url },
  };
}

/** Serializes a JSON-LD object for a <script> tag, escaping `<` so it can't break out or inject. */
export function jsonLdScript(data: unknown): string {
  return JSON.stringify(data).replaceAll('<', '\\u003c').replaceAll('>', '\\u003e');
}
