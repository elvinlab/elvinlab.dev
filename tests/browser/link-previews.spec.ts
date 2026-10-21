import { expect, type Page, test } from '@playwright/test';

import { has, requires } from './helpers/features';
import { escapeRegExp, site } from './helpers/site';

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
    requires({ routes: ['notes'] });

    test('is an article with its own card, alt text and locale', async ({ page }) => {
      await page.goto(path);
      await expect(meta(page, 'property', 'og:type')).toHaveAttribute('content', 'article');
      await expect(meta(page, 'property', 'article:published_time')).toHaveAttribute(
        'content',
        '2026-01-15T00:00:00.000Z',
      );
      await expect(meta(page, 'property', 'article:tag')).toHaveAttribute('content', 'testing');
      await expect(meta(page, 'property', 'og:locale')).toHaveAttribute('content', locale);

      // Link previews cut long titles (about 70 characters on LinkedIn and X), so the preview title is
      // the note title alone: the domain is already `og:site_name` and is drawn on the card. The
      // browser tab keeps the suffix.
      await expect(meta(page, 'property', 'og:title')).toHaveAttribute('content', title);
      await expect(meta(page, 'property', 'og:site_name')).toHaveAttribute('content', site.title);
      await expect(page).toHaveTitle(`${title} · ${site.title}`);

      // The card URL carries a `?v=` key from the number and title, so an edited title busts the
      // image caches of link previews.
      const image = new RegExp(
        `^${escapeRegExp(`${site.origin}/og/notes/${slug}.png`)}\\?v=[0-9a-f]{8}$`,
      );
      await expect(meta(page, 'property', 'og:image')).toHaveAttribute('content', image);
      await expect(meta(page, 'name', 'twitter:image')).toHaveAttribute('content', image);
      // The card shows the title and the domain, so the alt text names both.
      const alt = `${title} · ${site.title}`;
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
      expect(post.image).toMatch(
        new RegExp(`^${escapeRegExp(`${site.origin}/og/notes/${slug}.png`)}\\?v=[0-9a-f]{8}$`),
      );
      expect(post.author.url).toBe(site.origin);
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
        `${site.origin}/og-image.png`,
      );
      await expect(meta(page, 'property', 'og:image:alt')).toHaveAttribute('content', /Elvin/);
      await expect(meta(page, 'property', 'og:locale')).toHaveAttribute('content', locale);
      await expect(meta(page, 'property', 'article:published_time')).toHaveCount(0);
    });
  }
});

for (const { path, locale, card } of [
  {
    path: '/me/',
    locale: 'es_ES',
    card: 'me-es',
  },
  {
    path: '/en/me/',
    locale: 'en_US',
    card: 'me-en',
  },
]) {
  // The /me card is generated only with `features.me`; without it the page falls back to the
  // default share image instead of pointing at a card that does not exist.
  const cardPath = has({ flags: ['me'] }) ? `/og/${card}.png` : '/og-image.png';
  test.describe(`${path} link preview`, () => {
    test('has its own card, a real title and a description', async ({ page }) => {
      await page.goto(path);
      await expect(meta(page, 'property', 'og:image')).toHaveAttribute(
        'content',
        `${site.origin}${cardPath}`,
      );
      await expect(meta(page, 'name', 'twitter:image')).toHaveAttribute(
        'content',
        `${site.origin}${cardPath}`,
      );
      await expect(meta(page, 'property', 'og:title')).toHaveAttribute(
        'content',
        new RegExp(`^${escapeRegExp(site.name)}.* · ${escapeRegExp(site.title)}$`),
      );
      await expect(meta(page, 'property', 'og:description')).toHaveAttribute(
        'content',
        /^.{70,170}$/,
      );
      await expect(meta(page, 'property', 'og:image:alt')).toHaveAttribute(
        'content',
        new RegExp(escapeRegExp(site.name)),
      );
      await expect(meta(page, 'property', 'og:locale')).toHaveAttribute('content', locale);
      await expect(meta(page, 'property', 'og:type')).toHaveAttribute('content', 'website');
    });

    test('serves the real 1200x630 PNG card', async ({ request }) => {
      const response = await request.get(cardPath);
      expect(response.status()).toBe(200);
      expect(response.headers()['content-type']).toContain('image/png');
      const png = await response.body();
      expect([png.readUInt32BE(16), png.readUInt32BE(20)]).toEqual([1200, 630]);
    });
  });
}
