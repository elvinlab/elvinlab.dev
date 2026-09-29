import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/browser',
  fullyParallel: true,
  forbidOnly: Boolean(process.env['CI']),
  retries: 0,
  workers: 2,
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
