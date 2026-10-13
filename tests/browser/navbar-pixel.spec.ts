import { expect, type Locator, type Page, test } from '@playwright/test';

import { describeViolations, scan } from './helpers/axe';
import { has, seedTheme } from './helpers/features';
import { themes } from './helpers/site';
import { stubThirdParties } from './helpers/third-party';

/**
 * The navbar speaks the pixel dialect of the rest of the site: a notched stepped fill on a pseudo-element
 * layer for hover and focus, a square 2 px primary ring, a 1 px stepped press and glyph icons drawn on a
 * 10-unit grid (odd/tasks/navbar-pixel-identity.md).
 */
const BAR_HEIGHT = 72;
const MIN_TARGET = 44;
const DESKTOP = { width: 1280, height: 800 };
const PHONE = { width: 390, height: 800 };

/**
 * Boxes recorded from the build before the pixel pass (owner config, default features): the pass must not
 * move anything. Per viewport: the brand link and each icon control as [x, width]; every height is 44.
 */
const RECORDED = {
  1280: { brand: [68, 144], language: [1072, 44], theme: [1120, 44], picker: [1168, 44] },
  820: { brand: [28, 144], language: [660, 44], theme: [704, 44], picker: [748, 44] },
  390: {
    brand: [24, 144],
    language: [178, 44],
    theme: [226, 44],
    picker: [274, 44],
    menu: [322, 44],
  },
} as const;

test.beforeEach(async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium-1280', 'each test sets its own viewport');
  await stubThirdParties(page);
});

type Setup = {
  theme?: string;
  reducedMotion?: 'reduce' | 'no-preference';
  viewport?: { width: number; height: number };
  touch?: boolean;
};

async function open(
  browser: import('@playwright/test').Browser,
  {
    theme = themes.dark,
    reducedMotion = 'no-preference',
    viewport = DESKTOP,
    touch = false,
  }: Setup = {},
): Promise<{ page: Page; close: () => Promise<void> }> {
  const context = await browser.newContext({
    viewport,
    reducedMotion,
    hasTouch: touch,
    isMobile: touch,
    colorScheme: theme === themes.dark ? 'dark' : 'light',
  });
  const page = await context.newPage();
  await stubThirdParties(page);
  await seedTheme(page, theme);
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
  return { page, close: () => context.close() };
}

const BAR = '[data-navbar] nav';
const DESKTOP_CONTROLS = {
  brand: `${BAR} > a:first-child`,
  link: `${BAR} ul:not(#nav-menu) a[href]`,
  language: `${BAR} > a[hreflang]`,
  theme: '[data-theme-toggle]',
  picker: '[data-background-toggle]',
} as const;

const HAS_THEME = has({ flags: ['themeToggle'] });
const HAS_PICKER = has({ flags: ['backgroundPicker'] });

/** The controls of the desktop bar this profile renders (an adopter can turn the theme button and the picker off). */
const LIVE_CONTROLS = Object.entries(DESKTOP_CONTROLS).filter(
  ([name]) => (name !== 'theme' || HAS_THEME) && (name !== 'picker' || HAS_PICKER),
);
/** A control that is always there to stand in for the theme button where a check only needs one pixel control. */
const STAND_IN = HAS_THEME ? DESKTOP_CONTROLS.theme : DESKTOP_CONTROLS.language;

type Look = {
  clip: string;
  layerClip: string;
  layerFill: string;
  layerOpacity: number;
  layerContent: string;
  outline: { style: string; width: string; color: string; offset: number; radius: string };
  transform: string;
  transitionSeconds: number;
};

/** What the control itself and its fill layer (`::before`) look like right now. */
const look = (control: Locator): Promise<Look> =>
  control.evaluate((el) => {
    const own = getComputedStyle(el);
    const layer = getComputedStyle(el, '::before');
    return {
      clip: own.clipPath,
      layerClip: layer.clipPath,
      layerFill: layer.backgroundColor,
      layerOpacity: Number(layer.opacity),
      layerContent: layer.content,
      outline: {
        style: own.outlineStyle,
        width: own.outlineWidth,
        color: own.outlineColor,
        offset: Number.parseFloat(own.outlineOffset),
        radius: own.borderTopLeftRadius,
      },
      transform: own.transform,
      transitionSeconds: Number.parseFloat(own.transitionDuration),
    };
  });

/** Computed color of a semantic token, as the browser serializes it for `background-color`. */
const token = (page: Page, name: string): Promise<string> =>
  page.evaluate((variable) => {
    const probe = document.createElement('i');
    probe.style.backgroundColor = `var(${variable})`;
    document.body.append(probe);
    const color = getComputedStyle(probe).backgroundColor;
    probe.remove();
    return color;
  }, name);

/** The six numbers of a computed 2D `matrix(a, b, c, d, e, f)`; the identity for `none`. */
const matrixOf = (transform: string): number[] => {
  if (transform === 'none') return [1, 0, 0, 1, 0, 0];
  return transform
    .replace(/^matrix\(|\)$/g, '')
    .split(',')
    .map(Number);
};
const scaleOf = (transform: string): [number, number] => {
  const m = matrixOf(transform);
  return [m[0] ?? 1, m[3] ?? 1];
};

for (const theme of [themes.dark, themes.light]) {
  test.describe(`control states (${theme})`, () => {
    for (const [name, selector] of LIVE_CONTROLS) {
      test(`${name}: hover draws a notched fill on a layer and never clips the control`, async ({
        browser,
      }) => {
        const { page, close } = await open(browser, { theme });
        const control = page.locator(selector).first();
        await expect(control).toBeVisible();
        const rest = await look(control);
        expect(rest.layerOpacity, 'hidden at rest').toBe(0);
        await control.hover();
        await expect.poll(async () => (await look(control)).layerOpacity).toBe(1);
        const hovered = await look(control);
        expect(hovered.clip, 'the control itself is never clipped').toBe('none');
        expect(hovered.layerClip, 'the fill layer is notched').not.toBe('none');
        expect(hovered.layerClip).toContain('polygon(');
        expect(hovered.layerContent).not.toBe('none');
        expect(hovered.layerFill).toBe(await token(page, '--color-card-hover'));
        await close();
      });

      test(`${name}: keyboard focus shows the fill and a square 2 px primary ring`, async ({
        browser,
      }) => {
        const { page, close } = await open(browser, { theme });
        const control = page.locator(selector).first();
        await page.keyboard.press('Tab');
        await control.focus();
        await expect(control).toBeFocused();
        expect(await control.evaluate((el) => el.matches(':focus-visible'))).toBe(true);
        await expect.poll(async () => (await look(control)).layerOpacity).toBe(1);
        const focused = await look(control);
        expect(focused.clip).toBe('none');
        expect(focused.layerClip).not.toBe('none');
        expect(focused.outline.style).toBe('solid');
        expect(focused.outline.width).toBe('2px');
        expect(focused.outline.offset).toBeGreaterThanOrEqual(0);
        expect(focused.outline.radius).toBe('0px');
        expect(focused.outline.color).toBe(await token(page, '--color-primary'));
        await close();
      });
    }

    test('the phone menu toggle gets the same fill, ring and square corners', async ({
      browser,
    }) => {
      const { page, close } = await open(browser, { theme, viewport: PHONE, touch: true });
      const toggle = page.locator('[data-nav-toggle]');
      await page.keyboard.press('Tab');
      await toggle.focus();
      await expect.poll(async () => (await look(toggle)).layerOpacity).toBe(1);
      const focused = await look(toggle);
      expect(focused.clip).toBe('none');
      expect(focused.layerClip).not.toBe('none');
      expect(focused.outline.width).toBe('2px');
      expect(focused.outline.radius).toBe('0px');
      expect(focused.layerFill).toBe(await token(page, '--color-card-hover'));
      await close();
    });
  });
}

test.describe('press', () => {
  for (const [name, selector] of LIVE_CONTROLS) {
    test(`${name}: pressing nudges 1 px down and never scales`, async ({ browser }) => {
      const { page, close } = await open(browser);
      const control = page.locator(selector).first();
      const box = await control.boundingBox();
      if (!box) throw new Error('control has no box');
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      await page.mouse.down();
      await expect.poll(async () => matrixOf((await look(control)).transform)[5]).toBeCloseTo(1, 1);
      const pressed = await look(control);
      expect(scaleOf(pressed.transform)).toEqual([1, 1]);
      expect(pressed.transform).not.toContain('scale');
      // Release away from the control so the press does not navigate or toggle anything.
      await page.mouse.move(box.x + box.width / 2, 400);
      await page.mouse.up();
      await close();
    });
  }
});

test.describe('reduced motion', () => {
  test('the states stay visible by fill and ring, with no transition', async ({ browser }) => {
    const { page, close } = await open(browser, { reducedMotion: 'reduce' });
    for (const [name, selector] of LIVE_CONTROLS) {
      if (name === 'picker') continue; // hidden under reduced motion: it would promise a change nobody sees
      const control = page.locator(selector).first();
      const rest = await look(control);
      expect(rest.transitionSeconds, `${name} transition`).toBeLessThanOrEqual(0.001);
      await control.hover();
      await expect.poll(async () => (await look(control)).layerOpacity, name).toBe(1);
      expect((await look(control)).layerClip).not.toBe('none');
    }
    await page.keyboard.press('Tab');
    await page.locator(STAND_IN).focus();
    // The reset leaves a 1e-05s transition on every property, so the ring width settles on the next frame.
    await expect.poll(async () => (await look(page.locator(STAND_IN))).outline.width).toBe('2px');
    await close();
  });

  test('with motion allowed the steps are two, about 150 ms', async ({ browser }) => {
    const { page, close } = await open(browser);
    const timing = await page.locator(STAND_IN).evaluate((el) => {
      const own = getComputedStyle(el);
      const layer = getComputedStyle(el, '::before');
      return {
        ownDuration: own.transitionDuration,
        ownEasing: own.transitionTimingFunction,
        layerDuration: layer.transitionDuration,
        layerEasing: layer.transitionTimingFunction,
      };
    });
    for (const duration of [timing.ownDuration, timing.layerDuration]) {
      expect(Number.parseFloat(duration)).toBeCloseTo(0.15, 2);
    }
    // Chromium serializes steps(2, end) as steps(2).
    expect(timing.ownEasing).toContain('steps(2');
    expect(timing.layerEasing).toContain('steps(2');
    await close();
  });
});

/** The glyph hosts this profile renders, and the icons they must hold (theme: 2, picker: 3, menu: one svg). */
const GLYPH_HOSTS = [
  ...(HAS_THEME ? ['[data-theme-toggle]'] : []),
  ...(HAS_PICKER ? ['[data-background-toggle]'] : []),
  '[data-nav-toggle]',
];
const ICON_CONTROLS = GLYPH_HOSTS.filter((host) => host !== '[data-nav-toggle]');

test.describe('pixel glyph icons', () => {
  test('every icon is one crisp filled path on a small grid, sized as before', async ({
    browser,
  }) => {
    const { page, close } = await open(browser, { viewport: PHONE, touch: false });
    // At 390 px with a fine pointer the picker is shown next to the menu toggle.
    const icons = await page.evaluate((hosts) => {
      const out: {
        host: string;
        icon: string;
        paths: number;
        fill: string | null;
        stroke: string | null;
        rendering: string | null;
        ariaHidden: string | null;
        width: number;
        height: number;
        drawn: string;
      }[] = [];
      for (const host of hosts) {
        for (const svg of document.querySelectorAll(`${host} svg`)) {
          const paths = svg.querySelectorAll('path');
          out.push({
            host,
            icon:
              svg.getAttribute('data-icon') ?? [...paths].map((p) => p.dataset['icon']).join('+'),
            paths: paths.length,
            fill: svg.getAttribute('fill'),
            stroke: svg.getAttribute('stroke'),
            rendering: svg.getAttribute('shape-rendering'),
            ariaHidden: svg.getAttribute('aria-hidden'),
            width: Number(svg.getAttribute('width')),
            height: Number(svg.getAttribute('height')),
            drawn: [...paths].map((p) => p.getAttribute('d') ?? '').join(''),
          });
        }
      }
      return out;
    }, GLYPH_HOSTS);
    // theme: dark + light; picker: galaxy + cursor-waves + off; menu: one svg with two paths.
    expect(icons.map((icon) => icon.icon)).toEqual([
      ...(HAS_THEME ? ['dark', 'light'] : []),
      ...(HAS_PICKER ? ['galaxy', 'cursor-waves', 'off'] : []),
      'menu+close',
    ]);
    if (!HAS_THEME) await expect(page.locator('[data-theme-toggle]')).toHaveCount(0);
    if (!HAS_PICKER) await expect(page.locator('[data-background-toggle]')).toHaveCount(0);
    for (const icon of icons) {
      expect(icon.fill, icon.icon).toBe('currentColor');
      expect(icon.stroke, icon.icon).toBeNull();
      expect(icon.rendering, icon.icon).toBe('crispEdges');
      expect(icon.ariaHidden, icon.icon).toBe('true');
      expect([icon.width, icon.height], icon.icon).toEqual([20, 20]);
      expect(icon.paths, icon.icon).toBe(icon.host === '[data-nav-toggle]' ? 2 : 1);
      expect(icon.drawn, `${icon.icon} draws only straight pixel runs`).toMatch(/^[MmHhVvz0-9 ]+$/);
    }
    await close();
  });

  test('the visible icons still render at about 20 px inside 44 px targets', async ({
    browser,
  }) => {
    const { page, close } = await open(browser);
    for (const host of ICON_CONTROLS) {
      const control = page.locator(host);
      const box = await control.boundingBox();
      expect(box?.width).toBe(MIN_TARGET);
      expect(box?.height).toBe(MIN_TARGET);
      const svg = control.locator('svg:not(.hidden)');
      await expect(svg).toHaveCount(1);
      const size = await svg.boundingBox();
      expect(size?.width).toBeCloseTo(20, 0);
      expect(size?.height).toBeCloseTo(20, 0);
    }
    await close();
  });

  test('clicking the theme toggle and the picker still swaps the visible icon', async ({
    browser,
  }) => {
    test.skip(
      ICON_CONTROLS.length === 0,
      'needs features.themeToggle or features.backgroundPicker',
    );
    const { page, close } = await open(browser);
    const visible = (host: string) =>
      page.locator(`${host} svg:not(.hidden)`).evaluate((svg) => svg.getAttribute('data-icon'));
    for (const host of ICON_CONTROLS) {
      const before = await visible(host);
      await page.locator(host).click();
      await expect.poll(() => visible(host)).not.toBe(before);
    }
    await close();
  });

  test('the menu toggle swaps the bars for the X and back, and the menu still behaves', async ({
    browser,
  }) => {
    const { page, close } = await open(browser, { viewport: PHONE, touch: true });
    const toggle = page.locator('[data-nav-toggle]');
    await expect(toggle.locator('[data-icon="menu"]')).toBeVisible();
    await expect(toggle.locator('[data-icon="close"]')).toBeHidden();
    await toggle.click();
    await expect(toggle.locator('[data-icon="close"]')).toBeVisible();
    await expect(toggle.locator('[data-icon="menu"]')).toBeHidden();
    await expect(page.locator('#nav-menu a').first()).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(toggle).toBeFocused();
    await expect(toggle.locator('[data-icon="menu"]')).toBeVisible();
    await close();
  });

  for (const theme of [themes.dark, themes.light]) {
    test(`icons keep 3:1 contrast against the bar in ${theme}`, async ({ browser }) => {
      const { page, close } = await open(browser, { theme });
      const ratio = await page.evaluate((iconHost) => {
        const channel = (value: number): number => {
          const v = value / 255;
          return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
        };
        const rgb = (color: string): [number, number, number, number] => {
          const probe = document
            .createElement('canvas')
            .getContext('2d') as CanvasRenderingContext2D;
          probe.clearRect(0, 0, 1, 1);
          probe.fillStyle = color;
          probe.fillRect(0, 0, 1, 1);
          const d = probe.getImageData(0, 0, 1, 1).data;
          return [d[0] ?? 0, d[1] ?? 0, d[2] ?? 0, (d[3] ?? 255) / 255];
        };
        const luminance = ([r, g, b]: number[]): number =>
          0.2126 * channel(r ?? 0) + 0.7152 * channel(g ?? 0) + 0.0722 * channel(b ?? 0);
        const fg = rgb(getComputedStyle(document.querySelector(iconHost) as Element).color);
        const nav = rgb(
          getComputedStyle(document.querySelector('[data-navbar] nav') as Element).backgroundColor,
        );
        const page = rgb(getComputedStyle(document.body).backgroundColor);
        const alpha = nav[3];
        const bg = [0, 1, 2].map((i) => (nav[i] ?? 0) * alpha + (page[i] ?? 0) * (1 - alpha));
        const [hi, lo] = [luminance(fg), luminance(bg)].sort((a, b) => b - a);
        return ((hi ?? 0) + 0.05) / ((lo ?? 0) + 0.05);
      }, ICON_CONTROLS[0] ?? '[data-nav-toggle]');
      expect(ratio).toBeGreaterThanOrEqual(3);
      await close();
    });
  }
});

test.describe('layout is unchanged', () => {
  for (const [width, recorded] of Object.entries(RECORDED)) {
    test(`at ${width} px the bar is ${BAR_HEIGHT} px and every box sits where it did`, async ({
      browser,
    }) => {
      const phone = Number(width) < 768;
      const { page, close } = await open(browser, {
        viewport: { width: Number(width), height: 800 },
        touch: false,
      });
      expect((await page.locator(BAR).boundingBox())?.height).toBe(BAR_HEIGHT);
      const controls: Record<string, string> = {
        brand: DESKTOP_CONTROLS.brand,
        language: DESKTOP_CONTROLS.language,
        ...(HAS_THEME ? { theme: DESKTOP_CONTROLS.theme } : {}),
        ...(HAS_PICKER ? { picker: DESKTOP_CONTROLS.picker } : {}),
        ...(phone ? { menu: '[data-nav-toggle]' } : {}),
      };
      // The recorded boxes are right-aligned: they hold only with every control present.
      const exact = HAS_THEME && HAS_PICKER;
      for (const [name, selector] of Object.entries(controls)) {
        const box = await page.locator(selector).first().boundingBox();
        expect(box?.height, `${name} height`).toBeGreaterThanOrEqual(MIN_TARGET);
        if (!exact) continue;
        const [x, w] = recorded[name as keyof typeof recorded] as readonly [number, number];
        expect(Math.round(box?.x ?? -1), `${name} x`).toBe(x);
        expect(Math.round(box?.width ?? -1), `${name} width`).toBe(w);
      }
      for (const link of await page.locator(DESKTOP_CONTROLS.link).all()) {
        if (!phone) expect((await link.boundingBox())?.height).toBeGreaterThanOrEqual(MIN_TARGET);
      }
      await close();
    });
  }

  for (const width of [320, 360, 390, 768]) {
    test(`no horizontal overflow at ${width} px`, async ({ browser }) => {
      const { page, close } = await open(browser, { viewport: { width, height: 800 } });
      const sizes = await page.evaluate(() => ({
        scroll: document.documentElement.scrollWidth,
        inner: window.innerWidth,
      }));
      expect(sizes.scroll).toBeLessThanOrEqual(sizes.inner);
      await close();
    });
  }
});

for (const theme of [themes.dark, themes.light]) {
  test(`axe is clean with the menu closed and open (${theme})`, async ({ browser }) => {
    const { page, close } = await open(browser, { theme, viewport: PHONE, touch: true });
    const closed = await scan(page);
    expect(describeViolations(closed.violations)).toEqual([]);
    await page.locator('[data-nav-toggle]').click();
    await expect(page.locator('#nav-menu')).toBeVisible();
    const opened = await scan(page);
    expect(describeViolations(opened.violations)).toEqual([]);
    await close();
  });
}
