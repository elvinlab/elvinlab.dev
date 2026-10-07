import { expect, test } from '@playwright/test';

/**
 * The projects page and the `/me` strip. The fixture build copies the real `experiments.json`;
 * it holds only fixture notes, so `dropUnavailableProjectNotes` removes the `note` of a project
 * whose note is not a fixture. Case links therefore appear only when their note exists, and every
 * one that does appear must resolve.
 */
const PAGES = [
  { path: '/projects/', heading: 'Proyectos', live: 'Ver sitio', code: 'Código' },
  { path: '/en/projects/', heading: 'Projects', live: 'View site', code: 'Code' },
] as const;

test.beforeEach(({ browserName: _browserName }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium-1280', 'content does not depend on the width');
});

for (const { path, heading, live, code } of PAGES) {
  test(`${path} lists both projects with working links`, async ({ page, request }) => {
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
  await page.goto('/projects/');
  const shot = page.getByRole('img', { name: 'Captura de la página de inicio de elvinlab.dev' });
  await expect(shot).toHaveAttribute('loading', 'lazy');
  await expect(shot).toHaveAttribute('decoding', 'async');
  await expect(shot).toHaveAttribute('width', '800');
  await expect(shot).toHaveAttribute('height', '500');
  await page.goto('/en/projects/');
  await expect(
    page.getByRole('img', { name: 'Screenshot of the elvinlab.dev home page' }),
  ).toBeVisible();
});

for (const [path, section] of [
  ['/me/', 'Proyectos'],
  ['/en/me/', 'Projects'],
] as const) {
  test(`${path} shows two project cards before the contribution section`, async ({ page }) => {
    await page.goto(path);
    const projects = page.locator('#projects');
    await expect(projects.getByRole('heading', { level: 2, name: section })).toBeVisible();
    await expect(projects.locator('article')).toHaveCount(2);

    const order = await page.evaluate(() => {
      const headings = [...document.querySelectorAll('main h2, #projects h2')];
      return headings.map((h) => ({
        text: h.textContent?.trim() ?? '',
        top: h.getBoundingClientRect().top,
      }));
    });
    const projectsTop = order.find((h) => h.text === section)?.top ?? Number.NaN;
    const bring = order.find((h) => /Qué aporto|What I bring/.test(h.text))?.top ?? Number.NaN;
    expect(projectsTop).toBeLessThan(bring);

    // The hero CTA jumps to the section.
    await page.getByRole('link', { name: /Ver proyectos|View projects/ }).click();
    await expect(page).toHaveURL(/#projects$/);
    await expect(projects).toBeInViewport();

    // "See all" goes to the projects page of the same language.
    const all = projects.getByRole('link', { name: /Ver todos|See all/ });
    await expect(all).toHaveAttribute('href', path === '/me/' ? '/projects/' : '/en/projects/');
  });
}

test('the navbar lists Projects and it leads to the projects page', async ({ page }) => {
  await page.goto('/');
  await page
    .getByRole('navigation', { name: 'Principal' })
    .getByRole('link', { name: 'Proyectos' })
    .click();
  await expect(page).toHaveURL(/\/projects\/$/);
});
