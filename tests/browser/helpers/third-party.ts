import type { Page } from '@playwright/test';

/**
 * Keeps third-party widgets out of accessibility scans: their iframes are not ours to fix, and
 * whether one has loaded by the time axe runs depends on network speed, which made scans flaky
 * (giscus' own dark theme was reported as a `color-contrast` violation inside its iframe).
 */
export async function stubThirdParties(page: Page): Promise<void> {
  await page.route('https://giscus.app/**', (route) =>
    route.fulfill({ contentType: 'text/html', body: '<!doctype html><body></body>' }),
  );
  await page.route('https://challenges.cloudflare.com/**', (route) =>
    route.fulfill({ contentType: 'application/javascript', body: '' }),
  );
}
