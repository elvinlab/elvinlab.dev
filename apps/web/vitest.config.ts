import { defineConfig } from 'vitest/config';

// Plain Vite, not Astro's getViteConfig: unit tests need no adapter or workerd runtime.
// tsconfigPaths resolves the `@/` alias from tsconfig.json, the single place it is defined.
export default defineConfig({
  resolve: { tsconfigPaths: true },
  plugins: [
    {
      // Feature barrels re-export Astro components for the pages. Unit tests never render them,
      // so an empty module lets a test import the barrel without an Astro compiler.
      name: 'stub-astro-components',
      enforce: 'pre',
      load(id) {
        if (id.split('?', 1)[0]?.endsWith('.astro')) return 'export default {};';
        return undefined;
      },
    },
  ],
});
