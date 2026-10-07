/**
 * Astro build config: integrations (MDX, Preact islands, sitemap, Expressive Code, share cards,
 * noindex headers), the Cloudflare adapter and Vite. Site settings do NOT live here but in
 * src/site.config.ts; environment variables are registered in src/shared/config/env-vars.ts.
 * Guide: docs/CONFIGURATION.md.
 */
import { fileURLToPath } from 'node:url';

import cloudflare from '@astrojs/cloudflare';
import mdx from '@astrojs/mdx';
import preact from '@astrojs/preact';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'astro/config';
import expressiveCode from 'astro-expressive-code';

import { CONTACT_POLICY } from './src/features/contact/config.ts';
import { isSubscribeActive } from './src/features/subscribe/availability.ts';
import { blogRoutesIntegration } from './src/integrations/blog-routes.ts';
import { changelogRoutesIntegration } from './src/integrations/changelog-routes.ts';
import { contactRoutesIntegration } from './src/integrations/contact-routes.ts';
import { externalLinks } from './src/integrations/external-links.ts';
import { noindexHeaders } from './src/integrations/noindex-headers.ts';
import { readNoteDatesFromDisk } from './src/integrations/note-dates.ts';
import { ogImages } from './src/integrations/og-images.ts';
import { projectsRoutesIntegration } from './src/integrations/projects-routes.ts';
import { hasPublishedNotesOnDisk } from './src/integrations/published-notes.ts';
import { isHiddenFromSitemap } from './src/integrations/sitemap-filter.ts';
import { subscribeRoutesIntegration } from './src/integrations/subscribe-routes.ts';
import { site } from './src/shared/config/index.ts';
import { LOCALES, t } from './src/shared/i18n/index.ts';

const contentDir = fileURLToPath(new URL('./src/content', import.meta.url));
// /notes/ stays out of the sitemap until the first note is published.
const hasNotes = hasPublishedNotesOnDisk(contentDir);
// sitemap `lastmod`: real per-note dates where known, one shared build timestamp otherwise.
// `astro:content`/`getCollection` is not available at config time, so this reads frontmatter
// straight off disk (same constraint as `hasPublishedNotesOnDisk`).
const noteDates = readNoteDatesFromDisk(contentDir);
const buildTime = new Date();

export default defineConfig({
  site: site.url,
  // Inline every page's CSS instead of a separate stylesheet request: the site's CSS is small
  // enough (well under the JS budget) that one extra render-blocking request costs more than the
  // duplication of inlining it per page (Lighthouse's "render-blocking requests" audit).
  build: { inlineStylesheets: 'always' },
  // Hover/focus (keyboard) intent prefetches the target page after 80 ms: navigation then feels
  // instant without spending mobile data on links nobody shows interest in. Not `viewport` or
  // `load`: those prefetch pages eagerly. Astro skips hover prefetch on `saveData`/2g connections
  // and falls back to prefetching on tap there.
  prefetch: { prefetchAll: true, defaultStrategy: 'hover' },
  security: { checkOrigin: true, actionBodySizeLimit: CONTACT_POLICY.requestMaxBytes },
  i18n: {
    defaultLocale: site.locales.default,
    locales: site.locales.supported,
    routing: { prefixDefaultLocale: false },
  },
  // Expressive Code renders fenced code blocks (frame, filename, copy button, line numbers);
  // it must come before MDX so MDX uses its code component.
  integrations: [
    expressiveCode({
      themes: ['github-dark', 'github-light'],
      themeCssSelector: (theme) => `[data-theme="elvinlab-${theme.type}"]`,
      styleOverrides: {
        borderRadius: 'var(--radius-control)',
        codeFontFamily: 'var(--font-mono)',
        uiFontFamily: 'var(--font-mono)',
        frames: { shadowColor: 'transparent' },
      },
    }),
    // Links in notes that leave the site open in a new tab, announced in the note's language.
    externalLinks({
      siteUrl: site.url,
      hint: (lang) =>
        t(
          LOCALES.locales.find((locale) => locale === lang) ?? LOCALES.defaultLocale,
          'link.newTab',
        ),
    }),
    // Notes pages and RSS feed exist only when `features.blog` is on.
    blogRoutesIntegration(site.features.blog),
    // Confirmation and unsubscribe pages: only with the blog and the flag on.
    subscribeRoutesIntegration(isSubscribeActive(site.features)),
    // The contact page exists only with `features.contact`; the changelog page only with `features.changelog`.
    contactRoutesIntegration(site.features.contact),
    changelogRoutesIntegration(site.features.changelog),
    projectsRoutesIntegration(site.features.experiments),
    mdx(),
    preact(),
    sitemap({
      i18n: { defaultLocale: site.locales.default, locales: { es: 'es', en: 'en' } },
      filter: (page) =>
        (hasNotes || new URL(page).pathname !== '/notes/') &&
        !isHiddenFromSitemap(new URL(page).pathname, site.features),
      serialize: (item) => ({
        ...item,
        lastmod: (noteDates.get(new URL(item.url).pathname) ?? buildTime).toISOString(),
      }),
    }),
    noindexHeaders(),
    ogImages(contentDir, { assetsDir: fileURLToPath(new URL('./src/assets', import.meta.url)) }),
  ],
  adapter: cloudflare({
    // Pages are prerendered, so images are optimized at build time with Sharp and served as
    // static files; the Workers runtime never transforms images (no Cloudflare Images billing).
    imageService: 'compile',
  }),
  vite: {
    plugins: [tailwindcss()],
    // Dev server only. Vite finds these lazily, on the first page that uses a Preact island (the
    // contact form), and answers with "optimized dependencies changed. reloading" plus a program
    // reload: that first visit came back as a blank page. Listing them up front avoids it;
    // `pnpm check:dev-cold-start` proves it. Add a dependency here if that check ever fails.
    optimizeDeps: {
      include: [
        'preact',
        'preact/hooks',
        'preact/devtools',
        'preact/jsx-runtime',
        'astro/actions/runtime/entrypoints/client.js',
      ],
    },
    // Vite only exposes PUBLIC_/VITE_ variables to import.meta.env, so the indexing switch is
    // inlined explicitly. Unset or anything other than "true" means the build is noindex.
    define: {
      'import.meta.env.SITE_INDEXABLE': JSON.stringify(process.env['SITE_INDEXABLE'] ?? ''),
    },
  },
});
