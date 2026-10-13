import { expect, test } from '@playwright/test';

import { requires } from './helpers/features';

requires({ routes: ['notes'] });

// The fixture notes all carry the `testing` category and tag, so that filter matches every row and
// an unknown tag matches none; the per-row `data-tags` attribute proves the rule behind both. The
// tag `testing` belongs to the fixture topic, so its chips link to the topic page; `sin-tema` (on
// one note) belongs to no topic, so its chip keeps linking to the filter.

const visibleRows = (page: import('@playwright/test').Page) =>
  page.locator('[data-note-row]:visible');

test('clicking a tag chip on the index filters the rows and shows the notice', async ({ page }) => {
  await page.goto('/notes/');
  expect(await page.locator('[data-note-row]').count()).toBeGreaterThan(0);

  await page.locator('[data-note-row] a[href^="/notes/?tag="]').first().click();
  await expect(page).toHaveURL(/\/notes\/\?tag=sin-tema$/);

  const notice = page.locator('[data-notes-tag-notice]');
  await expect(notice).toBeVisible();
  await expect(notice).toHaveAttribute('role', 'status');
  await expect(notice).toContainText('#sin-tema');

  const rows = visibleRows(page);
  await expect(rows).toHaveCount(1);
  for (const tags of await rows.evaluateAll((els) =>
    els.map((el) => (el as HTMLElement).dataset['tags'] ?? ''),
  )) {
    expect(tags.split('|')).toContain('sin-tema');
  }
});

test('the clear link returns to every row and hides the notice', async ({ page }) => {
  await page.goto('/notes/?tag=nope');
  await expect(visibleRows(page)).toHaveCount(0);
  await page.locator('[data-notes-tag-notice] a').click();
  await expect(page).toHaveURL(/\/notes\/$/);
  await expect(page.locator('[data-notes-tag-notice]')).toBeHidden();
  expect(await visibleRows(page).count()).toBeGreaterThan(0);
});

test('an unknown tag shows the empty state and keeps the notice so it can be cleared', async ({
  page,
}) => {
  await page.goto('/notes/?tag=nope');
  await expect(visibleRows(page)).toHaveCount(0);
  await expect(page.locator('[data-notes-empty]')).toBeVisible();
  const notice = page.locator('[data-notes-tag-notice]');
  await expect(notice).toBeVisible();
  await expect(notice).toContainText('#nope');
});

test('the tag filter combines with the search box', async ({ page }) => {
  await page.goto('/notes/?tag=testing');
  expect(await visibleRows(page).count()).toBeGreaterThan(0);
  await page.locator('[data-notes-search]').fill('zzzz-no-match');
  await expect(visibleRows(page)).toHaveCount(0);
  await expect(page.locator('[data-notes-empty]')).toBeVisible();
  await expect(page.locator('[data-notes-tag-notice]')).toBeVisible();
});

test('the tag value from the URL is shown as text, never as markup', async ({ page }) => {
  await page.goto(`/notes/?tag=${encodeURIComponent('<b id="x">hi</b>')}`);
  await expect(page.locator('[data-notes-tag-notice]')).toContainText('<b id="x">hi</b>');
  await expect(page.locator('#x')).toHaveCount(0);
});

test('a tag chip without a topic on a note page links to the filtered index', async ({ page }) => {
  await page.goto('/notes/smoke-es-next/');
  const chip = page.locator('[data-article] a[href="/notes/?tag=sin-tema"]');
  await expect(chip).toBeVisible();
  await expect(chip).toContainText('#sin-tema');
});

test('/notes/?tag= keeps its canonical on /notes/', async ({ page }) => {
  await page.goto('/notes/?tag=testing');
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    'href',
    /^https?:\/\/[^/]+\/notes\/$/,
  );
});

test('the year count follows the visible rows', async ({ page }) => {
  await page.goto('/notes/');
  await page.locator('[data-notes-search]').fill('es next');
  await expect(visibleRows(page)).toHaveCount(1);
  await expect(page.locator('[data-year-group]:visible [data-year-count]').first()).toContainText(
    /^1\D/,
  );
});
