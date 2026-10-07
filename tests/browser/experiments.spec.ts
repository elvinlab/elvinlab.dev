import { expect, type Page, test } from '@playwright/test';

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

test('the second piece shows its screenshot lazily with alternative text and explicit size', async ({
  page,
}) => {
  await page.goto('/experiments/');
  const shot = page.getByRole('img', {
    name: 'Captura de la nota que cuenta el caso de agentic-dev-setup',
  });
  await expect(shot).toHaveAttribute('loading', 'lazy');
  await expect(shot).toHaveAttribute('decoding', 'async');
  await expect(shot).toHaveAttribute('width', '1280');
  await expect(shot).toHaveAttribute('height', '800');
  await page.goto('/en/experiments/');
  await expect(
    page.getByRole('img', { name: 'Screenshot of the elvinlab.dev home page' }),
  ).toBeVisible();
});

test('the page title stays inside the page-title scale of the sibling pages', async ({ page }) => {
  const size = async (path: string) =>
    page.goto(path).then(() =>
      page
        .locator('h1')
        .first()
        .evaluate((el) => Number.parseFloat(getComputedStyle(el).fontSize)),
    );
  const contact = await size('/contact/');
  for (const path of ['/experiments/', '/en/experiments/']) {
    expect(await size(path), path).toBeLessThanOrEqual(contact);
  }
});

test('no piece is ever dimmed: the scroll reveal moves pieces but never touches opacity', async ({
  page,
}) => {
  await page.goto('/experiments/');
  const opacities = await page.evaluate(() =>
    [...document.querySelectorAll('main article')].flatMap((piece) => [
      getComputedStyle(piece).opacity,
      ...piece
        .getAnimations()
        .flatMap((animation) =>
          (animation.effect as KeyframeEffect)
            .getKeyframes()
            .map((frame) => String(frame['opacity'])),
        ),
    ]),
  );
  expect(opacities.length).toBeGreaterThan(0);
  expect(opacities.every((value) => value === '1' || value === 'undefined')).toBe(true);
});

test('the gallery thumbnails never wrap, even on a phone', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/experiments/');
  const tops = await page
    .locator('#elvinlab-dev label.xp-thumb')
    .evaluateAll((labels) => labels.map((label) => Math.round(label.getBoundingClientRect().top)));
  expect(tops).toHaveLength(4);
  expect(new Set(tops).size).toBe(1);
});

test('the featured flagship leads: elvinlab.dev comes before agentic-dev-setup', async ({
  page,
}) => {
  await page.goto('/experiments/');
  const ids = await page.locator('main article').evaluateAll((pieces) => pieces.map((p) => p.id));
  expect(ids).toEqual(['elvinlab-dev', 'agentic-dev-setup']);
});

test('only the first image of the first piece is eager, every other one is lazy', async ({
  page,
}) => {
  await page.goto('/experiments/');
  const images = page.locator('main img');
  expect(await images.count()).toBeGreaterThan(2);
  await expect(page.locator('main img[loading="eager"]')).toHaveCount(1);
  await expect(page.locator('main article').first().locator('img[loading="eager"]')).toHaveCount(1);
  await expect(page.locator('main img[fetchpriority="high"]')).toHaveCount(1);
  for (const image of await page.locator('main img:not([loading="eager"])').all()) {
    await expect(image).toHaveAttribute('loading', 'lazy');
  }
});

test.describe('the gallery of an experiment with several images', () => {
  const piece = (page: Page) => page.locator('#elvinlab-dev');
  const caption = (page: Page) => piece(page).locator('figcaption:visible');

  test('shows the first slide and works with the mouse and the arrow keys', async ({ page }) => {
    await page.goto('/experiments/');
    await expect(
      piece(page).getByRole('group', { name: 'Capturas de elvinlab.dev' }),
    ).toBeVisible();
    await expect(caption(page)).toContainText('Inicio: la última nota y el perfil');
    await expect(caption(page)).toContainText('1 / 4');
    await expect(piece(page).locator('figure:visible')).toHaveCount(1);

    // Clicking the second thumbnail (a label with a full accessible name) shows its slide.
    const second = piece(page).getByRole('radio', { name: /Captura 2 de 4: \/me/ });
    await piece(page).locator('label.xp-thumb').nth(1).click();
    await expect(second).toBeChecked();
    await expect(caption(page)).toContainText('/me: la página para quien evalúa mi perfil');
    await expect(caption(page)).toContainText('2 / 4');
    await expect(piece(page).locator('figure:visible')).toHaveCount(1);

    // Arrow keys move between radios natively.
    await page.locator('#elvinlab-dev-shot-2').focus();
    await page.keyboard.press('ArrowRight');
    await expect(caption(page)).toContainText('3 / 4');
    await page.keyboard.press('ArrowLeft');
    await page.keyboard.press('ArrowLeft');
    await expect(caption(page)).toContainText('1 / 4');
  });

  test('has a visible focus ring on the focused thumbnail and one radio per slide', async ({
    page,
  }) => {
    await page.goto('/experiments/');
    await expect(piece(page).getByRole('radio')).toHaveCount(4);
    await page.keyboard.press('Tab');
    await page.locator('#elvinlab-dev-shot-1').focus();
    await page.keyboard.press('ArrowRight');
    const ring = await piece(page)
      .locator('label.xp-thumb')
      .nth(1)
      .evaluate((el) => getComputedStyle(el).boxShadow);
    expect(ring).not.toBe('none');
  });
});

test.describe('without JavaScript', () => {
  test.use({ javaScriptEnabled: false });

  test('the first slide is shown and choosing a thumbnail still changes the slide', async ({
    page,
  }) => {
    await page.goto('/experiments/');
    const piece = page.locator('#elvinlab-dev');
    const caption = piece.locator('figcaption:visible');
    await expect(caption).toContainText('1 / 4');
    await piece.locator('label.xp-thumb').nth(2).click();
    await expect(caption).toContainText('3 / 4');
  });
});

test('a single image is a plain figure and there is no compact tier with two featured entries', async ({
  page,
}) => {
  await page.goto('/experiments/');
  const single = page.locator('#agentic-dev-setup');
  await expect(single.getByRole('radio')).toHaveCount(0);
  await expect(single.locator('fieldset')).toHaveCount(0);
  await expect(single.locator('figcaption')).toContainText('La nota que cuenta el caso');
  await expect(page.getByRole('heading', { name: 'Más experimentos' })).toHaveCount(0);
  await expect(page.locator('li.xc')).toHaveCount(0);
});

for (const id of ['elvinlab-dev', 'agentic-dev-setup']) {
  test(`#${id} lands on its piece even with content-visibility on later pieces`, async ({
    page,
  }) => {
    await page.goto(`/experiments/#${id}`);
    await expect(page.locator(`#${id}`)).toBeInViewport();
  });
}

test.describe('with reduced motion', () => {
  test.use({ reducedMotion: 'reduce' });

  test('no piece runs an animation or a transition on load or after scrolling', async ({
    page,
  }) => {
    await page.goto('/experiments/');
    await page.mouse.wheel(0, 1200);
    await page.waitForTimeout(300);
    const running = await page.evaluate(
      () =>
        [...document.querySelectorAll('main article, main article *')]
          .flatMap((el) => el.getAnimations())
          .filter((animation) => animation.playState === 'running').length,
    );
    expect(running).toBe(0);
  });
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
