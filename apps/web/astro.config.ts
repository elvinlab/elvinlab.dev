import { fileURLToPath } from 'node:url';

import cloudflare from '@astrojs/cloudflare';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'astro/config';
import expressiveCode from 'astro-expressive-code';

import { CONTACT_POLICY } from './src/features/contact/config.ts';
import { hasPublishedNotesOnDisk } from './src/integrations/published-notes.ts';
import { site } from './src/shared/config/index.ts';

// /notes/ stays out of the sitemap until the first note is published.
const hasNotes = hasPublishedNotesOnDisk(fileURLToPath(new URL('./src/content', import.meta.url)));

export default defineConfig({
  site: site.url,
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
    mdx(),
    sitemap({
      i18n: { defaultLocale: site.locales.default, locales: { es: 'es', en: 'en' } },
      filter: (page) => hasNotes || new URL(page).pathname !== '/notes/',
    }),
  ],
  adapter: cloudflare({
    // Pages are prerendered, so images are optimized at build time with Sharp and served as
    // static files; the Workers runtime never transforms images (no Cloudflare Images billing).
    imageService: 'compile',
  }),
  vite: {
    plugins: [tailwindcss()],
  },
});
