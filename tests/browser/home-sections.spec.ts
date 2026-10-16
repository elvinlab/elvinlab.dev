import { expect, type Page, test } from '@playwright/test';

import { has } from './helpers/features';
import { nowIn, site, text } from './helpers/site';

/**
 * The fixture build copies the real `site.config.ts` (`FIXTURE_APPEARANCE` overrides the preset of
 * the copy). Under `minimal` the home drops the hero pills and the pillars; under `full` it shows
 * them. Both presets keep the author card, the recruiter card, the Now card and the notebook
 * index. A section that is off must leave no heading or wrapper behind. The expectations follow
 * `html[data-appearance]`, mirroring `HOME_PRESETS` in `shared/config/appearance.ts`.
 */
type Preset = 'minimal' | 'full';

/** Whether each preset-driven section is on (`HOME_PRESETS` in `shared/config/appearance.ts`). */
const PRESET_SECTIONS: Record<Preset, { heroPills: boolean; pillars: boolean }> = {
  minimal: { heroPills: false, pillars: false },
  // This site switches the hero pills and the pillars off through `home` in site.config.ts.
  full: { heroPills: false, pillars: false },
};

const presetOf = async (page: Page): Promise<Preset> => {
  const value = await page.evaluate(() => document.documentElement.dataset['appearance']);
  if (value !== 'minimal' && value !== 'full') throw new Error(`unknown appearance: ${value}`);
  return value;
};

/** `toHaveCount` target: one element when the section is on, none when it is off. */
const countFor = (on: boolean) => (on ? 1 : 0);

test.beforeEach(({ browserName: _browserName }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium-1280', 'section switches are viewport independent');
});

const HOMES = [
  {
    path: '/',
    now: 'Ahora',
    nowDate: nowIn('es').date,
    nowFocus: nowIn('es').focus,
    retired: 'Bitácora',
    pillars: text('es', 'home.pillars'),
    notebook: 'Cuaderno',
    hiring: text('es', 'recruiter.title'),
  },
  {
    path: '/en/',
    now: 'Now',
    nowDate: nowIn('en').date,
    nowFocus: nowIn('en').focus,
    retired: 'Lab log',
    pillars: text('en', 'home.pillars'),
    notebook: 'Notebook',
    hiring: 'Hiring?',
  },
];

for (const { path, now, nowDate, nowFocus, retired, pillars, notebook, hiring } of HOMES) {
  test.describe(`home sections at ${path}`, () => {
    test('shows or hides the hero pills and the pillars to match the preset, leaving nothing behind', async ({
      page,
    }) => {
      await page.goto(path);
      const on = PRESET_SECTIONS[await presetOf(page)];
      await expect(page.locator('[data-home-hero] h1')).toBeVisible();
      await expect(page.locator('[data-home-hero] ul')).toHaveCount(countFor(on.heroPills));
      await expect(page.getByText(text('es', 'home.pill.1'))).toHaveCount(countFor(on.heroPills));
      await expect(page.locator(`section[aria-label="${pillars}"]`)).toHaveCount(
        countFor(on.pillars),
      );
    });

    test('shows the Now card with its date and focus under every preset, and no retired lab log', async ({
      page,
    }) => {
      await page.goto(path);
      await expect(page.getByRole('heading', { name: now, exact: true })).toHaveCount(1);
      const card = page.locator('[data-now-card]');
      await expect(card).toBeVisible();
      await expect(card.getByText(nowDate)).toBeVisible();
      await expect(card.getByText(nowFocus)).toBeVisible();
      await expect(page.getByRole('heading', { name: retired })).toHaveCount(0);
    });

    test('keeps the author card, the recruiter card and the notebook index', async ({ page }) => {
      await page.goto(path);
      // Wide screens show the photo in the hero and the sidebar card drops it (see the avatar test).
      await expect(page.locator('aside').getByText(site.name)).toBeVisible();
      await expect(page.getByRole('heading', { name: hiring })).toBeVisible();
      if (has({ routes: ['notes'] })) {
        await expect(page.getByRole('heading', { name: notebook })).toBeVisible();
      }
    });

    test('shows the hiring status tags on a single line', async ({ page }) => {
      await page.goto(path);
      const tags = page.locator('[data-recruiter-status] li');
      await expect(tags.first()).toBeVisible();
      // A tag is about 26 px tall on one line and about 44 px once its text wraps.
      const heights = await tags.evaluateAll((els) =>
        els.map((el) => el.getBoundingClientRect().height),
      );
      for (const height of heights) expect(height).toBeLessThan(32);
    });

    test('renders no empty heading and no empty section', async ({ page }) => {
      await page.goto(path);
      const empty = await page.evaluate(() => [
        ...[...document.querySelectorAll('main h1, main h2, main h3')]
          .filter((heading) => !heading.textContent?.trim())
          .map((heading) => heading.outerHTML),
        ...[...document.querySelectorAll('main section, main aside')]
          .filter((region) => !region.textContent?.trim() && !region.querySelector('img, svg'))
          .map((region) => region.outerHTML.slice(0, 80)),
      ]);
      expect(empty).toEqual([]);
    });
  });
}

test.describe('home hero action and language cue', () => {
  test('shows a profile link in the hero on phones only', async ({ page }) => {
    test.skip(!has({ flags: ['me'] }), 'needs features.me');
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');
    const cta = page.locator('[data-home-hero] a[href="/me/"]');
    await expect(cta).toBeVisible();
    await page.setViewportSize({ width: 1280, height: 900 });
    await expect(cta).toBeHidden();
    await expect(page.locator('aside a[href="/me/"]')).toBeVisible();
  });

  test('shows the avatar in the hero from md up and in the author card on phones only', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto('/');
    const heroFigure = page.locator('[data-hero-content] figure');
    const heroAvatar = heroFigure.locator(`img[alt="${site.name}"]`);
    await expect(heroAvatar).toBeVisible();
    const h1Box = await page.locator('[data-home-hero] h1').boundingBox();
    const figureBox = await heroFigure.boundingBox();
    if (!h1Box || !figureBox) throw new Error('hero h1 and figure must be laid out');
    expect(figureBox.x).toBeGreaterThanOrEqual(h1Box.x + h1Box.width);
    await expect(heroFigure.locator('figcaption')).toContainText(site.name);
    await expect(page.locator(`aside img[alt="${site.name}"]`)).toBeHidden();

    await page.setViewportSize({ width: 360, height: 800 });
    await expect(heroFigure).toBeHidden();
    await expect(page.locator(`aside img[alt="${site.name}"]`)).toBeVisible();
  });

  for (const width of [1280, 1440]) {
    test(`centers the hero avatar on the author card column at ${width} px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto('/');
      const avatar = await page.locator('[data-hero-content] figure img').boundingBox();
      const card = await page.locator('aside section').first().boundingBox();
      if (!avatar || !card) throw new Error('hero avatar and author card must be laid out');
      const center = (box: { x: number; width: number }) => box.x + box.width / 2;
      expect(Math.abs(center(avatar) - center(card))).toBeLessThanOrEqual(1);
    });
  }

  test('moves the avatar from the hero to the author card while the banner is collapsed', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto('/');
    const heroAvatar = page.locator(`[data-hero-content] img[alt="${site.name}"]`);
    const cardAvatar = page.locator(`aside img[alt="${site.name}"]`);
    await expect(heroAvatar).toBeVisible();
    await expect(cardAvatar).toBeHidden();
    await page.locator('[data-banner-toggle]').click();
    await expect(heroAvatar).toBeHidden();
    await expect(cardAvatar).toBeVisible();
  });

  test('notes the language of the notes on /en/ and does not call Spanish notes foreign on /', async ({
    page,
  }) => {
    test.skip(!has({ routes: ['notes'] }), 'needs the notes routes');
    await page.goto('/en/');
    await expect(
      page.getByText(text('en', 'home.notebook.langNote', { language: 'Spanish' })),
    ).toBeVisible();
    await page.goto('/');
    await expect(
      page.getByText(text('es', 'home.notebook.langNote', { language: 'español' })),
    ).toHaveCount(0);
  });

  test('keeps the main column on the page background and only the decision record boxed', async ({
    page,
  }) => {
    test.skip(!has({ routes: ['notes'] }), 'needs the notes routes');
    await page.goto('/');
    const TRANSPARENT = 'rgba(0, 0, 0, 0)';
    const background = (selector: string) =>
      page
        .locator(selector)
        .first()
        .evaluate((el) => getComputedStyle(el).backgroundColor);
    const latest = 'section[data-card-link]';
    expect(await background(latest)).toBe(TRANSPARENT);
    expect(await background('main section:has(> div > h2 + a[href="/notes/"])')).toBe(TRANSPARENT);
    expect(await background(`${latest} section`)).not.toBe(TRANSPARENT);
    const link = page.locator(`${latest} h2 a`);
    const href = await link.getAttribute('href');
    await link.click();
    await expect(page).toHaveURL(new RegExp(`${href}$`));
  });
});

test.describe('home sidebar cards by width', () => {
  // The fixture build has no D1 binding, so the marks action answers 503 and the footprint card
  // REMOVES itself from the sidebar (`MarkSection.astro`, `status === 'hidden'`). Whether that
  // removal lands before or after the layout read below is a race with the action round trip, and
  // it changes how many cards the aside holds: that made these column assertions depend on which
  // specs shared the batch. Pin the answer so the card is always present and the composition is
  // deterministic, instead of tolerating either outcome.
  test.beforeEach(async ({ page }) => {
    await page.route(
      (url) => url.pathname.includes('/_actions/marks.get/'),
      (route) =>
        route.fulfill({
          status: 200,
          contentType: 'application/json+devalue',
          body: JSON.stringify([{ total: 1 }, 12]),
        }),
    );
  });
  // The sidebar only: the page also has the "Also in English" language hint, another `aside`
  // whose script may or may not have run yet, and its children would count as sidebar cards.
  const sidebar = (page: Page) =>
    page.getByRole('complementary', { name: text('es', 'aside.label') });
  // Belt and braces: even with the counter pinned, keep skipping a card that is detached or
  // `display: none`, because a detached node still reads `offsetLeft` 0 and would add a phantom column.
  const lefts = (page: Page) =>
    sidebar(page)
      .locator(':scope > div > *')
      .evaluateAll((cards) =>
        cards
          // Detached or `display: none` cards take no space (offsetLeft 0), so they are not a column.
          .filter((card) => card.isConnected && getComputedStyle(card).display !== 'none')
          .map((card) => ({
            card: `${card.tagName.toLowerCase()}.${String(card.className).split(/\s+/)[0]}`,
            left: (card as HTMLElement).offsetLeft,
            display: getComputedStyle(card).display,
            parent: (card as HTMLElement).offsetParent?.tagName.toLowerCase() ?? 'none',
          })),
      );
  /** The distinct left offsets, with the cards behind them so a failure names the odd one out. */
  const columns = async (page: Page) => {
    const cards = await lefts(page);
    return { count: new Set(cards.map((card) => card.left)).size, cards };
  };

  test('lays the cards out in columns on tablets (820 px)', async ({ page }) => {
    await page.setViewportSize({ width: 820, height: 1000 });
    await page.goto('/');
    const { count, cards } = await columns(page);
    expect(cards.length).toBeGreaterThanOrEqual(2);
    expect(count, JSON.stringify(cards)).toBeGreaterThanOrEqual(2);
  });

  test('stacks the cards in one column on phones (390 px)', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');
    const { count, cards } = await columns(page);
    expect(count, JSON.stringify(cards)).toBe(1);
  });

  test('keeps the sidebar beside the content with stacked cards at 1280 px', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto('/');
    const { count, cards } = await columns(page);
    expect(count, JSON.stringify(cards)).toBe(1);
    const main = await page.locator('[data-main-grid] > div').first().boundingBox();
    const aside = await sidebar(page).boundingBox();
    if (!main || !aside) throw new Error('main column and aside must be laid out');
    expect(aside.x).toBeGreaterThan(main.x + main.width - 1);
  });
});
