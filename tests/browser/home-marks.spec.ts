import { expect, type Page, test } from '@playwright/test';

import { describeViolations, scan } from './helpers/axe';
import { stubThirdParties } from './helpers/third-party';

/**
 * The footprint card of the home page. Like marks.spec.ts, the fixture build has no D1 binding, so
 * the Actions are mocked with `page.route`, answering the way Astro does.
 */
const HOMES = [
  {
    path: '/',
    button: 'Dejé mi huella',
    many: (n: number) => `${n} huellas`,
    tip: 'Anónimo: no guardamos tu IP ni datos tuyos.',
    privacy: '/privacy/#marks',
  },
  {
    path: '/en/',
    button: 'I was here',
    many: (n: number) => `${n} marks`,
    tip: 'Anonymous: your IP and personal data are not stored.',
    privacy: '/en/privacy/#marks',
  },
] as const;

const card = (page: Page) => page.locator('[data-marks-card]');
const instance = (page: Page) => card(page).locator('[data-marks]');
const button = (page: Page) => card(page).locator('.mb');

type MockOptions = { total?: number; getStatus?: number; leaveTotal?: number };

async function mockMarks(page: Page, options: MockOptions = {}) {
  const gets: { slug: string }[] = [];
  const leaves: { slug: string; by: number }[] = [];
  const status = options.getStatus ?? 200;
  await page.route(
    (url) => url.pathname.includes('/_actions/marks.get/'),
    async (route) => {
      gets.push(route.request().postDataJSON());
      if (status !== 200) {
        await route.fulfill({
          status,
          contentType: 'application/json',
          body: JSON.stringify({ type: 'AstroActionError', code: 'SERVICE_UNAVAILABLE' }),
        });
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json+devalue',
        body: JSON.stringify([{ total: 1 }, options.total ?? 12]),
      });
    },
  );
  await page.route(
    (url) => url.pathname.includes('/_actions/marks.leave/'),
    async (route) => {
      leaves.push(route.request().postDataJSON());
      await route.fulfill({
        status: 200,
        contentType: 'application/json+devalue',
        body: JSON.stringify([{ total: 1 }, options.leaveTotal ?? 100]),
      });
    },
  );
  return { gets, leaves };
}

test.beforeEach(async ({ page }) => {
  await stubThirdParties(page);
});

for (const home of HOMES) {
  test.describe(home.path, () => {
    test('shows the card with the count and no horizontal overflow', async ({ page }) => {
      await mockMarks(page, { total: 12 });
      await page.goto(home.path);
      await expect(button(page)).toBeVisible();
      await expect(instance(page).locator('.mn')).toHaveText(home.many(12));
      await expect(button(page)).toHaveAccessibleName(`${home.button}, ${home.many(12)}`);
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow).toBeLessThanOrEqual(0);
      const box = await card(page).boundingBox();
      const width = page.viewportSize()?.width ?? 0;
      expect((box?.x ?? 0) + (box?.width ?? 0)).toBeLessThanOrEqual(width);
    });

    test('a tap increments and sends the home slug, not a note slug', async ({ page }) => {
      const { gets, leaves } = await mockMarks(page, { total: 12, leaveTotal: 13 });
      await page.goto(home.path);
      await expect(button(page)).toBeVisible();
      expect(gets[0]).toEqual({ slug: 'home' });
      await button(page).click();
      await expect(instance(page).locator('.mn')).toHaveText(home.many(13));
      await expect.poll(() => leaves.length).toBe(1);
      expect(leaves[0]).toEqual({ slug: 'home', by: 1 });
    });

    test('counts separately from a note', async ({ page }) => {
      const { gets } = await mockMarks(page, { total: 12 });
      await page.goto(home.path);
      await expect(button(page)).toBeVisible();
      const noteSlug = home.path === '/' ? 'smoke-es' : 'smoke-en';
      await page.goto(home.path === '/' ? '/notes/smoke-es/' : '/en/notes/smoke-en/');
      await expect(page.locator('[data-marks][data-v="h"] .mb')).toBeVisible();
      expect(gets.map((get) => get.slug)).toEqual(['home', noteSlug]);
    });

    test('the privacy tooltip opens on keyboard focus and its link works', async ({ page }) => {
      await mockMarks(page, { total: 12 });
      await page.goto(home.path);
      await expect(button(page)).toBeVisible();
      const bubble = card(page).locator('[role="tooltip"]');
      await expect(bubble).toBeHidden();
      await button(page).focus();
      await page.keyboard.press('Shift+Tab');
      await page.keyboard.press('Tab');
      await expect(bubble).toBeVisible();
      await expect(bubble).toContainText(home.tip);
      const link = bubble.getByRole('link');
      await expect(link).toHaveAttribute('href', home.privacy);
      // The card must not clip the tooltip: its box stays inside the viewport and above the button.
      const bubbleBox = await bubble.boundingBox();
      const width = page.viewportSize()?.width ?? 0;
      expect(bubbleBox?.x ?? -1).toBeGreaterThanOrEqual(0);
      expect((bubbleBox?.x ?? 0) + (bubbleBox?.width ?? 0)).toBeLessThanOrEqual(width);
      await page.keyboard.press('Tab');
      await expect(link).toBeFocused();
      await page.keyboard.press('Enter');
      await expect(page).toHaveURL(new RegExp(`${home.privacy.replace('#', '#')}$`));
    });

    test('collapses without breaking the page when the Action fails', async ({ page }) => {
      await mockMarks(page, { getStatus: 503 });
      await page.goto(home.path);
      await expect(page.locator('h1')).toBeVisible();
      await expect(page.locator('[data-marks]')).toHaveCount(0);
      await expect(card(page)).toHaveCount(0);
      await expect(page.locator('.mb')).toHaveCount(0);
    });
  });
}

for (const theme of ['elvinlab-dark', 'elvinlab-light']) {
  test(`the home with the footprint card has no axe violations (${theme})`, async ({ page }) => {
    await page.addInitScript((t) => localStorage.setItem('theme', t), theme);
    await mockMarks(page, { total: 12 });
    await page.goto('/');
    await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
    await expect(button(page)).toBeVisible();
    const { violations } = await scan(page);
    expect(describeViolations(violations)).toEqual([]);
  });
}
