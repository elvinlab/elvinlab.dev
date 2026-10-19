import type { Locale } from '@/shared/i18n/index.ts';

/** Minimal view of the site config the JSON-LD builders read. */
type SiteLike = {
  url: string;
  title: string;
  identity: { name: string; role: Record<string, string>; bio: Record<string, string> };
  socials: readonly { url: string }[];
  /** `seo` block of the site config: facts that tell the owner apart from people with the same name. */
  seo?: { country?: string | undefined; knowsAbout: readonly string[]; sameAs: readonly string[] };
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
    sameAs: [
      ...new Set([...site.socials.map((social) => social.url), ...(site.seo?.sameAs ?? [])]),
    ],
    ...(site.seo?.knowsAbout.length ? { knowsAbout: [...site.seo.knowsAbout] } : {}),
    ...(site.seo?.country
      ? { address: { '@type': 'PostalAddress', addressCountry: site.seo.country } }
      : {}),
  };
}

/** schema.org WebSite node. `description` is the localized site description (the page summary). */
export function websiteJsonLd(site: SiteLike, description: string): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${site.url}/#website`,
    url: site.url,
    name: site.title,
    alternateName: site.identity.name,
    description,
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

export type PageType = 'ProfilePage' | 'Blog' | 'CollectionPage' | 'ContactPage' | 'CreativeWork';

export type PageJsonLdInput = {
  site: SiteLike;
  locale: Locale;
  url: string;
  name: string;
  description: string;
  /** Topics of a `CreativeWork` (an experiment's stack). */
  keywords?: readonly string[] | undefined;
  /** Absolute URL of the page's share card. */
  image?: string | undefined;
};

/**
 * schema.org node for a page that is not a note: the profile on `/me`, the notes `Blog`, a listing
 * `CollectionPage`, the `ContactPage` or an experiment `CreativeWork`. Every node belongs to the
 * website, and the ones about the owner point at the Person by `@id`.
 */
export function pageJsonLd(type: PageType, input: PageJsonLdInput): Record<string, unknown> {
  const { site, locale, url, name, description, keywords, image } = input;
  const person = { '@id': personId(site) };
  return {
    '@context': 'https://schema.org',
    '@type': type,
    '@id': `${url}#${type.toLowerCase()}`,
    url,
    name,
    description,
    inLanguage: locale,
    isPartOf: { '@id': `${site.url}/#website` },
    ...(type === 'ProfilePage' ? { mainEntity: person } : {}),
    ...(type === 'Blog' || type === 'CreativeWork' ? { author: person } : {}),
    ...(keywords?.length ? { keywords: keywords.join(', ') } : {}),
    ...(image ? { image } : {}),
  };
}

/** schema.org BreadcrumbList for a page: `items` run from the home to the page itself. */
export function breadcrumbJsonLd(
  items: readonly { name: string; url: string }[],
): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

/** Serializes a JSON-LD object for a <script> tag, escaping `<` so it can't break out or inject. */
export function jsonLdScript(data: unknown): string {
  return JSON.stringify(data).replaceAll('<', '\\u003c').replaceAll('>', '\\u003e');
}
