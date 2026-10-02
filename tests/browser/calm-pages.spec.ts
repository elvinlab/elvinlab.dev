import { expect, type Page, test } from '@playwright/test';

/**
 * Calm pages (M3). The repo config uses `appearance: 'minimal'`, so the fixture build must show
 * the calm banners, the compact decision record and the reduced note meta. The `full` values are
 * proven at unit level (`src/styles/calm-layout.test.ts`), since the fixture has one config.
 */
const PAGES = [
  '/',
  '/notes/',
  '/notes/smoke-es/',
  '/me/',
  '/contact/',
  '/privacy/',
  '/terms/',
  '/changelog/',
  '/en/',
  '/en/notes/smoke-en/',
  '/en/me/',
  '/en/contact/',
  '/en/privacy/',
  '/en/terms/',
  '/en/changelog/',
  '/nope/',
];
/** The pages that render a banner: the blend must be on every one of them. */
const BANNER_PAGES = [
  '/',
  '/notes/',
  '/notes/smoke-es/',
  '/me/',
  '/en/',
  '/en/notes/smoke-en/',
  '/en/me/',
];
const THEMES = ['elvinlab-dark', 'elvinlab-light'];
const FADE_HEIGHT = 120;
const PAGE_BANNER_CAP = 240;
const RECORD_PAD = 16;

test.beforeEach(({ browserName: _browserName }, testInfo) => {
  test.skip(testInfo.project.name === 'chromium-768', 'covered at 360 and 1280');
});

const withTheme = async (page: Page, theme: string, extra?: Record<string, string>) => {
  await page.addInitScript(
    ([stored, more]) => {
      localStorage.setItem('theme', stored as string);
      for (const [key, value] of Object.entries((more as Record<string, string>) ?? {})) {
        localStorage.setItem(key, value);
      }
    },
    [theme, extra ?? {}] as const,
  );
};

const noOverflow = (page: Page) =>
  page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);

for (const theme of THEMES) {
  test(`every banner blends into the page, ${theme}`, async ({ page }) => {
    await withTheme(page, theme);
    const withBanner: string[] = [];
    for (const path of PAGES) {
      await page.goto(path);
      if ((await page.locator('[data-banner]').count()) === 0) {
        await expect(page.locator('[data-banner-fade]'), path).toHaveCount(0);
        continue;
      }
      withBanner.push(path);
      const fade = page.locator('[data-banner] [data-banner-fade]');
      await expect(fade, path).toHaveCount(1);
      const measured = await page.evaluate(() => {
        const banner = document.querySelector<HTMLElement>('[data-banner]');
        const blend = document.querySelector<HTMLElement>('[data-banner-fade]');
        const inner = document.querySelector<HTMLElement>('[data-banner-inner]');
        if (!banner || !blend || !inner) throw new Error('banner parts missing');
        const box = blend.getBoundingClientRect();
        const bannerBox = banner.getBoundingClientRect();
        const style = getComputedStyle(blend);
        return {
          height: box.height,
          bottomGap: Math.abs(box.bottom - bannerBox.bottom),
          image: style.backgroundImage,
          pageColor: getComputedStyle(document.body).backgroundColor,
          hidden: style.display === 'none',
          // The text must sit above the blend, never under it.
          innerAbove: Number(getComputedStyle(inner).zIndex) > Number(style.zIndex),
        };
      });
      expect(measured.hidden, path).toBe(false);
      expect(measured.height, path).toBe(FADE_HEIGHT);
      expect(measured.bottomGap, path).toBeLessThan(1);
      // The gradient ends exactly on the page color, so there is no step at the banner edge.
      expect(measured.image, path).toContain('linear-gradient');
      expect(measured.image, path).toContain(measured.pageColor);
      expect(measured.innerAbove, path).toBe(true);
    }
    expect(withBanner).toEqual(BANNER_PAGES);
  });
}

test('the blend is in the served HTML, so the first paint needs no script', async ({ request }) => {
  for (const path of BANNER_PAGES) {
    const html = await (await request.get(path)).text();
    expect(html, path).toContain('data-banner-fade');
  }
});

test('reading mode and the collapsed home keep a clean edge', async ({ page }) => {
  await withTheme(page, 'elvinlab-dark', { 'reading-mode': '1' });
  await page.goto('/notes/smoke-es/');
  await expect(page.locator('[data-banner-fade]')).toBeHidden();
  // The compact header has no floor: the title alone sizes it.
  await expect(page.locator('[data-banner]')).toHaveCSS('min-height', '0px');

  const collapsed = await page.context().newPage();
  await withTheme(collapsed, 'elvinlab-dark', { 'banner-expanded': '0' });
  await collapsed.goto('/');
  await expect(collapsed.locator('[data-banner-fade]')).toBeVisible();
  const banner = await collapsed.locator('[data-banner]').boundingBox();
  const fade = await collapsed.locator('[data-banner-fade]').boundingBox();
  expect(
    Math.abs((banner?.y ?? 0) + (banner?.height ?? 0) - ((fade?.y ?? 0) + (fade?.height ?? 0))),
  ).toBeLessThan(1);
});

test('minimal lowers the banners', async ({ page }, testInfo) => {
  await page.goto('/');
  // clamp(360px, 48vh, 460px) at 900 px of viewport height on desktop; 24rem floor on a phone.
  const expected = testInfo.project.name === 'chromium-1280' ? 432 : 384;
  const home = (await page.locator('[data-banner]').boundingBox())?.height ?? 0;
  expect(home).toBe(expected);
  for (const path of ['/notes/', '/notes/smoke-es/', '/me/']) {
    await page.goto(path);
    const minHeight = await page
      .locator('[data-banner]')
      .evaluate((element) => Number.parseFloat(getComputedStyle(element).minHeight));
    expect(minHeight, path).toBeLessThanOrEqual(PAGE_BANNER_CAP);
  }
});

test('the home hero wraps to two lines on desktop', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium-1280', 'desktop measure');
  await page.goto('/');
  const lines = await page.locator('[data-home-hero] h1').evaluate((element) => {
    const lineHeight = Number.parseFloat(getComputedStyle(element).lineHeight);
    return Math.round(element.getBoundingClientRect().height / lineHeight);
  });
  expect(lines).toBe(2);
});

test('the decision record is compact and keeps every label', async ({ page }, testInfo) => {
  await page.goto('/notes/smoke-es/');
  const record = page.locator('article section[aria-label]').first();
  const sizes = await record.evaluate((element) => {
    const px = (selector: string, property: 'fontSize' | 'paddingTop') =>
      Number.parseFloat(getComputedStyle(element.querySelector(selector) ?? element)[property]);
    const grid = element.querySelector('div') as HTMLElement;
    const blocks = [...grid.children] as HTMLElement[];
    return {
      title: px('h2', 'fontSize'),
      label: px('span', 'fontSize'),
      body: px('p', 'fontSize'),
      padding: px(':scope', 'paddingTop'),
      columns: getComputedStyle(grid).gridTemplateColumns.split(' ').length,
      blocks: blocks.length,
      gap: Number.parseFloat(getComputedStyle(grid).rowGap),
    };
  });
  expect(sizes).toMatchObject({ title: 13, label: 13, body: 14, padding: RECORD_PAD, blocks: 3 });
  if (testInfo.project.name === 'chromium-360') {
    // On a phone the three blocks stay stacked, with less spacing than the 20 px of `full`.
    expect(sizes.columns).toBe(1);
    expect(sizes.gap).toBe(14);
  } else {
    expect(sizes.columns).toBe(3);
  }
  await expect(record.locator('h2')).toHaveCount(1);
  await expect(record.locator('span.uppercase')).toHaveCount(3);
  // Before the article text, as always.
  const order = await page.evaluate(() => {
    const section = document.querySelector('article section[aria-label]');
    const prose = document.querySelector('article .prose');
    if (!section || !prose) return 0;
    return section.compareDocumentPosition(prose) & Node.DOCUMENT_POSITION_FOLLOWING;
  });
  expect(order).toBeGreaterThan(0);
});

test('the note header keeps date and reading time, the foot gets badge and tags', async ({
  page,
}) => {
  await page.goto('/notes/smoke-es/');
  const header = page.locator('[data-banner]');
  await expect(header.locator('time')).toHaveCount(1);
  await expect(header).toContainText(/\d+ min/);
  await expect(header.locator('.bg-chip')).toHaveCount(0);
  await expect(header.locator('[data-banner-inner] p').last()).not.toContainText('Elvin');

  const foot = page.locator('article > div').last();
  await expect(foot.locator('.bg-chip', { hasText: /^es$/i })).toHaveCount(1);
  expect(await foot.locator('.bg-chip').count()).toBeGreaterThan(1);
  // Rendered once: the badge exists nowhere else on the page.
  await expect(page.locator('main .bg-chip', { hasText: /^es$/i })).toHaveCount(1);
});

test('no page overflows horizontally', async ({ page }) => {
  for (const path of PAGES) {
    await page.goto(path);
    expect(await noOverflow(page), path).toBe(true);
  }
});
