import { expect, type Page, test } from '@playwright/test';

/**
 * The fixture build copies the real `site.config.ts` (`FIXTURE_APPEARANCE` overrides the preset of
 * the copy). Under `minimal` the home drops the hero pills, the lab log and the pillars; under
 * `full` it shows them. Both presets keep the author card, the recruiter card and the notebook
 * index. A section that is off must leave no heading or wrapper behind. The expectations follow
 * `html[data-appearance]`, mirroring `HOME_PRESETS` in `shared/config/appearance.ts`.
 */
type Preset = 'minimal' | 'full';

/** Whether each preset-driven section is on (`HOME_PRESETS` in `shared/config/appearance.ts`). */
const PRESET_SECTIONS: Record<Preset, { heroPills: boolean; labLog: boolean; pillars: boolean }> = {
  minimal: { heroPills: false, labLog: false, pillars: false },
  full: { heroPills: true, labLog: true, pillars: true },
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
  test.describe(`home sections at ${path}`, () => {
    test('shows or hides the hero pills, the lab log and the pillars to match the preset, leaving nothing behind', async ({
      page,
    }) => {
      await page.goto(path);
      const on = PRESET_SECTIONS[await presetOf(page)];
      await expect(page.locator('[data-home-hero] h1')).toBeVisible();
      await expect(page.locator('[data-home-hero] ul')).toHaveCount(countFor(on.heroPills));
      await expect(page.getByText('Clean architecture')).toHaveCount(countFor(on.heroPills));
      await expect(page.getByRole('heading', { name: labLog })).toHaveCount(countFor(on.labLog));
      await expect(page.locator(`section[aria-label="${pillars}"]`)).toHaveCount(
        countFor(on.pillars),
      );
    });

    test('keeps the author card, the recruiter card and the notebook index', async ({ page }) => {
      await page.goto(path);
      await expect(page.locator('img[alt="Elvin González"]')).toBeVisible();
      await expect(page.getByRole('heading', { name: hiring })).toBeVisible();
      await expect(page.getByRole('heading', { name: notebook })).toBeVisible();
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
