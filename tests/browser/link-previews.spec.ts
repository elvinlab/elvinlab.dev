import { expect, type Page, test } from '@playwright/test';

const meta = (page: Page, attribute: 'property' | 'name', key: string) =>
  page.locator(`meta[${attribute}="${key}"]`);

const NOTES = [
  { path: '/notes/smoke-es/', slug: 'smoke-es', title: 'Synthetic smoke note ES', locale: 'es_ES' },
  {
    path: '/en/notes/smoke-en/',
    slug: 'smoke-en',
    title: 'Synthetic smoke note EN',
    locale: 'en_US',
  },
] as const;

for (const { path, slug, title, locale } of NOTES) {
  test.describe(`${path} link preview`, () => {
    test('is an article with its own card, alt text and locale', async ({ page }) => {
      await page.goto(path);
      await expect(meta(page, 'property', 'og:type')).toHaveAttribute('content', 'article');
      await expect(meta(page, 'property', 'article:published_time')).toHaveAttribute(
        'content',
        '2026-01-15T00:00:00.000Z',
      );
      await expect(meta(page, 'property', 'article:tag')).toHaveAttribute('content', 'testing');
      await expect(meta(page, 'property', 'og:locale')).toHaveAttribute('content', locale);

      const image = `https://elvinlab.dev/og/notes/${slug}.png`;
      await expect(meta(page, 'property', 'og:image')).toHaveAttribute('content', image);
      await expect(meta(page, 'name', 'twitter:image')).toHaveAttribute('content', image);
      // The card shows the title and the domain, so the alt text names both.
      const alt = `${title} — elvinlab.dev`;
      await expect(meta(page, 'property', 'og:image:alt')).toHaveAttribute('content', alt);
      await expect(meta(page, 'name', 'twitter:image:alt')).toHaveAttribute('content', alt);
      await expect(meta(page, 'name', 'twitter:card')).toHaveAttribute(
        'content',
        'summary_large_image',
      );
    });

    test('serves a real 1200x630 PNG card', async ({ request }) => {
      const response = await request.get(`/og/notes/${slug}.png`);
      expect(response.status()).toBe(200);
      expect(response.headers()['content-type']).toContain('image/png');
      const png = await response.body();
      expect([...png.subarray(0, 8)]).toEqual([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
      // IHDR: width and height are big-endian 32-bit integers at bytes 16 and 20.
      expect([png.readUInt32BE(16), png.readUInt32BE(20)]).toEqual([1200, 630]);
    });

    test('describes the post with its image and an author URL in structured data', async ({
      page,
    }) => {
      await page.goto(path);
      const blocks = await page
        .locator('script[type="application/ld+json"]')
        .evaluateAll((nodes) => nodes.map((node) => JSON.parse(node.textContent ?? '{}')));
      const post = blocks.find((block) => block['@type'] === 'BlogPosting');
      expect(post.image).toBe(`https://elvinlab.dev/og/notes/${slug}.png`);
      expect(post.author.url).toBe('https://elvinlab.dev');
    });
  });
}

test.describe('other pages keep the default card', () => {
  for (const { path, locale } of [
    { path: '/', locale: 'es_ES' },
    { path: '/en/', locale: 'en_US' },
  ]) {
    test(`${path} is a website with the default image and a valid locale`, async ({ page }) => {
      await page.goto(path);
      await expect(meta(page, 'property', 'og:type')).toHaveAttribute('content', 'website');
      await expect(meta(page, 'property', 'og:image')).toHaveAttribute(
        'content',
        'https://elvinlab.dev/og-image.png',
      );
      await expect(meta(page, 'property', 'og:image:alt')).toHaveAttribute('content', /Elvin/);
      await expect(meta(page, 'property', 'og:locale')).toHaveAttribute('content', locale);
      await expect(meta(page, 'property', 'article:published_time')).toHaveCount(0);
    });
  }
});

for (const { path, locale, card, bio } of [
  { path: '/me/', locale: 'es_ES', card: 'me-es', bio: 'Ingeniero full-stack' },
  { path: '/en/me/', locale: 'en_US', card: 'me-en', bio: 'Full-stack engineer' },
]) {
  test.describe(`${path} link preview`, () => {
    test('has its own card, a real title and a description', async ({ page }) => {
      await page.goto(path);
      await expect(meta(page, 'property', 'og:image')).toHaveAttribute(
        'content',
        `https://elvinlab.dev/og/${card}.png`,
      );
      await expect(meta(page, 'name', 'twitter:image')).toHaveAttribute(
        'content',
        `https://elvinlab.dev/og/${card}.png`,
      );
      await expect(meta(page, 'property', 'og:title')).toHaveAttribute(
        'content',
        'Elvin González — elvinlab.dev',
      );
      await expect(meta(page, 'property', 'og:description')).toHaveAttribute(
        'content',
        new RegExp(bio),
      );
      await expect(meta(page, 'property', 'og:image:alt')).toHaveAttribute(
        'content',
        /Elvin González/,
      );
      await expect(meta(page, 'property', 'og:locale')).toHaveAttribute('content', locale);
      await expect(meta(page, 'property', 'og:type')).toHaveAttribute('content', 'website');
    });

    test('serves the real 1200x630 PNG card', async ({ request }) => {
      const response = await request.get(`/og/${card}.png`);
      expect(response.status()).toBe(200);
      expect(response.headers()['content-type']).toContain('image/png');
      const png = await response.body();
      expect([png.readUInt32BE(16), png.readUInt32BE(20)]).toEqual([1200, 630]);
    });
  });
}
