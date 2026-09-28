import cloudflare from '@astrojs/cloudflare';
import mdx from '@astrojs/mdx';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'astro/config';
import expressiveCode from 'astro-expressive-code';

import { site } from './src/shared/config/index.ts';

export default defineConfig({
  site: site.url,
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
