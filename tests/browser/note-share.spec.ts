import { expect, test } from '@playwright/test';

/**
 * The share panel of a note: copy link plus one plain link per network. They are ordinary anchors
 * (no third-party script), they open in a new tab and each carries the canonical URL of the note.
 */
const NOTES = [
  { path: '/notes/smoke-es/', heading: 'Compartir', title: 'Synthetic smoke note ES' },
  { path: '/en/notes/smoke-en/', heading: 'Share', title: 'Synthetic smoke note EN' },
];

test.beforeEach(({ browserName: _browserName }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium-1280', 'the share links do not depend on width');
});

for (const { path, heading, title } of NOTES) {
  test.describe(`${path} share panel`, () => {
    const canonical = `https://elvinlab.dev${path}`;
    const panel = (page: import('@playwright/test').Page) =>
      page.locator('section', { has: page.getByRole('heading', { name: heading }) });

    test('shares to LinkedIn with the canonical URL', async ({ page }) => {
      await page.goto(path);
      const link = panel(page).getByRole('link', { name: /LinkedIn/ });
      await expect(link).toHaveAttribute(
        'href',
        `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(canonical)}`,
      );
      await expect(link).toHaveAttribute('target', '_blank');
      await expect(link).toHaveAttribute('rel', /noopener/);
    });

    test('shares to X with the canonical URL and the note title as the text', async ({ page }) => {
      await page.goto(path);
      const link = panel(page).getByRole('link', { name: /^X\b/ });
      await expect(link).toHaveCount(1);
      await expect(link).toHaveAttribute(
        'href',
        `https://x.com/intent/post?url=${encodeURIComponent(canonical)}&text=${encodeURIComponent(title)}`,
      );
      await expect(link).toHaveAttribute('target', '_blank');
      await expect(link).toHaveAttribute('rel', /noopener/);
    });

    test('shares to WhatsApp with the note title and its canonical URL in one message', async ({
      page,
    }) => {
      await page.goto(path);
      const link = panel(page).getByRole('link', { name: /^WhatsApp\b/ });
      await expect(link).toHaveCount(1);
      await expect(link).toHaveAttribute(
        'href',
        `https://wa.me/?text=${encodeURIComponent(`${title} ${canonical}`)}`,
      );
      await expect(link).toHaveAttribute('target', '_blank');
      await expect(link).toHaveAttribute('rel', /noopener/);
    });

    test('every share control keeps a 44 px hit area and the copy label stays on one line', async ({
      page,
    }) => {
      await page.goto(path);
      for (const control of await panel(page).locator('a, button').all()) {
        const box = await control.boundingBox();
        expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
        expect(box?.width ?? 0).toBeGreaterThanOrEqual(44);
      }
      const copy = panel(page).locator('[data-copy-link]');
      expect((await copy.boundingBox())?.height ?? 0).toBeLessThanOrEqual(48);
    });
  });
}
