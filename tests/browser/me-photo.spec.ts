import { expect, type Page, test } from '@playwright/test';

/**
 * The portrait appears only on /me: the home author card keeps the cartoon avatar. Both are
 * `identity` images of the real `site.config.ts`, so the specs compare what each page serves
 * instead of hard-coding hashed file names.
 */
const NAME = 'Elvin González';

test.beforeEach(({ browserName: _browserName }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium-1280', 'the image choice does not depend on width');
});

const imageSrc = async (page: Page, path: string): Promise<string> => {
  await page.goto(path);
  const image = page.locator(`img[alt="${NAME}"]`).first();
  await expect(image).toHaveAttribute('src', /\.webp(\?.*)?$/);
  return (await image.getAttribute('src')) ?? '';
};

for (const { home, me } of [
  { home: '/', me: '/me/' },
  { home: '/en/', me: '/en/me/' },
]) {
  test.describe(`${me} portrait`, () => {
    test('is a webp that differs from the cartoon avatar of the home author card', async ({
      page,
    }) => {
      const avatar = await imageSrc(page, home);
      const portrait = await imageSrc(page, me);
      expect(portrait).not.toBe('');
      expect(avatar).not.toBe('');
      expect(portrait).not.toBe(avatar);
      expect(avatar).toContain('avatar');
      expect(portrait).toContain('photo');
    });

    test('is cropped from the top so the face stays in the frame', async ({ page }) => {
      await imageSrc(page, me);
      const image = page.locator(`img[alt="${NAME}"]`).first();
      await expect(image).toHaveCSS('object-fit', 'cover');
      const position = await image.evaluate((node) => getComputedStyle(node).objectPosition);
      // `object-top` computes to `50% 0%` (or `center top` in some engines): the vertical part is the top.
      expect(position).toMatch(/^(50% 0(%|px)|center top)$/);
    });
  });
}
