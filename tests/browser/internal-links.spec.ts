import { expect, test } from '@playwright/test';

/**
 * Every internal link on the key pages must resolve. A link built for a locale that has no such
 * page (for example "All notes" pointing at `/en/notes/`, while the notes index only exists at
 * `/notes/`) is a 404 that no other check notices.
 */
const PAGES = ['/', '/en/', '/me/', '/en/me/', '/notes/', '/contact/', '/en/contact/'];

test.beforeEach(({ browserName: _browserName }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium-1280', 'links do not depend on the viewport width');
});

for (const path of PAGES) {
  test(`every internal link on ${path} resolves`, async ({ page, request }) => {
    await page.goto(path);
    const hrefs = await page.evaluate(() => [
      ...new Set(
        [...document.querySelectorAll('a[href]')]
          .map((anchor) => anchor.getAttribute('href') ?? '')
          .filter((href) => href.startsWith('/') && !href.startsWith('//'))
          .map((href) => href.split('#')[0] ?? '')
          .filter((href) => href !== ''),
      ),
    ]);
    expect(hrefs.length).toBeGreaterThan(0);

    const broken: string[] = [];
    for (const href of hrefs) {
      const response = await request.get(href);
      if (!response.ok()) broken.push(`${href} -> ${response.status()}`);
    }
    expect(broken).toEqual([]);
  });
}
