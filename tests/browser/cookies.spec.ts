import { expect, test } from '@playwright/test';

// The privacy page says this site's own code sets no cookies. This test is what keeps that true:
// every third-party origin is stubbed, so any cookie that shows up comes from the site itself.
const PAGES = [
  '/',
  '/en/',
  '/me/',
  '/notes/',
  '/notes/smoke-es/',
  '/en/notes/smoke-en/',
  '/contact/',
  '/privacy/',
  '/terms/',
  '/changelog/',
  '/smoke-missing-page/',
];

test('the site sets no cookies of its own on any page', async ({ browser }) => {
  const context = await browser.newContext({ reducedMotion: 'no-preference' });
  await context.route('https://giscus.app/**', (route) =>
    route.fulfill({ contentType: 'text/html', body: '<!doctype html><body></body>' }),
  );
  await context.route('https://challenges.cloudflare.com/**', (route) =>
    route.fulfill({ contentType: 'application/javascript', body: '' }),
  );
  const page = await context.newPage();
  for (const path of PAGES) {
    const response = await page.goto(path);
    expect(response?.headers()['set-cookie'], `Set-Cookie header on ${path}`).toBeUndefined();
    // Open the lazy parts too: comments load on scroll, the contact form on first focus.
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(150);
    expect(await page.evaluate(() => document.cookie), `document.cookie on ${path}`).toBe('');
  }
  expect(await context.cookies()).toEqual([]);
  await context.close();
});
