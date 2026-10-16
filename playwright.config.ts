import { defineConfig, type ReporterDescription } from '@playwright/test';

import {
  E2E_PROFILE_ENV,
  resolveE2eProfile,
  serializeE2eProfile,
} from './apps/web/scripts/e2e-features.ts';
import { E2E_FEATURE_PROFILE_ENV, withProfileFeatures } from './apps/web/scripts/e2e-profiles.ts';
import { siteConfig } from './apps/web/src/site.config.ts';

// The specs must not assume which features this site has on: they follow the config. It is resolved
// once here, with the same overrides the fixture build applies, and the workers inherit it through
// the environment (see tests/browser/helpers/features.ts).
process.env[E2E_PROFILE_ENV] = serializeE2eProfile(
  resolveE2eProfile(withProfileFeatures(siteConfig, process.env[E2E_FEATURE_PROFILE_ENV]), {
    appearance: process.env['FIXTURE_APPEARANCE'],
  }),
);

const reporters: ReporterDescription[] = [
  ['list'],
  ['html', { open: 'never' }],
  // In CI the JSON report is what the workflow reads to list the flaky tests in the run summary
  // (`node apps/web/scripts/list-flaky.ts`). Locally it would only cost a file write for nothing.
  ...(process.env['CI']
    ? ([['json', { outputFile: 'playwright-report/results.json' }]] as ReporterDescription[])
    : []),
];

// `pnpm verify` runs one invocation: E2E_WIDE_SPECS (comma separated) limits the 360 and 768 px
// projects to the width dependent specs, so the others run at 1280 px only. Unset (CI,
// `pnpm test:e2e`): every project runs every spec.
const wideSpecs = process.env['E2E_WIDE_SPECS']?.split(',').filter(Boolean);

export default defineConfig({
  testDir: './tests/browser',
  fullyParallel: true,
  forbidOnly: Boolean(process.env['CI']),
  // CI retries a test once: a noisy gate must not block a release, and a test that passes on the
  // retry is reported as flaky, never hidden (ADR 0018). Locally retries stay off.
  retries: process.env['CI'] ? 1 : 0,
  workers: '100%',
  reporter: reporters,
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
    // `/` exists in every profile; `/notes/smoke-es/` vanishes when `features.blog` is off.
    url: 'http://127.0.0.1:4322/',
    reuseExistingServer: false,
    timeout: 120_000,
    gracefulShutdown: { signal: 'SIGTERM', timeout: 10_000 },
  },
});
