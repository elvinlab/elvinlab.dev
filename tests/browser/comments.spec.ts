import { expect, type Page, test } from '@playwright/test';

// Only the giscus origin is stubbed. The client script builds a frame like the real one and the
// frame records the theme the page posts to it, so theme sync is observable end to end.
const CLIENT_STUB = `
  const script = document.currentScript;
  const frame = document.createElement('iframe');
  frame.className = 'giscus-frame';
  frame.title = 'Comments';
  frame.src = 'https://giscus.app/widget';
  script.insertAdjacentElement('afterend', frame);
  window.__giscus = { ...script.dataset };
`;
const WIDGET_STUB = `<!doctype html><body><script>
  window.addEventListener('message', (event) => {
    const theme = event.data && event.data.giscus && event.data.giscus.setConfig && event.data.giscus.setConfig.theme;
    if (theme) document.body.dataset.theme = theme;
  });
</script></body>`;

const NOTES = [
  { locale: 'es', path: '/notes/smoke-es/' },
  { locale: 'en', path: '/en/notes/smoke-en/' },
] as const;

const giscusRequests = (page: Page): string[] => {
  const urls: string[] = [];
  page.on('request', (request) => {
    if (new URL(request.url()).origin === 'https://giscus.app') urls.push(request.url());
  });
  return urls;
};

test.beforeEach(async ({ page }) => {
  await page.route('https://giscus.app/client.js', (route) =>
    route.fulfill({ contentType: 'application/javascript', body: CLIENT_STUB }),
  );
  await page.route('https://giscus.app/widget', (route) =>
    route.fulfill({ contentType: 'text/html', body: WIDGET_STUB }),
  );
});

for (const { locale, path } of NOTES) {
  test.describe(`${locale} note comments`, () => {
    test('stays idle until the section nears the viewport, then loads giscus', async ({ page }) => {
      // A short viewport keeps the section well below the lazy-load margin on load.
      await page.setViewportSize({ width: page.viewportSize()?.width ?? 1280, height: 300 });
      const requests = giscusRequests(page);
      await page.goto(path);

      const section = page.locator('[data-comments]');
      await expect(section).toHaveAttribute('data-state', 'idle');
      await page.waitForTimeout(500);
      expect(requests).toEqual([]);

      await section.scrollIntoViewIfNeeded();
      await expect(section).toHaveAttribute('data-state', 'loaded');
      await expect(page.locator('iframe.giscus-frame')).toHaveCount(1);
      expect(requests.filter((url) => url.endsWith('/client.js'))).toHaveLength(1);
    });

    test('passes the page locale, theme and repo to giscus', async ({ page }) => {
      await page.goto(path);
      await page.locator('[data-comments]').scrollIntoViewIfNeeded();
      await expect(page.locator('iframe.giscus-frame')).toHaveCount(1);

      const siteTheme = await page.locator('html').getAttribute('data-theme');
      const attrs = await page.evaluate(
        () => (window as unknown as { __giscus: Record<string, string> }).__giscus,
      );
      expect(attrs['lang']).toBe(locale);
      expect(attrs['theme']).toBe(/light/i.test(siteTheme ?? '') ? 'light' : 'dark');
      expect(attrs['repo']).toBe('fixture/fixture');
      expect(attrs['mapping']).toBe('pathname');
    });

    test('follows the site theme toggle', async ({ page }) => {
      await page.goto(path);
      await page.locator('[data-comments]').scrollIntoViewIfNeeded();
      const frame = page.frameLocator('iframe.giscus-frame');
      await expect(page.locator('iframe.giscus-frame')).toHaveCount(1);

      for (let i = 0; i < 2; i++) {
        await page.locator('[data-theme-toggle]').first().click();
        const siteTheme = await page.locator('html').getAttribute('data-theme');
        const expected = /light/i.test(siteTheme ?? '') ? 'light' : 'dark';
        await expect(frame.locator('body')).toHaveAttribute('data-theme', expected);
      }
    });

    test('tells readers, in one small line, that their login is not used for anything else and links the privacy section', async ({
      page,
    }) => {
      await page.goto(path);
      const note = page.locator('[data-comments] [data-privacy-note]');
      await expect(note).toBeVisible();
      await expect(note).toContainText(
        locale === 'es' ? 'no se usan para nada más' : 'not used for anything else',
      );
      const link = note.getByRole('link');
      await expect(link).toHaveAttribute(
        'href',
        locale === 'es' ? '/privacy/#comments' : '/en/privacy/#comments',
      );
      // Small on purpose: reassurance, not a notice.
      const size = await note.evaluate((el) => Number.parseFloat(getComputedStyle(el).fontSize));
      expect(size).toBeLessThanOrEqual(14);
    });

    test('labels the section and keeps the heading', async ({ page }) => {
      await page.goto(path);
      const section = page.locator('[data-comments]');
      await expect(section).toHaveAttribute('aria-label', /.+/);
      await expect(section.getByRole('heading', { level: 2 })).toBeVisible();
    });
  });
}

for (const { path, title } of [
  { path: '/privacy/', title: 'Comentarios (giscus)' },
  { path: '/en/privacy/', title: 'Comments (giscus)' },
]) {
  test(`${path} discloses giscus when comments are configured`, async ({ page }) => {
    await page.goto(path);
    const heading = page.getByRole('heading', { name: title });
    await expect(heading).toBeVisible();
    await expect(
      page.locator('a[href="https://github.com/fixture/fixture/discussions"]'),
    ).toHaveCount(1);
  });
}
