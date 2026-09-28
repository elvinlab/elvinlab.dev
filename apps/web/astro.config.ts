import cloudflare from '@astrojs/cloudflare';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'astro/config';
import { site } from './src/shared/config/index.ts';

export default defineConfig({
  site: site.url,
  i18n: {
    defaultLocale: site.locales.default,
    locales: site.locales.supported,
    routing: { prefixDefaultLocale: false },
  },
  adapter: cloudflare({
    // Pages are prerendered, so images are optimized at build time with Sharp and served as
    // static files; the Workers runtime never transforms images (no Cloudflare Images billing).
    imageService: 'compile',
  }),
  vite: {
    plugins: [tailwindcss()],
  },
});
