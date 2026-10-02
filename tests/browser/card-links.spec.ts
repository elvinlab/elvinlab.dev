import { expect, type Locator, type Page, test } from '@playwright/test';

/** Keyboard Tab presses allowed to reach a card before the test gives up. */
const MAX_TABS = 80;
/** Distance from the card's top-left corner for the "empty padding" click. */
const CORNER_INSET = 4;
const FOCUS_RING_WIDTH = '2px';
const FOCUS_RING_STYLE = 'solid';

type Card = {
  name: string;
  path: string;
  /** The whole card: the element that must act as one link. */
  locate: (page: Page) => Locator;
  /** Parts of the card away from its title that a click must still treat as the link. */
  clickTargets: (card: Locator) => Record<string, Locator>;
};

const CARDS: Card[] = [
  {
    name: 'notes index row',
    path: '/notes/',
    locate: (page) => page.locator('[data-note-row]').first(),
    clickTargets: (card) => ({ description: card.locator('p').first() }),
  },
  {
    name: 'home latest note card',
    path: '/',
    locate: (page) =>
      page.locator('section', { has: page.locator('h2 a[href^="/notes/smoke-"]') }).first(),
    clickTargets: (card) => ({
      'decision record': card.locator('section').first(),
      'button row': card.locator(':scope > div').last(),
    }),
  },
];

const centerOf = async (target: Locator): Promise<{ x: number; y: number }> => {
  await target.evaluate((element) => element.scrollIntoView({ block: 'center' }));
  const box = await target.boundingBox();
  if (!box) throw new Error('target has no layout box');
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
};

/** Opens the page and waits for web fonts, so no late swap moves the card between measuring and clicking. */
const open = async (page: Page, path: string): Promise<void> => {
  await page.goto(path);
  await page.evaluate(async () => {
    await document.fonts.ready;
  });
};

const titleLinkOf = (card: Locator): Locator => card.locator('h2 a, h3 a').first();

for (const card of CARDS) {
  test.describe(card.name, () => {
    test('clicking anywhere on the card, away from the title, opens the note', async ({ page }) => {
      await open(page, card.path);
      const root = card.locate(page);
      const href = await titleLinkOf(root).getAttribute('href');
      if (!href) throw new Error('title link has no href');

      const targets = card.clickTargets(root);
      for (const [name, target] of Object.entries(targets)) {
        await open(page, card.path);
        const point = await centerOf(target);
        await Promise.all([page.waitForURL(`**${href}`), page.mouse.click(point.x, point.y)]);
        expect(new URL(page.url()).pathname, `click on the ${name}`).toBe(href);
      }

      // The card edge (top-left corner, no text) is part of the link as well.
      await open(page, card.path);
      await root.evaluate((element) => element.scrollIntoView({ block: 'center' }));
      const box = await root.boundingBox();
      if (!box) throw new Error('card has no layout box');
      await Promise.all([
        page.waitForURL(`**${href}`),
        page.mouse.click(box.x + CORNER_INSET, box.y + CORNER_INSET),
      ]);
      expect(new URL(page.url()).pathname, 'click on the card corner').toBe(href);
    });

    test('exposes exactly one link, and no other control, to assistive technology', async ({
      page,
    }) => {
      await open(page, card.path);
      const root = card.locate(page);
      const href = await titleLinkOf(root).getAttribute('href');
      const exposedLinks = root.locator('a[href]:not([aria-hidden="true"])');
      await expect(exposedLinks).toHaveCount(1);
      await expect(root.locator(`a[href="${href}"]:not([aria-hidden="true"])`)).toHaveCount(1);
      await expect(
        root.locator('button, [role="link"], [tabindex]:not([tabindex="-1"])'),
      ).toHaveCount(0);
    });

    test('the first Tab stop inside the card is the title link and rings the whole card', async ({
      page,
    }) => {
      await open(page, card.path);
      const root = card.locate(page);
      const title = titleLinkOf(root);

      let reached = false;
      for (let presses = 0; presses < MAX_TABS && !reached; presses += 1) {
        await page.keyboard.press('Tab');
        reached = await root.evaluate((element) => element.contains(document.activeElement));
      }
      expect(reached, 'Tab reaches the card').toBe(true);
      await expect(title).toBeFocused();

      const ring = await root.evaluate((element) => {
        const style = getComputedStyle(element);
        return { width: style.outlineWidth, style: style.outlineStyle };
      });
      expect(ring).toEqual({ width: FOCUS_RING_WIDTH, style: FOCUS_RING_STYLE });

      // One ring, on the card: the title text does not draw a second one inside it.
      expect(await title.evaluate((element) => getComputedStyle(element).outlineStyle)).toBe(
        'none',
      );
    });
  });
}
