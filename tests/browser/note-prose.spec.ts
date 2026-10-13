import { expect, type Page, test } from '@playwright/test';

import { has, requires } from './helpers/features';

requires({ routes: ['notes'] });

/** Automatic notebook treatment of note prose (DESIGN.md, "Notebook ink system"), against the fixture notes. */

test.beforeEach(({ browserName: _browserName }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium-1280', 'each test sets its own viewport');
});

const ES = '/notes/smoke-es/';
const EN = '/en/notes/smoke-en/';

const THEMES = ['elvinlab-dark', 'elvinlab-light'] as const;

const setTheme = (page: Page, theme: (typeof THEMES)[number]) =>
  page.evaluate((value) => {
    document.documentElement.dataset['theme'] = value;
  }, theme);

const style = (page: Page, selector: string, property: string) =>
  page.evaluate(
    ([sel, prop]) =>
      getComputedStyle(document.querySelector(sel as string) as Element).getPropertyValue(
        prop as string,
      ),
    [selector, property],
  );

test('every h2 carries a section counter that matches the table of contents', async ({ page }) => {
  await page.goto(ES);
  const headings = await page.locator('.prose h2').count();
  const tocEntries = await page.locator('[data-toc-link]').count();
  expect(headings).toBeGreaterThanOrEqual(3);
  expect(headings).toBe(tocEntries);

  // Computed `content` keeps the counter() expression (the number is only painted), so the match is
  // proven by the same heading ids in the same order, each one incrementing the shared counter.
  const info = await page.evaluate(() => ({
    ids: [...document.querySelectorAll('.prose h2')].map((h) => h.id),
    increments: [...document.querySelectorAll('.prose h2')].map(
      (h) => getComputedStyle(h).counterIncrement,
    ),
    content: getComputedStyle(document.querySelector('.prose h2') as Element, '::before').content,
    reset: getComputedStyle(document.querySelector('.prose') as Element).counterReset,
  }));
  const tocIds = await page
    .locator('[data-toc-link]')
    .evaluateAll((links) => links.map((l) => l.getAttribute('data-toc-link')));
  expect(info.ids).toEqual(tocIds);
  expect(info.reset).toContain('note-section');
  expect(info.increments.every((value) => value.includes('note-section'))).toBe(true);
  expect(info.content).toContain('decimal-leading-zero');
  // The heading text and its anchor id are untouched by the counter.
  await expect(page.locator('.prose h2').first()).toHaveText('Fixture section');
});

test('the counter is not part of the heading accessible name', async ({ page }) => {
  await page.goto(ES);
  const pseudo = await page.evaluate(
    () => getComputedStyle(document.querySelector('.prose h2') as Element, '::before').content,
  );
  // Alternative text after the slash is empty, so assistive technology skips the number.
  expect(pseudo).toMatch(/\/\s*""$/);
});

test('the counter hangs in the margin on wide screens and sits above the heading on phones', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(ES);
  const wide = await page.evaluate(() => {
    const h2 = document.querySelector('.prose h2') as HTMLElement;
    const before = getComputedStyle(h2, '::before');
    const prose = document.querySelector('.prose') as HTMLElement;
    return {
      position: before.position,
      h2Left: h2.getBoundingClientRect().left,
      proseLeft: prose.getBoundingClientRect().left,
    };
  });
  expect(wide.position).toBe('absolute');
  expect(wide.h2Left).toBeCloseTo(wide.proseLeft, 0);

  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto(ES);
  const narrow = await page.evaluate(() => {
    const before = getComputedStyle(document.querySelector('.prose h2') as Element, '::before');
    return {
      position: before.position,
      display: before.display,
      overflow: document.documentElement.scrollWidth <= window.innerWidth,
    };
  });
  expect(narrow.position).toBe('static');
  expect(narrow.display).toBe('block');
  expect(narrow.overflow).toBe(true);
});

for (const theme of THEMES) {
  test(`strong gets a per-line marker band in ${theme}`, async ({ page }) => {
    await page.goto(ES);
    await setTheme(page, theme);
    await expect.poll(() => style(page, '.prose strong', 'box-shadow')).not.toBe('none');
    expect(await style(page, '.prose strong', 'box-decoration-break')).toBe('clone');
  });

  test(`prose links draw an ink underline in ${theme}`, async ({ page }) => {
    await page.goto(ES);
    await setTheme(page, theme);
    const link = '.prose p a[href="https://example.net/prose"]';
    await expect.poll(() => style(page, link, 'background-image')).toContain('url(');
    expect(await style(page, link, 'text-decoration-line')).toBe('none');
  });

  test(`markdown del gets the ink strike in ${theme}`, async ({ page }) => {
    await page.goto(ES);
    await setTheme(page, theme);
    await expect
      .poll(() => style(page, '.prose del:not(.fix-wrong)', 'background-image'))
      .toContain('url(');
  });
}

test('the stroke colors differ per theme', async ({ page }) => {
  await page.goto(ES);
  const link = '.prose p a[href="https://example.net/prose"]';
  await setTheme(page, 'elvinlab-dark');
  await expect.poll(() => style(page, link, 'background-image')).toContain('%23ec4899');
  await setTheme(page, 'elvinlab-light');
  await expect.poll(() => style(page, link, 'background-image')).toContain('%23be185d');
});

test('the Fix component is not styled twice', async ({ page }) => {
  await page.goto(ES);
  const fix = await page.evaluate(() => {
    const del = document.querySelector('.fix .fix-wrong') as HTMLElement;
    const ins = document.querySelector('.fix .fix-right') as HTMLElement;
    return {
      delSize: getComputedStyle(del).backgroundSize,
      delPosition: getComputedStyle(del).backgroundPosition,
      insDisplay: getComputedStyle(ins).display,
      insTransform: getComputedStyle(ins).transform,
    };
  });
  // Fix keeps its own geometry: 0.5em strike at 58%, ins as a rotated inline-block.
  expect(fix.delPosition).toMatch(/^(0%|0px) 58%$/);
  expect(fix.insDisplay).toBe('inline-block');
  expect(fix.insTransform).not.toBe('none');
  // The markdown del uses the same stroke but is not a Fix.
  const md = await style(page, '.prose del:not(.fix-wrong)', 'color');
  const fixColor = await style(page, '.fix-wrong', 'color');
  expect(md).toBe(fixColor);
});

test('the blockquote keeps a pink margin bar drawn as a hand stroke', async ({ page }) => {
  await page.goto(ES);
  const quote = await page.evaluate(() => {
    const el = document.querySelector('.prose blockquote') as HTMLElement;
    const before = getComputedStyle(el, '::before');
    return {
      border: getComputedStyle(el).borderLeftWidth,
      mask: before.maskImage || before.getPropertyValue('-webkit-mask-image'),
      background: before.backgroundColor,
      position: before.position,
    };
  });
  expect(quote.border).toBe('0px');
  expect(quote.mask).toContain('url(');
  expect(quote.position).toBe('absolute');
  expect(quote.background).not.toBe('rgba(0, 0, 0, 0)');
});

test('the hr is a centered hand-drawn line', async ({ page }) => {
  await page.goto(ES);
  const hr = await page.evaluate(() => {
    const el = document.querySelector('.prose hr') as HTMLElement;
    const s = getComputedStyle(el);
    return {
      mask: s.maskImage || s.getPropertyValue('-webkit-mask-image'),
      marginLeft: s.marginLeft,
      marginRight: s.marginRight,
      top: s.borderTopWidth,
      marginTop: parseFloat(s.marginTop),
    };
  });
  expect(hr.mask).toContain('url(');
  expect(hr.top).toBe('0px');
  expect(hr.marginLeft).toBe(hr.marginRight);
  expect(hr.marginTop).toBeGreaterThanOrEqual(24);
});

test('a wrapped strong paints its band on every line and nothing overflows at 360 px', async ({
  page,
}) => {
  await page.setViewportSize({ width: 360, height: 800 });
  for (const path of [ES, EN]) {
    await page.goto(path);
    const info = await page.evaluate(() => ({
      lines: (document.querySelector('.prose strong') as HTMLElement).getClientRects().length,
      scrollWidth: document.documentElement.scrollWidth,
      innerWidth: window.innerWidth,
    }));
    expect(info.lines).toBeGreaterThan(1);
    expect(info.scrollWidth).toBeLessThanOrEqual(info.innerWidth);
  }
});

test('the English note gets the same treatment', async ({ page }) => {
  await page.goto(EN);
  expect(await page.locator('.prose h2').count()).toBe(
    await page.locator('[data-toc-link]').count(),
  );
  await expect.poll(() => style(page, '.prose strong', 'box-shadow')).not.toBe('none');
});

test('under reduced motion the link underline is static and nothing animates', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(ES);
  const link = page.locator('.prose p a[href="https://example.net/prose"]');
  await link.hover();
  const state = await link.evaluate((el) => ({
    animation: getComputedStyle(el).animationName,
    size: getComputedStyle(el).backgroundSize,
    running: document.documentElement
      .getAnimations({ subtree: true })
      .filter(
        (a) =>
          a.playState === 'running' &&
          (a.effect as KeyframeEffect | null)?.target?.closest('.prose'),
      ).length,
  }));
  expect(state.animation).toBe('none');
  expect(state.size).toMatch(/^100%/);
  expect(state.running).toBe(0);
});

test('with motion allowed the link underline grows on hover', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto(ES);
  const link = page.locator('.prose p a[href="https://example.net/prose"]');
  await expect.poll(() => link.evaluate((el) => getComputedStyle(el).animationName)).toBe('none');
  await link.hover();
  await expect
    .poll(() => link.evaluate((el) => getComputedStyle(el).animationName))
    .toMatch(/prose-underline/);
});

test('reading mode keeps the counter inline and the ornaments quiet', async ({ page }) => {
  test.skip(!has({ flags: ['readingMode'] }), 'needs features.readingMode');
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.addInitScript(() => {
    try {
      localStorage.setItem('reading-mode', '1');
    } catch {
      // storage unavailable
    }
  });
  await page.goto(ES);
  await page.evaluate(() => document.documentElement.setAttribute('data-reading', ''));
  const reading = await page.evaluate(() => {
    const before = getComputedStyle(document.querySelector('.prose h2') as Element, '::before');
    return {
      position: before.position,
      overflow: document.documentElement.scrollWidth <= window.innerWidth,
    };
  });
  expect(reading.position).toBe('static');
  expect(reading.overflow).toBe(true);
});
