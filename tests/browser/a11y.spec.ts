import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

const PAGES = ['/', '/me/', '/en/me/', '/notes/', '/notes/smoke-es/', '/en/', '/en/notes/smoke-en/'];
const THEMES = ['elvinlab-dark', 'elvinlab-light'];

const scan = async (page: import('@playwright/test').Page) => {
  await page.evaluate(async () => {
    await document.fonts.ready;
    const entranceAnimations = [...document.querySelectorAll<HTMLElement>('.animate-fade-in-up')]
      .flatMap((element) => element.getAnimations())
      .filter((animation) => animation.effect?.getTiming().iterations !== Infinity);
    await Promise.all(entranceAnimations.map((animation) => animation.finished));
  });
  return new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
};

for (const path of PAGES) {
  for (const theme of THEMES) {
    test(`${path} has no axe violations (${theme})`, async ({ page }) => {
      // Seed the theme before navigation so the pre-paint boot script applies it (no race).
      await page.addInitScript((t) => localStorage.setItem('theme', t), theme);
      await page.goto(path);
      await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      const { violations } = await scan(page);
      expect(violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target).join(' | ')}`)).toEqual(
        [],
      );
    });
  }
}

test('404 has no axe violations', async ({ page }) => {
  await page.goto('/no-such-page/');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  const { violations } = await scan(page);
  expect(violations.map((v) => v.id)).toEqual([]);
});

test('negative control: axe catches an injected image without alt text', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => {
    const img = document.createElement('img');
    img.src = 'data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==';
    document.querySelector('main')?.appendChild(img);
  });
  const { violations } = await scan(page);
  expect(violations.some((v) => v.id === 'image-alt')).toBe(true);
});
