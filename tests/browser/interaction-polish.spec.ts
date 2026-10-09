import { expect, type Locator, type Page, test } from '@playwright/test';

import { stubThirdParties } from './helpers/third-party';

const MIN_TARGET = 44;
/** Half of the minimum target, minus one pixel so device-pixel snapping cannot flake the probe. */
const PROBE = MIN_TARGET / 2 - 1;
const PHONE = { width: 390, height: 844 };
/** Scrolling past this hides the navbar (`Navbar.astro` hides after 120 px). */
const HIDE_SCROLL_PX = 600;
const TALL_PAGE_PX = 4000;

test.beforeEach(async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium-1280', 'each suite sets its own viewport');
  await stubThirdParties(page);
});

/** True when every point of a 44 x 44 box centered on the element resolves back to the element. */
const hasTapArea = async (locator: Locator): Promise<boolean> =>
  locator.evaluate((element, probe) => {
    element.scrollIntoView({ block: 'center' });
    const rect = element.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    return [-probe, 0, probe].every((dx) =>
      [-probe, 0, probe].every((dy) => {
        const hit = document.elementFromPoint(cx + dx, cy + dy);
        return hit !== null && element.contains(hit);
      }),
    );
  }, PROBE);

test.describe('code block copy button on a phone', () => {
  test.use({ viewport: PHONE, hasTouch: true, isMobile: true, deviceScaleFactor: 2 });

  test('every copy button is a 44 px target', async ({ page }) => {
    await page.goto('/notes/smoke-es/');
    const buttons = page.locator('.prose .expressive-code .copy button');
    expect(await buttons.count()).toBeGreaterThanOrEqual(2);
    for (let index = 0; index < (await buttons.count()); index += 1) {
      const box = await buttons.nth(index).boundingBox();
      expect(box?.width, `block ${index} width`).toBeGreaterThanOrEqual(MIN_TARGET);
      expect(box?.height, `block ${index} height`).toBeGreaterThanOrEqual(MIN_TARGET);
    }
  });

  test('never covers code text', async ({ page }) => {
    await page.goto('/notes/smoke-es/');
    const blocks = page.locator('.prose .expressive-code');
    expect(await blocks.count()).toBeGreaterThanOrEqual(2);

    for (let index = 0; index < (await blocks.count()); index += 1) {
      const block = blocks.nth(index);
      await block.scrollIntoViewIfNeeded();
      await expect(block.locator('.copy button')).toBeVisible();

      // Every visible glyph of every line (clipped to what the scroll container shows) must sit
      // outside the button box.
      const covered = await block.evaluate((root) => {
        const btn = root.querySelector('.copy button');
        const pre = root.querySelector('pre');
        if (!btn || !pre) return ['missing button or pre'];
        const b = btn.getBoundingClientRect();
        const p = pre.getBoundingClientRect();
        const found: string[] = [];
        for (const line of root.querySelectorAll('.ec-line .code')) {
          const range = document.createRange();
          range.selectNodeContents(line);
          for (const r of range.getClientRects()) {
            const left = Math.max(r.left, p.left);
            const right = Math.min(r.right, p.right);
            const top = Math.max(r.top, p.top);
            const bottom = Math.min(r.bottom, p.bottom);
            if (right <= left || bottom <= top) continue;
            const overlapX = Math.min(right, b.right) - Math.max(left, b.left);
            const overlapY = Math.min(bottom, b.bottom) - Math.max(top, b.top);
            if (overlapX > 1 && overlapY > 1) {
              found.push(
                `"${(line.textContent ?? '').slice(0, 30)}" overlaps by ${overlapX}x${overlapY}`,
              );
              break;
            }
          }
        }
        return found;
      });
      expect(covered, `block ${index}`).toEqual([]);
    }
  });
});

test.describe('mobile navbar auto-hide', () => {
  test.use({ viewport: PHONE, hasTouch: true, isMobile: true });

  /** Makes the page long enough to scroll and hides the navbar the way a reader would. */
  async function scrollNavbarAway(page: Page): Promise<void> {
    await page.evaluate((height) => {
      document.body.style.minHeight = `${height}px`;
    }, TALL_PAGE_PX);
    await page.evaluate((y) => window.scrollTo(0, y), HIDE_SCROLL_PX);
    await expect(page.locator('[data-navbar]')).toHaveClass(/-translate-y-full/);
  }

  test('an open menu closes when the navbar hides', async ({ page }) => {
    await page.goto('/notes/smoke-es/');
    const toggle = page.locator('[data-nav-toggle]');
    const menu = page.locator('#nav-menu');
    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-expanded', 'true');
    await expect(menu).toBeVisible();

    await scrollNavbarAway(page);
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await expect(menu).toBeHidden();
  });

  test('the navbar reveals when focus enters it', async ({ page }) => {
    await page.goto('/notes/smoke-es/');
    await scrollNavbarAway(page);
    await page.locator('[data-nav-toggle]').focus();
    await expect(page.locator('[data-navbar]')).not.toHaveClass(/-translate-y-full/);
    // Fully on screen once the 300 ms slide ends: no vertical translation left.
    await expect
      .poll(() =>
        page
          .locator('[data-navbar]')
          .evaluate((el) => new DOMMatrix(getComputedStyle(el).transform).m42),
      )
      .toBe(0);
  });

  test('keyboard focus inside the navbar keeps it on screen while scrolling', async ({ page }) => {
    await page.goto('/notes/smoke-es/');
    await page.evaluate((height) => {
      document.body.style.minHeight = `${height}px`;
    }, TALL_PAGE_PX);
    await page.keyboard.press('Tab'); // skip link
    await page.keyboard.press('Tab'); // brand link, inside the navbar
    await expect(page.locator('[data-navbar] :focus-visible')).toHaveCount(1);
    await page.evaluate((y) => window.scrollTo(0, y), HIDE_SCROLL_PX);
    await page.waitForTimeout(300);
    await expect(page.locator('[data-navbar]')).not.toHaveClass(/-translate-y-full/);
  });

  test('scrolling up still reveals the navbar', async ({ page }) => {
    await page.goto('/notes/smoke-es/');
    await scrollNavbarAway(page);
    await page.evaluate(() => window.scrollTo(0, 100));
    await expect(page.locator('[data-navbar]')).not.toHaveClass(/-translate-y-full/);
  });
});

for (const { path, intro } of [
  {
    path: '/contact/',
    intro: '¿Una idea, una oferta o una pregunta? Escríbeme y te respondo por correo.',
  },
  {
    path: '/en/contact/',
    intro: "An idea, an offer or a question? Write to me and I'll reply by email.",
  },
]) {
  test(`${path} shows its introduction once`, async ({ page }) => {
    await page.goto(path);
    const article = page.locator('main article');
    // The page header (shared PageHeader, above the two columns) carries the one introduction.
    await expect(page.locator('main').getByText(intro)).toHaveCount(1);
    await expect(page.locator('main h1 + p')).toHaveText(intro);
    // The only other direct paragraph is the LinkedIn alternative under the form (the noscript
    // fallback is not rendered with scripts on).
    await expect(article.locator(':scope > p')).toHaveCount(1);
    await expect(article.locator(':scope > p a[href*="linkedin.com"]')).toHaveCount(1);
  });
}

test.describe('remaining hit areas on a phone', () => {
  test.use({ viewport: PHONE, hasTouch: true, isMobile: true, deviceScaleFactor: 2 });

  test('reading mode toggle and floating exit button have a 44 px hit area', async ({ page }) => {
    await page.goto('/notes/smoke-es/');
    const toggle = page.locator('[data-reading-toggle]');
    expect(await hasTapArea(toggle)).toBe(true);
    await toggle.click();
    expect(await hasTapArea(page.locator('[data-reading-exit]'))).toBe(true);
  });

  test('the language suggestion link and dismiss button have a 44 px hit area', async ({
    page,
  }) => {
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'languages', { configurable: true, get: () => ['en'] });
    });
    await page.goto('/privacy/');
    await page.evaluate(() => localStorage.removeItem('language-hint-dismissed'));
    await page.reload();
    const hint = page.locator('[data-language-hint="en"]');
    await expect(hint).toBeVisible();
    // Both controls are rounded boxes, so measure the box instead of probing its corners.
    for (const control of [hint.locator('a'), hint.getByRole('button')]) {
      const box = await control.boundingBox();
      expect(box?.width).toBeGreaterThanOrEqual(MIN_TARGET);
      expect(box?.height).toBeGreaterThanOrEqual(MIN_TARGET);
    }
  });
});
