import { expect, test } from '@playwright/test';

import { describeViolations, scan } from './helpers/axe';
import { requires, seedTheme } from './helpers/features';
import { stubThirdParties } from './helpers/third-party';

requires({ routes: ['notes'] });

// `tests/fixtures/topics.json` defines one topic, `pruebas`, over the tag `testing`, which both
// Spanish fixture notes carry. These checks run on the real built output of that fixture.
const TOPIC = '/notes/tag/pruebas/';

test.beforeEach(async ({ page }) => {
  await stubThirdParties(page);
});

test('the topic page has one h1, its intro and its notes newest first', async ({ page }) => {
  await page.goto(TOPIC);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Fixture checks');
  await expect(page.getByText('This synthetic topic exists only inside')).toBeVisible();
  const links = await page
    .locator('main a[href^="/notes/smoke-"]')
    .evaluateAll((anchors) => anchors.map((a) => a.getAttribute('href')));
  expect(links).toEqual(['/notes/smoke-es-next/', '/notes/smoke-es/']);
});

test('the topic page has a unique title, description, self canonical and no script of its own', async ({
  page,
}) => {
  await page.goto(TOPIC);
  await expect(page).toHaveTitle(/^Fixture checks · /);
  await expect(page.locator('meta[name="description"]')).toHaveAttribute(
    'content',
    /fixture notes that carry the testing tag/,
  );
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    'href',
    /^https?:\/\/[^/]+\/notes\/tag\/pruebas\/$/,
  );
  await expect(page.locator('meta[name="robots"][content*="noindex"]')).toHaveCount(0);
  // No script of its own: it ships only the shared chrome scripts, never more than /notes/ does.
  const scripts = page.locator('script:not([type="application/ld+json"])');
  const topicScripts = await scripts.count();
  await page.goto('/notes/');
  expect(topicScripts).toBeLessThanOrEqual(await scripts.count());
});

test('the topic page carries a BreadcrumbList: home, notes, topic', async ({ page }) => {
  await page.goto(TOPIC);
  const blocks = await page
    .locator('script[type="application/ld+json"]')
    .evaluateAll((nodes) => nodes.map((node) => JSON.parse(node.textContent ?? '{}')));
  const trail = blocks.find((block) => block['@type'] === 'BreadcrumbList');
  expect(trail.itemListElement.map((item: { position: number }) => item.position)).toEqual([
    1, 2, 3,
  ]);
  expect(trail.itemListElement.map((item: { name: string }) => item.name)).toEqual([
    'Inicio',
    'Notas',
    'Fixture checks',
  ]);
  expect(trail.itemListElement[2].item).toMatch(/\/notes\/tag\/pruebas\/$/);
});

test('/notes/ lists the topics and links to them', async ({ page }) => {
  await page.goto('/notes/');
  const nav = page.getByRole('navigation', { name: 'Temas' });
  await expect(nav.getByRole('link', { name: 'Fixture checks' })).toHaveAttribute('href', TOPIC);
});

test('chips whose tag has a topic link to the topic page, the others to the filter', async ({
  page,
}) => {
  await page.goto('/notes/');
  const row = page.locator('[data-note-row]', { hasText: 'Synthetic smoke note ES next' });
  await expect(row.getByRole('link', { name: 'testing' })).toHaveAttribute('href', TOPIC);
  await expect(row.getByRole('link', { name: '#sin-tema' })).toHaveAttribute(
    'href',
    '/notes/?tag=sin-tema',
  );

  await page.goto('/notes/smoke-es/');
  await expect(
    page.locator('[data-article]').getByRole('link', { name: '#testing' }),
  ).toHaveAttribute('href', TOPIC);
});

test('the sitemap lists the topic page', async ({ request }) => {
  const index = await (await request.get('/sitemap-index.xml')).text();
  const first = /<loc>[^<]*\/(sitemap-\d+\.xml)<\/loc>/.exec(index)?.[1] ?? 'sitemap-0.xml';
  const sitemap = await (await request.get(`/${first}`)).text();
  expect(sitemap).toMatch(/<loc>https?:\/\/[^<]+\/notes\/tag\/pruebas\/<\/loc>/);
});

test('an unknown topic is a 404', async ({ request }) => {
  expect((await request.get('/notes/tag/no-such-topic/')).status()).toBe(404);
});

for (const theme of ['elvinlab-dark', 'elvinlab-light']) {
  test(`the topic page has no axe violations (${theme})`, async ({ page }) => {
    await seedTheme(page, theme);
    await page.goto(TOPIC);
    await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    const { violations } = await scan(page);
    expect(describeViolations(violations)).toEqual([]);
  });
}
