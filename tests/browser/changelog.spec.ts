import { expect, test } from '@playwright/test';

/**
 * The changelog: release days (production days) grouped by kind in a fixed order, the two newest
 * days open on page 1, and a crawlable pager to the later pages. The content is plain HTML, so the
 * checks run with JavaScript off.
 */
const LOCALES = [
  {
    base: '/changelog/',
    prefix: '',
    labels: ['Novedades', 'Cambios', 'Correcciones', 'Eliminado', 'Seguridad', 'Obsoleto'],
    pager: 'Paginación del changelog',
    lang: 'es',
  },
  {
    base: '/en/changelog/',
    prefix: '/en',
    labels: ['New', 'Changes', 'Fixes', 'Removed', 'Security', 'Deprecated'],
    pager: 'Changelog pagination',
    lang: 'en',
  },
] as const;

test.use({ javaScriptEnabled: false });
test.beforeEach(({ browserName: _browserName }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium-1280', 'content does not depend on the width');
});

for (const { base, prefix, labels, pager, lang } of LOCALES) {
  test(`${base} groups releases by day and kind, with the two newest open`, async ({ page }) => {
    await page.goto(base);
    await expect(page.locator('html')).toHaveAttribute('lang', lang);
    await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);

    const releases = page.locator('details.cl-release');
    expect(await releases.count()).toBeGreaterThan(2);
    // Newest first: the day of each block is later than the next block's.
    const days = await releases
      .locator('time')
      .evaluateAll((nodes) => nodes.map((node) => node.getAttribute('datetime') ?? ''));
    expect(days).toEqual([...days].sort().reverse());
    // The first two start open, the rest collapsed (the content stays in the HTML).
    const open = await releases.evaluateAll((nodes) =>
      nodes.map((node) => node.hasAttribute('open')),
    );
    expect(open.map((value, index) => value === index < 2)).not.toContain(false);
    await expect(releases.first().locator('h2')).toBeVisible();

    // Kind groups follow the fixed order inside every release.
    for (const group of await releases.all()) {
      const headings = await group.locator('h3').allTextContents();
      const order = headings.map((text) => (labels as readonly string[]).indexOf(text.trim()));
      expect(order).not.toContain(-1);
      expect(order).toEqual([...order].sort((a, b) => a - b));
    }
  });

  test(`${base} links to page 2 and page 2 is its own indexable page`, async ({ page }) => {
    await page.goto(base);
    const nav = page.getByRole('navigation', { name: pager });
    await expect(nav.locator('[aria-current="page"]')).toHaveText('1');
    const next = nav.locator('a[rel="next"]');
    await expect(next).toHaveAttribute('href', `${prefix}/changelog/page/2/`);

    await next.click();
    await expect(page).toHaveURL(new RegExp(`${prefix}/changelog/page/2/$`));
    await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      'href',
      new RegExp(`${prefix}/changelog/page/2/$`),
    );
    await expect(page.locator('link[rel="prev"]')).toHaveAttribute('href', new RegExp(`${base}$`));
    await expect(page.locator('meta[name="robots"][content*="noindex"]')).toHaveCount(0);
    expect(await page.locator('details.cl-release[open]').count()).toBe(0);
    const twin = lang === 'es' ? '/en/changelog/page/2/' : '/changelog/page/2/';
    await expect(page.locator('link[rel="alternate"][hreflang]').first()).toBeAttached();
    expect(
      await page
        .locator('link[rel="alternate"]')
        .evaluateAll((nodes) => nodes.map((node) => node.getAttribute('href') ?? '')),
    ).toContainEqual(expect.stringMatching(new RegExp(`${twin}$`)));
  });
}

test('/changelog/page/1/ does not exist', async ({ request }) => {
  expect((await request.get('/changelog/page/1/')).status()).toBe(404);
});
