import { expect, type Locator, type Page, test } from '@playwright/test';

import { describeViolations, scan } from './helpers/axe';
import { stubThirdParties } from './helpers/third-party';

/**
 * The footprint button of a note. The fixture build has no D1 binding, so the Actions are mocked
 * with `page.route`, answering the way Astro does: a devalue body on success, an action error
 * body with the HTTP status otherwise.
 */
const NOTES = [
  {
    path: '/notes/smoke-es/',
    slug: 'smoke-es',
    button: 'Dejé mi huella',
    many: (n: number) => `${n} huellas`,
    hint: 'Sé de los primeros en dejar tu huella',
    cap: 'Ya dejaste todas las huellas que caben aquí. ¡Gracias!',
    invite: '¿Te gustó? Deja tu huella',
  },
  {
    path: '/en/notes/smoke-en/',
    slug: 'smoke-en',
    button: 'I was here',
    many: (n: number) => `${n} marks`,
    hint: 'Be among the first to leave your mark',
    cap: 'You have left all the marks that fit here. Thank you!',
    invite: 'Enjoyed it? Leave your mark',
  },
] as const;

const LONG_TITLE =
  'Cómo reconstruí mi sitio personal desde cero con Astro, Preact y Workers en 2026';

const header = (page: Page) => page.locator('[data-marks][data-v="h"]');
const end = (page: Page) => page.locator('[data-marks][data-v="e"]');
const headerButton = (page: Page) => header(page).locator('.mb');
const endButton = (page: Page) => end(page).locator('.mb');

type MockOptions = {
  total?: number;
  getStatus?: number;
  getDelay?: number;
  leaveTotal?: number;
  /** Holds the answer to `leave` until released. */
  gate?: Promise<void>;
};

async function mockMarks(page: Page, options: MockOptions = {}) {
  const leaves: { slug: string; by: number }[] = [];
  const status = options.getStatus ?? 200;
  await page.route(
    (url) => url.pathname.includes('/_actions/marks.get/'),
    async (route) => {
      if (options.getDelay) await new Promise((r) => setTimeout(r, options.getDelay));
      if (status !== 200) {
        await route.fulfill({
          status,
          contentType: 'application/json',
          body: JSON.stringify({ type: 'AstroActionError', code: 'SERVICE_UNAVAILABLE' }),
        });
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json+devalue',
        body: JSON.stringify([{ total: 1 }, options.total ?? 12]),
      });
    },
  );
  await page.route(
    (url) => url.pathname.includes('/_actions/marks.leave/'),
    async (route) => {
      leaves.push(route.request().postDataJSON());
      await options.gate;
      await route.fulfill({
        status: 200,
        contentType: 'application/json+devalue',
        body: JSON.stringify([{ total: 1 }, options.leaveTotal ?? 100]),
      });
    },
  );
  return { leaves };
}

/** Hydrates the end instance (it waits until it is visible) and returns to the top. */
async function revealEnd(page: Page): Promise<void> {
  await end(page).scrollIntoViewIfNeeded();
  await expect(endButton(page)).toBeVisible();
  await page.evaluate(() => window.scrollTo(0, 0));
}

test.beforeEach(async ({ page }) => {
  await stubThirdParties(page);
});

// Height per project width, plus a common phone size on the narrowest project.
const SIZES = [
  { width: 360, height: 640 },
  { width: 390, height: 844, project: 'chromium-360' },
  { width: 768, height: 1024 },
  { width: 1280, height: 800 },
];

for (const note of NOTES) {
  for (const size of SIZES) {
    for (const [titleName, title] of [
      ['its own title', null],
      ['an 80 character title', LONG_TITLE],
    ] as const) {
      test(`${note.slug}: the header button is on the first screen at ${size.width}x${size.height} with ${titleName}`, async ({
        page,
      }, testInfo) => {
        const own = testInfo.project.use.viewport?.width === size.width;
        test.skip(!own && testInfo.project.name !== size.project, 'one size per project');
        await mockMarks(page);
        await page.setViewportSize({ width: size.width, height: size.height });
        await page.goto(note.path);
        await expect(headerButton(page)).toBeVisible();
        if (title) {
          expect(title).toHaveLength(80);
          await page.locator('h1').evaluate((el, text) => {
            el.textContent = text;
          }, title);
        }
        const box = await headerButton(page).boundingBox();
        if (!box) throw new Error('the header button has no box');
        // Bottom edge against the viewport height, with the page not scrolled.
        expect(await page.evaluate(() => window.scrollY)).toBe(0);
        expect(box.y).toBeGreaterThanOrEqual(0);
        expect(box.y + box.height).toBeLessThanOrEqual(size.height);
        await expect(headerButton(page)).toBeInViewport({ ratio: 1 });
        await expect(end(page)).toBeAttached();
      });
    }
  }
}

for (const note of NOTES) {
  test.describe(note.path, () => {
    test('shows the count from five footprints on', async ({ page }) => {
      await mockMarks(page, { total: 12 });
      await page.goto(note.path);
      await expect(header(page).locator('.mn')).toHaveText(note.many(12));
      await expect(headerButton(page)).toHaveAccessibleName(`${note.button}, ${note.many(12)}`);
    });

    test('invites to be among the first below the threshold', async ({ page }) => {
      await mockMarks(page, { total: 3 });
      await page.goto(note.path);
      await expect(header(page).locator('.mn')).toHaveText(note.hint);
    });

    test('the end of the article carries its own invitation', async ({ page }) => {
      await mockMarks(page, { total: 12 });
      await page.goto(note.path);
      await revealEnd(page);
      await expect(end(page).locator('.mv')).toHaveText(note.invite);
      await expect(page.locator('[data-article]')).toContainText(note.invite);
    });

    test('a burst of seven taps sends one request and both buttons stay in sync', async ({
      page,
    }) => {
      let release: () => void = () => {};
      const gate = new Promise<void>((resolve) => (release = resolve));
      const { leaves } = await mockMarks(page, { total: 12, leaveTotal: 25, gate });
      await page.goto(note.path);
      await revealEnd(page);
      for (let i = 0; i < 7; i++) await headerButton(page).click();
      // Optimistic, instantly on both buttons.
      await expect(header(page).locator('.mn')).toHaveText(note.many(19));
      await expect(end(page).locator('.mn')).toHaveText(note.many(19));
      await expect.poll(() => leaves.length, { timeout: 5000 }).toBe(1);
      expect(leaves[0]).toEqual({ slug: note.slug, by: 7 });
      release();
      // The server answer wins: another visitor tapped meanwhile.
      await expect(header(page).locator('.mn')).toHaveText(note.many(25));
      await expect(end(page).locator('.mn')).toHaveText(note.many(25));
      await page.waitForTimeout(1000);
      expect(leaves).toHaveLength(1);
      await expect(header(page).locator('[role="status"]')).toContainText(note.many(25));
    });

    test('taps from the end button count too', async ({ page }) => {
      const { leaves } = await mockMarks(page, { total: 12, leaveTotal: 14 });
      await page.goto(note.path);
      await revealEnd(page);
      await endButton(page).click();
      await endButton(page).click();
      await expect(header(page).locator('.mn')).toHaveText(note.many(14));
      await expect.poll(() => leaves.length).toBe(1);
      expect(leaves[0]).toEqual({ slug: note.slug, by: 2 });
    });

    test('at the cap a tap sends nothing and the label says so', async ({ page }) => {
      await page.addInitScript((key) => localStorage.setItem(key, '50'), `marks:${note.slug}`);
      const { leaves } = await mockMarks(page, { total: 12 });
      await page.goto(note.path);
      await expect(headerButton(page)).toContainText(note.cap);
      await headerButton(page).click();
      await headerButton(page).click();
      await page.waitForTimeout(1200);
      expect(leaves).toHaveLength(0);
      await expect(header(page).locator('.mn')).toHaveText(note.many(12));
    });

    test('the first visit gets a nudge, a returning visitor does not', async ({ page }) => {
      await mockMarks(page, { total: 12 });
      await page.goto(note.path);
      await expect(headerButton(page)).toBeVisible();
      await expect(header(page)).toHaveAttribute('data-n', '');
      await headerButton(page).click();
      await expect(header(page)).not.toHaveAttribute('data-n', '');

      await page.addInitScript((key) => localStorage.setItem(key, '2'), `marks:${note.slug}`);
      await page.reload();
      await expect(headerButton(page)).toBeVisible();
      await expect(header(page)).not.toHaveAttribute('data-n', '');
    });

    test('an unavailable store leaves no marks UI and shifts nothing beyond the reserved box', async ({
      page,
    }) => {
      await mockMarks(page, { getStatus: 503, getDelay: 400 });
      await page.goto(note.path);
      await expect(header(page)).toBeAttached();
      const before = (await page.locator('[data-article]').boundingBox())?.y ?? 0;
      await expect(page.locator('[data-marks]')).toHaveCount(0);
      const after = (await page.locator('[data-article]').boundingBox())?.y ?? 0;
      // The reserved box is 44 px plus its margin.
      expect(before - after).toBeGreaterThanOrEqual(0);
      expect(before - after).toBeLessThanOrEqual(44 + 16);
      await expect(page.locator('.mb')).toHaveCount(0);
      await expect(page.getByText(note.hint)).toHaveCount(0);
    });

    test('both buttons are at least 44 by 44 pixels', async ({ page }) => {
      await mockMarks(page, { total: 12 });
      await page.goto(note.path);
      await revealEnd(page);
      for (const button of [headerButton(page), endButton(page)]) {
        const box = await button.boundingBox();
        expect(box?.width).toBeGreaterThanOrEqual(44);
        expect(box?.height).toBeGreaterThanOrEqual(44);
      }
    });
  });
}

test.describe('motion', () => {
  const stampAnimation = (page: Page) =>
    headerButton(page)
      .locator('.mi.go')
      .evaluate((el) => getComputedStyle(el).animationName);

  test('the stamp is off under reduced motion', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await mockMarks(page);
    await page.goto('/notes/smoke-es/');
    await headerButton(page).click();
    expect(await stampAnimation(page)).toBe('none');
    // The state change still works.
    await expect(header(page).locator('.mn')).toHaveText('13 huellas');
  });

  test('the stamp plays when motion is allowed', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await mockMarks(page);
    await page.goto('/notes/smoke-es/');
    await headerButton(page).click();
    expect(await stampAnimation(page)).toBe('marks-stamp');
    await expect(headerButton(page).locator('.mr')).toHaveCount(1);
  });
});

for (const theme of ['elvinlab-dark', 'elvinlab-light']) {
  test(`the note with the footprint buttons has no axe violations (${theme})`, async ({ page }) => {
    await page.addInitScript((t) => localStorage.setItem('theme', t), theme);
    await mockMarks(page, { total: 12 });
    await page.goto('/notes/smoke-es/');
    await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
    await revealEnd(page);
    await expect(headerButton(page)).toBeVisible();
    const { violations } = await scan(page);
    expect(describeViolations(violations)).toEqual([]);
  });
}

const PRIVACY_TIPS = [
  {
    path: '/notes/smoke-es/',
    text: 'Anónimo: no guardamos tu IP ni datos tuyos.',
    href: '/privacy/#marks',
  },
  {
    path: '/en/notes/smoke-en/',
    text: 'Anonymous: your IP and personal data are not stored.',
    href: '/en/privacy/#marks',
  },
] as const;

const tooltipOf = (instance: Locator) => instance.locator('[role="tooltip"]');

for (const tip of PRIVACY_TIPS) {
  test.describe(`${tip.path} privacy tooltip`, () => {
    test('is hidden until the button is hovered or focused', async ({ page }) => {
      await mockMarks(page, { total: 12 });
      await page.goto(tip.path);
      await expect(headerButton(page)).toBeVisible();
      await expect(tooltipOf(header(page))).toBeHidden();
      await revealEnd(page);
      await expect(tooltipOf(end(page))).toBeHidden();
    });

    for (const [name, instance, button] of [
      ['header', header, headerButton],
      ['end', end, endButton],
    ] as const) {
      test(`the ${name} button shows it on hover with the privacy link`, async ({ page }) => {
        await mockMarks(page, { total: 12 });
        await page.goto(tip.path);
        await revealEnd(page);
        await button(page).scrollIntoViewIfNeeded();
        await button(page).hover();
        const bubble = tooltipOf(instance(page));
        await expect(bubble).toBeVisible();
        await expect(bubble).toContainText(tip.text);
        await expect(bubble.getByRole('link')).toHaveAttribute('href', tip.href);
        const id = await bubble.getAttribute('id');
        expect(id).toBeTruthy();
        await expect(button(page)).toHaveAttribute('aria-describedby', id ?? '');
      });

      test(`the ${name} button shows it on keyboard focus and the link is reachable`, async ({
        page,
      }) => {
        await mockMarks(page, { total: 12 });
        await page.goto(tip.path);
        await revealEnd(page);
        await button(page).scrollIntoViewIfNeeded();
        await button(page).focus();
        const bubble = tooltipOf(instance(page));
        await expect(bubble).toBeVisible();
        await page.keyboard.press('Tab');
        await expect(bubble.getByRole('link')).toBeFocused();
        await expect(bubble).toBeVisible();
      });

      test(`the ${name} tooltip is on top, not clipped, and adds no horizontal scroll`, async ({
        page,
      }) => {
        await mockMarks(page, { total: 12 });
        await page.goto(tip.path);
        await revealEnd(page);
        await button(page).scrollIntoViewIfNeeded();
        await button(page).hover();
        const bubble = tooltipOf(instance(page));
        await expect(bubble).toBeVisible();
        const result = await bubble.evaluate((el) => {
          const box = el.getBoundingClientRect();
          const x = Math.min(Math.max(box.left + box.width / 2, 1), innerWidth - 1);
          const y = Math.min(Math.max(box.top + box.height / 2, 1), innerHeight - 1);
          const top = document.elementFromPoint(x, y);
          return {
            onTop: !!top && (top === el || el.contains(top)),
            insideViewport: box.left >= 0 && box.right <= innerWidth,
            overflowX: document.documentElement.scrollWidth > document.documentElement.clientWidth,
          };
        });
        expect(result).toEqual({ onTop: true, insideViewport: true, overflowX: false });
      });
    }
  });
}

for (const theme of ['elvinlab-dark', 'elvinlab-light']) {
  test(`the open privacy tooltip has no axe violations (${theme})`, async ({ page }) => {
    await page.addInitScript((t) => localStorage.setItem('theme', t), theme);
    await mockMarks(page, { total: 12 });
    await page.goto('/notes/smoke-es/');
    await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
    await headerButton(page).hover();
    await expect(tooltipOf(header(page))).toBeVisible();
    const { violations } = await scan(page);
    expect(describeViolations(violations)).toEqual([]);
  });
}

test.describe('privacy tooltip dismissal', () => {
  test('a mouse click leaves the button focused but the tooltip closes once the pointer leaves', async ({
    page,
  }) => {
    await mockMarks(page, { total: 12 });
    await page.goto('/notes/smoke-es/');
    await headerButton(page).click();
    await expect(tooltipOf(header(page))).toBeVisible();
    await page.mouse.move(0, 0);
    await expect(headerButton(page)).toBeFocused();
    await expect(tooltipOf(header(page))).toBeHidden();
  });

  test('Escape dismisses it and it comes back on the next hover', async ({ page }) => {
    await mockMarks(page, { total: 12 });
    await page.goto('/notes/smoke-es/');
    await headerButton(page).hover();
    await expect(tooltipOf(header(page))).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(tooltipOf(header(page))).toBeHidden();
    await page.mouse.move(0, 0);
    await headerButton(page).hover();
    await expect(tooltipOf(header(page))).toBeVisible();
  });

  test.describe('on a touch screen', () => {
    test.use({ hasTouch: true, isMobile: true });

    test('it shows after a tap and goes away by itself', async ({ page }) => {
      await page.clock.install();
      await mockMarks(page, { total: 12 });
      await page.goto('/notes/smoke-es/');
      await expect(headerButton(page)).toBeVisible();
      await headerButton(page).tap();
      await expect(tooltipOf(header(page))).toBeVisible();
      await page.clock.fastForward(5000);
      await expect(tooltipOf(header(page))).toBeHidden();
    });

    test('it is not shown just because the finger touched the button earlier', async ({ page }) => {
      await page.clock.install();
      await mockMarks(page, { total: 12 });
      await page.goto('/notes/smoke-es/');
      await headerButton(page).tap();
      await page.clock.fastForward(5000);
      await expect(tooltipOf(header(page))).toBeHidden();
      await page.clock.fastForward(60_000);
      await expect(tooltipOf(header(page))).toBeHidden();
    });
  });
});
