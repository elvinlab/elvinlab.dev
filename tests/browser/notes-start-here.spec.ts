import { expect, test } from '@playwright/test';

import { requires } from './helpers/features';
import { text } from './helpers/site';

requires({ routes: ['notes'] });

// The fixture notes carry no `startHere` flag, so these checks exercise the fallback (the most
// recent notes of the language fill the block). The flagged path is covered by unit tests.

test('/notes/ opens with a start-here block of flat rows that link to notes', async ({ page }) => {
  await page.goto('/notes/');
  const heading = page.getByRole('heading', { level: 2, name: text('es', 'notes.startHere') });
  await expect(heading).toBeVisible();
  const block = page.locator('section', { has: heading });
  const links = block.getByRole('link');
  expect(await links.count()).toBeGreaterThan(0);
  expect(await links.count()).toBeLessThanOrEqual(3);
  for (const href of await links.evaluateAll((anchors) =>
    anchors.map((a) => a.getAttribute('href')),
  )) {
    expect(href).toMatch(/^\/(en\/)?notes\/[a-z0-9-]+\/$/);
  }
});

test('the start-here block sits above the search field', async ({ page }) => {
  await page.goto('/notes/');
  const heading = page.getByRole('heading', { level: 2, name: text('es', 'notes.startHere') });
  const search = page.getByRole('searchbox').or(page.locator('input[type="search"]')).first();
  const headingBox = await heading.boundingBox();
  const searchBox = await search.boundingBox();
  expect(headingBox && searchBox && headingBox.y < searchBox.y).toBe(true);
});

test('the start-here block is static HTML with no script of its own', async ({ page }) => {
  await page.goto('/notes/');
  await expect(page.getByRole('heading', { name: text('es', 'notes.startHere') })).toBeVisible();
  const scriptsInBlock = await page
    .locator('section', { has: page.getByRole('heading', { name: text('es', 'notes.startHere') }) })
    .locator('script')
    .count();
  expect(scriptsInBlock).toBe(0);
});

for (const slug of ['smoke-es', 'smoke-es-next']) {
  test(`the end of /notes/${slug}/ never repeats the note itself or its previous and next cards`, async ({
    page,
  }) => {
    await page.goto(`/notes/${slug}/`);
    const heading = page.getByRole('heading', { level: 2, name: text('es', 'note.continue') });
    const shown = await page
      .locator('[data-prev-next] a')
      .evaluateAll((anchors) => anchors.map((a) => a.getAttribute('href')));
    const continueLinks = (await heading.count())
      ? await page
          .locator('aside section', { has: heading })
          .getByRole('link')
          .evaluateAll((anchors) => anchors.map((a) => a.getAttribute('href')))
      : [];
    expect(continueLinks.length).toBeLessThanOrEqual(3);
    expect(continueLinks).not.toContain(`/notes/${slug}/`);
    for (const href of shown) expect(continueLinks).not.toContain(href);
    expect(new Set(continueLinks).size).toBe(continueLinks.length);
  });

  test(`/notes/${slug}/ has no empty ${text('es', 'note.continue')} heading`, async ({ page }) => {
    await page.goto(`/notes/${slug}/`);
    const heading = page.getByRole('heading', { level: 2, name: text('es', 'note.continue') });
    if ((await heading.count()) === 0) return;
    const items = page.locator('aside section', { has: heading }).getByRole('link');
    expect(await items.count()).toBeGreaterThan(0);
  });
}
