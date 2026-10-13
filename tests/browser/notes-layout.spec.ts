import { expect, type Page, test } from '@playwright/test';

import { has, seedTheme } from './helpers/features';

/** Vertical gap between the bottom of the article card and the top of the previous/next block. */
const gapBelowArticle = (page: Page) =>
  page.evaluate(() => {
    const article = document.querySelector('[data-article]');
    const nav = document.querySelector('[data-prev-next]');
    if (!article || !nav) return null;
    return Math.round(nav.getBoundingClientRect().top - article.getBoundingClientRect().bottom);
  });

test('the previous/next block has room below the article', async ({ page }) => {
  await page.goto('/notes/smoke-es/');
  await expect(page.locator('[data-prev-next]')).toBeVisible();
  expect(await gapBelowArticle(page)).toBeGreaterThanOrEqual(24);
});

test('and more room in reading mode, where the article card is gone', async ({ page }) => {
  test.skip(!has({ flags: ['readingMode'] }), 'needs features.readingMode');
  await page.addInitScript(() => localStorage.setItem('reading-mode', '1'));
  await page.goto('/notes/smoke-es/');
  await expect(page.locator('[data-prev-next]')).toBeVisible();
  expect(await gapBelowArticle(page)).toBeGreaterThanOrEqual(40);
});

test('the previous/next block keeps a gap before the discussion too', async ({ page }) => {
  await page.goto('/notes/smoke-es/');
  const gap = await page.evaluate(() => {
    const nav = document.querySelector('[data-prev-next]');
    const comments = document.querySelector('[data-comments]');
    if (!nav || !comments) return null;
    return Math.round(comments.getBoundingClientRect().top - nav.getBoundingClientRect().bottom);
  });
  expect(gap).toBeGreaterThanOrEqual(24);
});

test('an image in the body of a note is framed like the site cards and never wider than the column', async ({
  page,
}) => {
  await page.goto('/notes/smoke-es/');
  // The fixture notes carry no image (it would change every note page), so one is added to the DOM:
  // a 1600 px wide SVG, as a screenshot would be. Authors write `![alt](./file.png)`; Astro
  // renders the same `<img>` inside `.prose`.
  const frame = await page.evaluate(() => {
    const prose = document.querySelector('.prose');
    if (!prose) return null;
    const img = document.createElement('img');
    img.alt = 'A wide screenshot';
    img.width = 1600;
    img.height = 900;
    img.src =
      'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="900"/>';
    prose.append(img);
    const style = getComputedStyle(img);
    return {
      radius: style.borderTopLeftRadius,
      outline: style.outlineStyle,
      outlineWidth: style.outlineWidth,
      width: img.getBoundingClientRect().width,
      column: prose.getBoundingClientRect().width,
    };
  });
  expect(frame).not.toBeNull();
  expect(frame?.radius).not.toBe('0px');
  expect(frame?.outline).toBe('solid');
  expect(frame?.outlineWidth).toBe('1px');
  expect(frame?.width).toBeLessThanOrEqual((frame?.column ?? 0) + 0.5);
});

test('on the notes index the language badge sits on the same row as the date', async ({ page }) => {
  await page.goto('/notes/');
  const row = page.locator('[data-note-row]').first();
  const date = await row.locator('time').boundingBox();
  const badge = await row.locator('time + span').boundingBox();
  expect(date).not.toBeNull();
  expect(badge).not.toBeNull();
  const dateMid = (date?.y ?? 0) + (date?.height ?? 0) / 2;
  const badgeMid = (badge?.y ?? 0) + (badge?.height ?? 0) / 2;
  expect(Math.abs(dateMid - badgeMid)).toBeLessThanOrEqual(4);
  expect(badge?.x ?? 0).toBeGreaterThan((date?.x ?? 0) + (date?.width ?? 0) - 1);
});

for (const slug of ['smoke-es', 'smoke-es-next', 'smoke-en']) {
  test(`the related notes of ${slug} never repeat the previous or next note`, async ({ page }) => {
    await page.goto(`/notes/${slug}/`);
    const hrefs = (selector: string) =>
      page
        .locator(selector)
        .evaluateAll((links) =>
          links
            .map((link) => link.getAttribute('href') ?? '')
            .filter((href) => /^\/(en\/)?notes\/[^/?#]+\/$/.test(href)),
        );
    const shown = await hrefs('[data-prev-next] a');
    const related = await hrefs('aside a');
    for (const href of related) expect(shown).not.toContain(href);
    expect(related).not.toContain(`/notes/${slug}/`);
  });
}

test('the decision record in the banner has a visible solid index-card border in the dark theme', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium-1280', 'the banner record shows from lg');
  await seedTheme(page, 'elvinlab-dark');
  await page.goto('/notes/smoke-es/');
  const border = await page.evaluate(() => {
    const record = document.querySelector('[data-record-banner] section');
    if (!record) return null;
    const style = getComputedStyle(record);
    return { style: style.borderTopStyle, color: style.borderTopColor };
  });
  // Index card (DESIGN.md, "Decision record as an index card"): a 1 px solid divider, no longer dashed.
  expect(border?.style).toBe('solid');
  // The dark divider is white at 20 percent alpha (it was 14), so the alpha channel is 0.2.
  expect(border?.color).toMatch(/rgba\(255, 255, 255, 0\.2\)/);
});
