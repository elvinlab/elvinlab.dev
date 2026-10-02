import { expect, test } from '@playwright/test';

import { siteConfig } from '../../apps/web/src/site.config';

/**
 * Links that leave the site open in a new tab (so the visitor keeps their place in the blog),
 * announce it to assistive technology, and cannot reach back to the opener. Links inside the
 * site stay in the same tab: a tab per note would break the Back button.
 *
 * "Leaves the site" means a destination outside the owner's domain: the apex, `www` and any
 * subdomain count as the site itself. The oracle below is written independently of the helper in
 * `shared/lib/external-link.ts` so the spec cannot agree with a bug in it. The fixture build
 * serves on 127.0.0.1 but builds its links against `site.url`, so the real site origin is used.
 * Own-domain absolute links cannot appear in a fixture note (the white-label check forbids the
 * owner's domain in the build), so that rule is proven by the unit tests; here an own-domain
 * anchor, if a page ever has one, must stay in the same tab.
 */
const OWN_DOMAIN = new URL(siteConfig.url).hostname.replace(/^www\./, '');

const HINTS = { es: /se abre en una pestaña nueva/, en: /opens in a new tab/ } as const;

const PAGES = [
  '/',
  '/en/',
  '/me/',
  '/en/me/',
  '/notes/',
  '/notes/smoke-es/',
  '/en/notes/smoke-en/',
  '/contact/',
  '/en/contact/',
  '/changelog/',
  '/en/changelog/',
  '/privacy/',
  '/en/privacy/',
  '/terms/',
  '/en/terms/',
];

/** Pages that must show at least one external link, so the check cannot pass on an empty set. */
const MUST_HAVE_EXTERNAL = [
  '/',
  '/en/',
  '/me/',
  '/en/me/',
  '/notes/smoke-es/',
  '/en/notes/smoke-en/',
];

type Anchor = {
  href: string;
  target: string | null;
  rel: string | null;
  name: string;
  external: boolean;
};

test.beforeEach(({ browserName: _browserName }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium-1280', 'links do not depend on the viewport width');
});

async function readAnchors(
  page: import('@playwright/test').Page,
): Promise<{ lang: string; anchors: Anchor[] }> {
  return page.evaluate((own) => {
    const isOwn = (host: string) => host === own || host.endsWith(`.${own}`);
    const anchors = [...document.querySelectorAll('a[href]')].map((anchor) => {
      const href = anchor.getAttribute('href') ?? '';
      let external = false;
      try {
        const url = new URL(href, document.baseURI);
        const isWeb = url.protocol === 'http:' || url.protocol === 'https:';
        // A relative link resolves against the served origin (127.0.0.1): never external.
        const absolute = /^(?:https?:)?\/\//i.test(href);
        external = isWeb && absolute && !isOwn(url.hostname);
      } catch {
        external = false;
      }
      return {
        href,
        target: anchor.getAttribute('target'),
        rel: anchor.getAttribute('rel'),
        name: anchor.getAttribute('aria-label') ?? anchor.textContent ?? '',
        external,
      };
    });
    return { lang: document.documentElement.lang, anchors };
  }, OWN_DOMAIN);
}

for (const path of PAGES) {
  test(`links on ${path} open in a new tab only when they leave the site`, async ({ page }) => {
    await page.goto(path);
    const { lang, anchors } = await readAnchors(page);
    const hint = HINTS[lang === 'en' ? 'en' : 'es'];

    const external = anchors.filter((anchor) => anchor.external);
    if (MUST_HAVE_EXTERNAL.includes(path))
      expect(external.length, `external links on ${path}`).toBeGreaterThan(0);

    const problems: string[] = [];
    for (const anchor of anchors) {
      if (anchor.external) {
        const rel = (anchor.rel ?? '').split(/\s+/);
        if (anchor.target !== '_blank') problems.push(`${anchor.href}: target is ${anchor.target}`);
        if (!rel.includes('noopener') || !rel.includes('noreferrer')) {
          problems.push(`${anchor.href}: rel is ${anchor.rel}`);
        }
        if (!hint.test(anchor.name))
          problems.push(`${anchor.href}: name "${anchor.name.trim()}" has no new-tab hint`);
      } else {
        if (anchor.target !== null)
          problems.push(`${anchor.href}: internal link has target ${anchor.target}`);
        if (hint.test(anchor.name))
          problems.push(`${anchor.href}: internal link announces a new tab`);
      }
    }
    expect(problems).toEqual([]);
  });
}

test('the social links keep rel="me" next to the safety tokens', async ({ page }) => {
  await page.goto('/me/');
  const { anchors } = await readAnchors(page);
  const socials = anchors.filter(
    (anchor) => /github\.com|linkedin\.com/.test(anchor.href) && anchor.rel?.includes('me'),
  );
  expect(socials.length).toBeGreaterThan(0);
  for (const anchor of socials)
    expect(anchor.rel?.split(/\s+/).sort()).toEqual(['me', 'noopener', 'noreferrer']);
});

test('a link in a note body is handled like any other', async ({ page }) => {
  await page.goto('/notes/smoke-es/');
  const link = page.locator('article a[href^="https://example.org"]');
  await expect(link).toHaveCount(1);
  await expect(link).toHaveAttribute('target', '_blank');
  await expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  await expect(link.locator('.sr-only')).toHaveText(' (se abre en una pestaña nueva)');
  // The note's own links stay in the same tab.
  const internal = page.locator('article a[href="/notes/smoke-es-next/"]');
  await expect(internal).toHaveCount(1);
  await expect(internal).not.toHaveAttribute('target', /.*/);
});

test('an English note announces the new tab in English', async ({ page }) => {
  await page.goto('/en/notes/smoke-en/');
  const link = page.locator('article a[href^="https://example.org"]');
  await expect(link).toHaveCount(1);
  await expect(link.locator('.sr-only')).toHaveText(' (opens in a new tab)');
});
