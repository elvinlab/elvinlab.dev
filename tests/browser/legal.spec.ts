import { expect, test } from '@playwright/test';

const PAGES = [
  { path: '/terms/', h1: 'Términos de uso', footer: 'Términos', privacy: 'Privacidad' },
  { path: '/en/terms/', h1: 'Terms of use', footer: 'Terms', privacy: 'Privacy' },
] as const;

for (const { path, h1, footer, privacy } of PAGES) {
  test.describe(`${path}`, () => {
    test('renders the terms with the sections the site really needs', async ({ page }) => {
      await page.goto(path);
      await expect(page.getByRole('heading', { level: 1, name: h1 })).toBeVisible();
      for (const id of [
        'owner',
        'content',
        'use',
        'comments',
        'links',
        'professional',
        'privacy',
        'changes',
      ]) {
        await expect(page.locator(`section#${id}`)).toHaveCount(1);
      }
      await expect(page.locator('section#content a[href*="creativecommons.org"]')).toHaveCount(1);
    });

    test('is indexable and linked from the footer next to privacy', async ({ page }) => {
      await page.goto(path);
      await expect(page.locator('meta[name="robots"]')).toHaveCount(0);
      await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
        'href',
        new RegExp(`${path}$`),
      );
      const links = page.locator('footer').getByRole('link');
      await expect(links.filter({ hasText: footer })).toHaveAttribute('href', path);
      await expect(links.filter({ hasText: privacy })).toHaveCount(1);
    });
  });
}

test('every page footer links to the terms in its language', async ({ page }) => {
  for (const { from, to } of [
    { from: '/', to: '/terms/' },
    { from: '/en/', to: '/en/terms/' },
    { from: '/notes/', to: '/terms/' },
    { from: '/privacy/', to: '/terms/' },
  ]) {
    await page.goto(from);
    await expect(page.locator(`footer a[href="${to}"]`)).toHaveCount(1);
  }
});

test('the sitemap lists both terms pages', async ({ request }) => {
  const index = await (await request.get('/sitemap-index.xml')).text();
  const first = /<loc>[^<]*\/(sitemap-\d+\.xml)<\/loc>/.exec(index)?.[1] ?? 'sitemap-0.xml';
  const sitemap = await (await request.get(`/${first}`)).text();
  expect(sitemap).toContain('https://elvinlab.dev/terms/');
  expect(sitemap).toContain('https://elvinlab.dev/en/terms/');
});
