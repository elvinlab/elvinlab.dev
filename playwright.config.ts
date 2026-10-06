import { defineConfig } from '@playwright/test';

// `pnpm verify` runs one invocation: E2E_WIDE_SPECS (comma separated) limits the 360 and 768 px
// projects to the width dependent specs, so the others run at 1280 px only. Unset (CI,
// `pnpm test:e2e`): every project runs every spec.
const wideSpecs = process.env['E2E_WIDE_SPECS']?.split(',').filter(Boolean);

export default defineConfig({
  testDir: './tests/browser',
  fullyParallel: true,
  forbidOnly: Boolean(process.env['CI']),
  retries: 0,
  workers: '100%',
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: 'http://127.0.0.1:4322',
    trace: 'retain-on-failure',
    // Deterministic rendering: disable the entry animations (fade-in-up) so checks never race a
    // mid-animation opacity, and match the reduced-motion contract (the shader stays off too).
    reducedMotion: 'reduce',
  },
  projects: [360, 768, 1280].map((width) => ({
    name: `chromium-${width}`,
    use: { browserName: 'chromium', viewport: { width, height: 900 } },
    ...(wideSpecs && width !== 1280
      ? { testMatch: wideSpecs.map((spec) => `**/${spec.split('/').pop()}`) }
      : {}),
  })),
  webServer: {
    command: 'node apps/web/scripts/fixture-preview.ts 4322',
    stdout: 'pipe',
    url: 'http://127.0.0.1:4322/notes/smoke-es/',
    reuseExistingServer: false,
    timeout: 120_000,
    gracefulShutdown: { signal: 'SIGTERM', timeout: 10_000 },
  },
});
