import { expect, type Page, test } from '@playwright/test';

/**
 * Calm pages (M3). The fixture build copies the real `site.config.ts` (`FIXTURE_APPEARANCE`
 * overrides the preset of the copy) and every preset-driven check reads `html[data-appearance]`:
 * `minimal` must show the calm banners, the compact decision record and the reduced note meta, and
 * `full` the original look. Values come from `src/styles/calm-layout.css` and `docs/DESIGN.md`.
 */
type Preset = 'minimal' | 'full';

const presetOf = async (page: Page): Promise<Preset> => {
  const value = await page.evaluate(() => document.documentElement.dataset['appearance']);
  if (value !== 'minimal' && value !== 'full') throw new Error(`unknown appearance: ${value}`);
  return value;
};

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
/** `minimal` caps every page banner at 240 px (`--banner-page-cap`). */
const PAGE_BANNER_CAP = 240;
/**
 * `full` keeps the height each page asks for: notes index 320 px, note 360 px, `/me`
 * `clamp(420px, 52vh, 520px)`, which is 468 px at the 900 px viewport height of every project.
 */
const FULL_PAGE_BANNERS: Record<string, number> = {
  '/notes/': 320,
  '/notes/smoke-es/': 360,
  '/me/': 468,
};
/**
 * Expanded home banner by preset, then project. `minimal`: clamp(360px, 48vh, 460px) at 900 px is
 * 432 px on desktop, 24rem on a phone. `full`: clamp(520px, 66vh, 620px) is 594 px on desktop,
 * 28rem on a phone.
 */
const HOME_BANNER: Record<Preset, { desktop: number; phone: number }> = {
  minimal: { desktop: 432, phone: 384 },
  full: { desktop: 594, phone: 448 },
};
/** Lines the pixel hero wraps to on desktop: `minimal` widens the measure to 22ch (two lines). */
const HERO_LINES: Record<Preset, number> = { minimal: 2, full: 3 };
/**
 * Decision record, in px: `--record-*` of `calm-layout.css`. `phoneGap` is the stacked row gap.
 */
const RECORD: Record<
  Preset,
  { title: number; label: number; body: number; padding: number; phoneGap: number }
> = {
  minimal: { title: 13, label: 13, body: 14, padding: 16, phoneGap: 14 },
  full: { title: 14, label: 13, body: 14, padding: 20, phoneGap: 20 },
};

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

test('the banners follow the height caps of the preset', async ({ page }, testInfo) => {
  await page.goto('/');
  const preset = await presetOf(page);
  const expected = HOME_BANNER[preset];
  const home = (await page.locator('[data-banner]').boundingBox())?.height ?? 0;
  expect(home).toBe(testInfo.project.name === 'chromium-1280' ? expected.desktop : expected.phone);
  for (const path of ['/notes/', '/notes/smoke-es/', '/me/']) {
    await page.goto(path);
    const minHeight = await page
      .locator('[data-banner]')
      .evaluate((element) => Number.parseFloat(getComputedStyle(element).minHeight));
    if (preset === 'minimal') expect(minHeight, path).toBeLessThanOrEqual(PAGE_BANNER_CAP);
    else expect(minHeight, path).toBe(FULL_PAGE_BANNERS[path]);
  }
});

test('the home hero wraps to the lines of its preset on desktop', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium-1280', 'desktop measure');
  await page.goto('/');
  const preset = await presetOf(page);
  const lines = await page.locator('[data-home-hero] h1').evaluate((element) => {
    const lineHeight = Number.parseFloat(getComputedStyle(element).lineHeight);
    return Math.round(element.getBoundingClientRect().height / lineHeight);
  });
  expect(lines).toBe(HERO_LINES[preset]);
});

test('the decision record follows the preset spacing and keeps every label', async ({
  page,
}, testInfo) => {
  await page.goto('/notes/smoke-es/');
  const expected = RECORD[await presetOf(page)];
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
  expect(sizes).toMatchObject({
    title: expected.title,
    label: expected.label,
    body: expected.body,
    padding: expected.padding,
    blocks: 3,
  });
  if (testInfo.project.name === 'chromium-360') {
    // On a phone the three blocks stay stacked (`minimal` spaces them 14 px, `full` 20 px).
    expect(sizes.columns).toBe(1);
    expect(sizes.gap).toBe(expected.phoneGap);
  } else {
    expect(sizes.columns).toBe(3);
  }
  await expect(record.locator('h2')).toHaveCount(1);
  // Sentence case, never ALL-CAPS: the title and the three field labels keep their authored case.
  const labels = record.locator('div > div > span');
  await expect(labels).toHaveCount(3);
  const transforms = await record
    .locator('h2, div > div > span')
    .evaluateAll((nodes) => nodes.map((node) => getComputedStyle(node).textTransform));
  expect(transforms).toEqual(['none', 'none', 'none', 'none']);
  expect(await labels.allTextContents()).toEqual(
    (await labels.allTextContents()).map((text) => text.charAt(0).toUpperCase() + text.slice(1)),
  );
  // Before the article text, as always.
  const order = await page.evaluate(() => {
    const section = document.querySelector('article section[aria-label]');
    const prose = document.querySelector('article .prose');
    if (!section || !prose) return 0;
    return section.compareDocumentPosition(prose) & Node.DOCUMENT_POSITION_FOLLOWING;
  });
  expect(order).toBeGreaterThan(0);
});

test('the note header keeps date and reading time, and the preset places badge, author and tags', async ({
  page,
}) => {
  await page.goto('/notes/smoke-es/');
  const preset = await presetOf(page);
  const header = page.locator('[data-banner]');
  await expect(header.locator('time')).toHaveCount(1);
  await expect(header).toContainText(/\d+ min/);
  const meta = header.locator('[data-banner-inner] p').last();
  const foot = page.locator('article > div').last();
  const badge = /^es$/i;
  if (preset === 'minimal') {
    // The calm header keeps the date and the reading time; badge and tags live in the foot.
    await expect(header.locator('.bg-chip')).toHaveCount(0);
    await expect(meta).not.toContainText('Elvin');
    await expect(foot.locator('.bg-chip', { hasText: badge })).toHaveCount(1);
    expect(await foot.locator('.bg-chip').count()).toBeGreaterThan(1);
  } else {
    // `full` keeps the original header: badge and author up top, only the tags in the foot.
    await expect(header.locator('.bg-chip', { hasText: badge })).toHaveCount(1);
    await expect(meta).toContainText('Elvin');
    await expect(foot.locator('.bg-chip', { hasText: badge })).toHaveCount(0);
    expect(await foot.locator('.bg-chip').count()).toBeGreaterThan(0);
  }
  // Rendered once: the badge exists nowhere else on the page.
  await expect(page.locator('main .bg-chip', { hasText: badge })).toHaveCount(1);
});

test('no page overflows horizontally', async ({ page }) => {
  for (const path of PAGES) {
    await page.goto(path);
    expect(await noOverflow(page), path).toBe(true);
  }
});
