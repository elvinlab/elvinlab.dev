import { getCollection } from 'astro:content';
import { localizePath } from '@elvinlab/core';
import type { APIRoute } from 'astro';

import { sortNotes } from '@/features/notes/index.ts';
import { loadExperiments } from '@/features/portfolio/index.ts';
import { buildEnv, type Feature, isEnabled, site } from '@/shared/config/index.ts';
import type { SeoPage } from '@/shared/config/schema.ts';
import { LOCALES, type Locale } from '@/shared/i18n/index.ts';
import { pickLocale } from '@/shared/lib/localized.ts';
import { buildLlmsTxt, type LlmsLink } from '@/shared/seo/llms.ts';
import { pageSeo } from '@/shared/seo/page-seo.ts';

const PAGES: readonly { page: SeoPage; path: string; feature?: Feature }[] = [
  { page: 'me', path: '/me/' },
  { page: 'notes', path: '/notes/', feature: 'blog' },
  { page: 'experiments', path: '/experiments/', feature: 'experiments' },
  { page: 'education', path: '/education/', feature: 'education' },
  { page: 'contact', path: '/contact/', feature: 'contact' },
  { page: 'changelog', path: '/changelog/', feature: 'changelog' },
];

const SECTION: Record<Locale, { pages: string; notes: string; experiments: string }> = {
  es: { pages: 'Páginas', notes: 'Lab Notes', experiments: 'Experimentos' },
  en: { pages: 'Pages', notes: 'Lab Notes', experiments: 'Experiments' },
};

const abs = (path: string): string => new URL(path, site.url).href;
const localized = (path: string, locale: Locale): string =>
  abs(localizePath(path, locale, LOCALES));

/** `/llms.txt`: a Markdown map of the site for language models, all of it read from the site config and content. */
export const GET: APIRoute = async () => {
  const locale = LOCALES.defaultLocale as Locale;
  const labels = SECTION[locale];
  const { identity, seo } = site;

  const pages: LlmsLink[] = PAGES.filter(({ feature }) => !feature || isEnabled(feature)).map(
    ({ page, path }) => {
      const copy = pageSeo(page, locale);
      return { title: copy.title, url: localized(path, locale), description: copy.description };
    },
  );

  const notes: LlmsLink[] = isEnabled('blog')
    ? sortNotes(
        (await getCollection('notes')).map((entry) => ({ slug: entry.id, data: entry.data })),
      ).map(({ slug, data }) => ({
        title: data.title,
        url: localized(`/notes/${slug}/`, data.lang),
        description: data.description,
      }))
    : [];

  const experiments: LlmsLink[] = isEnabled('experiments')
    ? (await loadExperiments()).map((experiment) => ({
        title: experiment.title,
        url: localized(`/experiments/${experiment.id}/`, locale),
        description: pickLocale(experiment.description, locale, LOCALES.defaultLocale),
      }))
    : [];

  const facts = [
    ...(identity.location ? [`Location: ${identity.location}`] : []),
    ...(seo.knowsAbout.length > 0 ? [`Topics: ${seo.knowsAbout.join(', ')}`] : []),
    `Languages: ${LOCALES.locales.join(', ')}`,
  ];

  const body = buildLlmsTxt({
    name: identity.name,
    summary:
      pickLocale(seo.llmsSummary, locale, LOCALES.defaultLocale) ||
      pickLocale(identity.bio, locale, LOCALES.defaultLocale) ||
      site.description[locale] ||
      site.title,
    facts,
    sections: [
      { heading: labels.pages, links: pages },
      { heading: labels.notes, links: notes },
      { heading: labels.experiments, links: experiments },
    ],
  });

  // A noindex build (staging, previews) must not advertise itself to models.
  return new Response(buildEnv.siteIndexable ? body : '', {
    headers: { 'content-type': 'text/plain; charset=utf-8' },
  });
};
