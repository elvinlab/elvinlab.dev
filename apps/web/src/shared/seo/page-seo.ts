import { site } from '@/shared/config/index.ts';
import type { SeoPage } from '@/shared/config/schema.ts';
import { LOCALES, type Locale } from '@/shared/i18n/index.ts';
import { type PageCopy, pageCopy } from '@/shared/seo/page-copy.ts';

/** The search and share copy of a page for a locale, from the site config (see `page-copy.ts`). */
export function pageSeo(page: SeoPage, locale: Locale, fallbackDescription?: string): PageCopy {
  return pageCopy({
    page,
    locale,
    defaultLocale: LOCALES.defaultLocale,
    name: site.identity.name,
    domain: new URL(site.url).host,
    overrides: site.seo.pages,
    fallbackDescription,
  });
}
