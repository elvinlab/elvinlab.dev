import { defineConfig } from 'vitest/config';

// Plain Vite, not Astro's getViteConfig: unit tests need no adapter or workerd runtime.
// tsconfigPaths resolves the `@/` alias from tsconfig.json, the single place it is defined.
export default defineConfig({
  resolve: { tsconfigPaths: true },
});
