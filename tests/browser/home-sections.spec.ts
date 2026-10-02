import { expect, test } from '@playwright/test';

/**
 * The fixture build copies the real `site.config.ts`, which uses `appearance: 'minimal'`: the home
 * drops the hero pills, the lab log and the pillars, and keeps the author card, the recruiter
 * card and the notebook index. A section that is off must leave no heading or wrapper behind.
 */
test.beforeEach(({ browserName: _browserName }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium-1280', 'section switches are viewport independent');
});

const HOMES = [
  {
    path: '/',
    labLog: 'Bitácora',
    pillars: 'En qué trabajo',
    notebook: 'Cuaderno',
    hiring: '¿Contratando?',
  },
  {
    path: '/en/',
    labLog: 'Lab log',
    pillars: 'What I work on',
    notebook: 'Notebook',
    hiring: 'Hiring?',
  },
];

for (const { path, labLog, pillars, notebook, hiring } of HOMES) {
  test.describe(`minimal home at ${path}`, () => {
    test('hides the hero pills, the lab log and the pillars without leaving anything behind', async ({
      page,
    }) => {
      await page.goto(path);
      await expect(page.locator('[data-home-hero] h1')).toBeVisible();
      await expect(page.locator('[data-home-hero] ul')).toHaveCount(0);
      await expect(page.getByRole('heading', { name: labLog })).toHaveCount(0);
      await expect(page.locator(`section[aria-label="${pillars}"]`)).toHaveCount(0);
      await expect(page.getByText('Clean architecture')).toHaveCount(0);
    });

    test('keeps the author card, the recruiter card and the notebook index', async ({ page }) => {
      await page.goto(path);
      await expect(page.locator('img[alt="Elvin González"]')).toBeVisible();
      await expect(page.getByRole('heading', { name: hiring })).toBeVisible();
      await expect(page.getByRole('heading', { name: notebook })).toBeVisible();
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
