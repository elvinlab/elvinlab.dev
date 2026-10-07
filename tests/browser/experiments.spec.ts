import { expect, test } from '@playwright/test';

/**
 * The experiments page and the compact experiments block on `/me`. The fixture build copies the real `experiments.json`;
 * it holds only fixture notes, so `dropUnavailableProjectNotes` removes the `note` of an entry
 * whose note is not a fixture. Case links therefore appear only when their note exists, and every
 * one that does appear must resolve.
 */
const PAGES = [
  { path: '/experiments/', heading: 'Experimentos', live: 'Ver sitio', code: 'Código' },
  { path: '/en/experiments/', heading: 'Experiments', live: 'View site', code: 'Code' },
] as const;

test.beforeEach(({ browserName: _browserName }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium-1280', 'content does not depend on the width');
});

for (const { path, heading, live, code } of PAGES) {
  test(`${path} lists both experiments with working links`, async ({ page, request }) => {
    await page.goto(path);
    await expect(page.getByRole('heading', { level: 1, name: heading })).toBeVisible();
    const cards = page.locator('article');
    await expect(cards).toHaveCount(2);
    await expect(page.getByRole('heading', { level: 2, name: 'elvinlab.dev' })).toBeVisible();
    await expect(page.getByRole('heading', { level: 2, name: 'agentic-dev-setup' })).toBeVisible();

    // The live site is the site itself, so the helper keeps it in the same tab; code links are
    // external and open in a new tab without leaking the opener.
    const site = page.getByRole('link', { name: new RegExp(`^${live}`) });
    await expect(site).toHaveCount(1);
    await expect(site).toHaveAttribute('href', 'https://elvinlab.dev');
    await expect(site).not.toHaveAttribute('target', '_blank');
    const repos = page.getByRole('link', { name: new RegExp(`^${code}`) });
    await expect(repos).toHaveCount(2);
    for (const repo of await repos.all()) {
      await expect(repo).toHaveAttribute('href', /^https:\/\/github\.com\/elvinlab\//);
      await expect(repo).toHaveAttribute('target', '_blank');
      await expect(repo).toHaveAttribute('rel', /noopener/);
    }

    // Case links are internal, stay in the tab and resolve.
    const cases = await page
      .locator('article a[href^="/notes/"], article a[href^="/en/notes/"]')
      .all();
    for (const link of cases) {
      await expect(link).not.toHaveAttribute('target', '_blank');
      const response = await request.get((await link.getAttribute('href')) ?? '');
      expect(response.status()).toBe(200);
    }

    // Touch targets of the card links are at least 44 px tall.
    for (const link of await cards.getByRole('link').all()) {
      expect((await link.boundingBox())?.height ?? 0).toBeGreaterThanOrEqual(44);
    }
  });
}

test('the card shows its screenshot lazily with alternative text', async ({ page }) => {
  await page.goto('/experiments/');
  const shot = page.getByRole('img', { name: 'Captura de la página de inicio de elvinlab.dev' });
  await expect(shot).toHaveAttribute('loading', 'lazy');
  await expect(shot).toHaveAttribute('decoding', 'async');
  await expect(shot).toHaveAttribute('width', '800');
  await expect(shot).toHaveAttribute('height', '500');
  await page.goto('/en/experiments/');
  await expect(
    page.getByRole('img', { name: 'Screenshot of the elvinlab.dev home page' }),
  ).toBeVisible();
});

for (const [path, section, all, text, indexPath] of [
  [
    '/me/',
    'Experimentos recientes',
    'Ver todos los experimentos',
    /seguir conociendo mi trabajo/,
    '/experiments/',
  ],
  [
    '/en/me/',
    'Recent experiments',
    'See all experiments',
    /keep exploring my work/,
    '/en/experiments/',
  ],
] as const) {
  test(`${path} shows compact experiment rows before the contribution section`, async ({
    page,
  }) => {
    await page.goto(path);
    const block = page.locator('#experiments');
    await expect(block.getByRole('heading', { level: 2, name: section })).toBeVisible();
    // Compact rows, not cards: one link per entry, no full card and no links row.
    await expect(block.locator('article')).toHaveCount(0);
    const rows = block.locator('ol > li > a');
    await expect(rows).toHaveCount(2);
    await expect(rows.first()).toHaveAttribute(
      'href',
      new RegExp(`^${indexPath}#(elvinlab-dev|agentic-dev-setup)$`),
    );
    for (const row of await rows.all()) {
      expect((await row.boundingBox())?.height ?? 0).toBeGreaterThanOrEqual(44);
    }
    // The thumbnail is decorative and small: the lazy 800 px screenshot is not used here.
    const thumb = block.locator('ol img').first();
    await expect(thumb).toHaveAttribute('alt', '');
    await expect(thumb).toHaveAttribute('width', '96');
    await expect(thumb).toHaveAttribute('loading', 'lazy');

    const order = await page.evaluate(() => {
      const headings = [...document.querySelectorAll('main h2, #experiments h2')];
      return headings.map((h) => ({
        text: h.textContent?.trim() ?? '',
        top: h.getBoundingClientRect().top,
      }));
    });
    const blockTop = order.find((h) => h.text === section)?.top ?? Number.NaN;
    const bring = order.find((h) => /Qué aporto|What I bring/.test(h.text))?.top ?? Number.NaN;
    expect(blockTop).toBeLessThan(bring);

    // The hero has no experiments shortcut: its call to action is the closing band below the rows.
    await expect(page.locator('a[href="#experiments"]')).toHaveCount(0);

    // The heading carries no link; the closing call to action leads to the experiments page.
    await expect(block.locator('h2 a')).toHaveCount(0);
    await expect(block.getByText(text)).toBeVisible();
    const cta = block.getByRole('link', { name: all });
    await expect(cta).toHaveAttribute('href', indexPath);
    expect((await cta.boundingBox())?.height ?? 0).toBeGreaterThanOrEqual(44);
  });

  test(`${path} row opens its card on the experiments page`, async ({ page }) => {
    await page.goto(path);
    const row = page.locator('#experiments ol > li > a').first();
    const href = (await row.getAttribute('href')) ?? '';
    await row.click();
    await expect(page).toHaveURL(new RegExp(`${href}$`));
    await expect(page.locator(`#${href.split('#')[1]}`)).toBeInViewport();
  });
}

test('the navbar lists Experiments and it leads to the experiments page', async ({ page }) => {
  await page.goto('/');
  await page
    .getByRole('navigation', { name: 'Principal' })
    .getByRole('link', { name: 'Experimentos' })
    .click();
  await expect(page).toHaveURL(/\/experiments\/$/);
});
