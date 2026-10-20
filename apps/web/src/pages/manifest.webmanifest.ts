import type { APIRoute } from 'astro';

import { site } from '@/shared/config/index.ts';
import { LOCALES } from '@/shared/i18n/index.ts';
import { pickLocale } from '@/shared/lib/localized.ts';

/** `/manifest.webmanifest`: installability metadata, with the name and description read from the site config. */
export const GET: APIRoute = () => {
  const manifest = {
    name: site.title,
    short_name: site.title.split('.')[0] || site.title,
    description: pickLocale(site.identity.bio, LOCALES.defaultLocale, LOCALES.defaultLocale),
    lang: LOCALES.defaultLocale,
    dir: 'ltr',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: '#07070f',
    theme_color: '#07070f',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
    ],
  };
  return new Response(`${JSON.stringify(manifest, null, 2)}\n`, {
    headers: { 'Content-Type': 'application/manifest+json; charset=utf-8' },
  });
};
