import { expect, type Page, test } from '@playwright/test';

import { describeViolations, scan } from './helpers/axe';
import { stubThirdParties } from './helpers/third-party';

/**
 * The email subscription: the form in the global footer band and the two landing pages of the emailed links.
 * The fixture build has the flag on and a Turnstile key but no Cloudflare bindings, so the Actions
 * are mocked with `page.route` (answering the way Astro does) and the Turnstile script is a stub.
 *  */
const TURNSTILE_URL = 'https://challenges.cloudflare.com/turnstile/v0/api.js*';
const TURNSTILE_STUB = `
  window.turnstile = {
    render(_el, opts) {
      setTimeout(() => opts.callback('stub-token'), 0);
      return 'w1';
    },
    reset() {},
  };
`;
const THEMES = ['elvinlab-dark', 'elvinlab-light'] as const;

const FORM = {
  email: 'Correo electrónico',
  submit: 'Suscribirme',
  success: 'Revisa tu bandeja de entrada para confirmar la suscripción.',
  error: 'No se pudo suscribir. Inténtalo más tarde.',
};

const LANDING = {
  es: {
    confirm: {
      path: '/subscribe/confirm/',
      button: 'Confirmar suscripción',
      done: 'Listo: tu suscripción está confirmada.',
      invalid: /Este enlace no es válido o ya venció/,
    },
    unsubscribe: {
      path: '/subscribe/unsubscribe/',
      button: 'Darme de baja',
      done: 'Listo: no recibirás más correos.',
      invalid: 'Este enlace no es válido.',
    },
    unavailable: 'No está disponible por ahora. Inténtalo más tarde.',
  },
  en: {
    confirm: {
      path: '/en/subscribe/confirm/',
      button: 'Confirm subscription',
      done: 'Done: your subscription is confirmed.',
      invalid: /This link is not valid or has expired/,
    },
    unsubscribe: {
      path: '/en/subscribe/unsubscribe/',
      button: 'Unsubscribe',
      done: 'Done: you will not get more emails.',
      invalid: 'This link is not valid.',
    },
    unavailable: 'Not available right now. Please try again later.',
  },
} as const;

/** Stubs Turnstile and counts the requests to it. */
async function stubTurnstile(page: Page): Promise<string[]> {
  const requests: string[] = [];
  page.on('request', (request) => {
    if (request.url().startsWith('https://challenges.cloudflare.com/')) {
      requests.push(request.url());
    }
  });
  await page.route(TURNSTILE_URL, (route) =>
    route.fulfill({ contentType: 'application/javascript', body: TURNSTILE_STUB }),
  );
  return requests;
}

/** Answers a subscribe Action; records every call. */
async function mockAction(
  page: Page,
  name: 'request' | 'confirm' | 'unsubscribe',
  answer: { status: number; body: string },
): Promise<{ bodies: string[] }> {
  const calls = { bodies: [] as string[] };
  await page.route(
    (url) => url.pathname.includes(`/_actions/subscribe.${name}/`),
    async (route) => {
      calls.bodies.push(route.request().postData() ?? '');
      await route.fulfill({
        status: answer.status,
        contentType: 'application/json',
        body: answer.body,
      });
    },
  );
  return calls;
}

const actionRequests = (page: Page): string[] => {
  const seen: string[] = [];
  page.on('request', (request) => {
    if (new URL(request.url()).pathname.includes('/_actions/')) seen.push(request.url());
  });
  return seen;
};

const ok = '[{"ok":1},true]';
const unavailable = JSON.stringify({ type: 'AstroActionError', code: 'SERVICE_UNAVAILABLE' });
const result = (value: string) => `[{"result":1},"${value}"]`;

const FORM_PAGES = ['/', '/en/', '/contact/', '/privacy/', '/notes/', '/notes/smoke-es/'];
const NO_FORM_PAGES = ['/me/', '/subscribe/confirm/', '/subscribe/unsubscribe/'];
const FIELD = 'footer [data-subscribe]';

test.describe('form in the footer', () => {
  test('is on every ordinary page, once, and on no other', async ({ page }) => {
    for (const path of FORM_PAGES) {
      await page.goto(path);
      await expect(page.locator(FIELD), path).toHaveCount(1);
      await expect(page.locator('[data-subscribe]'), path).toHaveCount(1);
    }
    for (const path of NO_FORM_PAGES) {
      await page.goto(path);
      await expect(page.locator('[data-subscribe]'), path).toHaveCount(0);
    }
  });

  test('is gone from the notes sidebar and from the foot of a note', async ({ page }) => {
    await page.goto('/notes/');
    await expect(page.locator('aside [data-subscribe]')).toHaveCount(0);
    await page.goto('/notes/smoke-es/');
    await expect(page.locator('article a[href$="#subscribe"]')).toHaveCount(0);
  });

  test('is visible in Spanish and English without horizontal overflow', async ({ page }) => {
    await page.goto('/');
    const band = page.locator(FIELD);
    await expect(band.getByRole('heading', { name: 'Recibe las notas por correo' })).toBeVisible();
    await expect(band.getByLabel(FORM.email)).toBeVisible();
    await expect(band.getByRole('button', { name: FORM.submit })).toBeVisible();
    await expect(band).toContainText('aviso de algún proyecto');
    await expect(band.getByRole('link', { name: 'Cómo se usa tu correo' })).toHaveAttribute(
      'href',
      '/privacy/#subscribe',
    );
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
    await page.goto('/en/');
    const en = page.locator(FIELD);
    await expect(en.getByRole('button', { name: 'Subscribe' })).toBeVisible();
    await expect(en.getByRole('link', { name: 'How your email is used' })).toHaveAttribute(
      'href',
      '/en/privacy/#subscribe',
    );
  });

  test('has no horizontal overflow at 360 px', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 800 });
    await page.goto('/');
    await expect(page.locator(FIELD)).toBeVisible();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
  });

  test('loads no form logic and no Turnstile until the first focus, then one request', async ({
    page,
  }) => {
    const turnstile = await stubTurnstile(page);
    const scripts: string[] = [];
    page.on('request', (request) => {
      if (request.resourceType() === 'script') scripts.push(request.url());
    });
    await page.goto('/');
    await expect(page.locator(FIELD)).toBeVisible();
    await page.waitForLoadState('load');
    expect(turnstile).toEqual([]);
    const before = scripts.length;
    await page.locator(FIELD).getByLabel(FORM.email).focus();
    await expect.poll(() => turnstile.length).toBeGreaterThan(0);
    expect(scripts.length).toBeGreaterThan(before);
  });

  test('a successful submit shows the generic confirmation message', async ({ page }) => {
    await stubTurnstile(page);
    const calls = await mockAction(page, 'request', { status: 200, body: ok });
    await page.goto('/');
    const band = page.locator(FIELD);
    await band.getByLabel(FORM.email).fill('reader@example.test');
    await band.getByRole('button', { name: FORM.submit }).click();
    await expect(band.getByRole('status').filter({ hasText: FORM.success })).toBeVisible();
    expect(calls.bodies).toHaveLength(1);
    expect(JSON.parse(calls.bodies[0] ?? '{}')).toMatchObject({
      email: 'reader@example.test',
      locale: 'es',
      website: '',
      token: 'stub-token',
    });
  });

  test('a 503 shows the fixed error and keeps the form', async ({ page }) => {
    await stubTurnstile(page);
    await mockAction(page, 'request', { status: 503, body: unavailable });
    await page.goto('/notes/smoke-es/');
    const band = page.locator(FIELD);
    await band.getByLabel(FORM.email).fill('reader@example.test');
    await band.getByRole('button', { name: FORM.submit }).click();
    await expect(band.getByRole('status').filter({ hasText: FORM.error })).toBeVisible();
    await expect(band.getByLabel(FORM.email)).toBeVisible();
  });

  test('the honeypot is hidden from assistive tech and unreachable by keyboard', async ({
    page,
  }) => {
    await stubTurnstile(page);
    await page.goto('/');
    const honeypot = page.locator('input[name="website"]');
    await expect(honeypot).toHaveAttribute('tabindex', '-1');
    await expect(honeypot.locator('xpath=..')).toHaveAttribute('aria-hidden', 'true');
    await page.locator(FIELD).getByLabel(FORM.email).focus();
    const visited: string[] = [];
    for (let step = 0; step < 4; step++) {
      await page.keyboard.press('Tab');
      visited.push(await page.evaluate(() => document.activeElement?.getAttribute('name') ?? ''));
    }
    expect(visited).not.toContain('website');
  });

  for (const theme of THEMES) {
    test(`has no axe violations with the band (${theme})`, async ({ page }) => {
      await stubThirdParties(page);
      await page.addInitScript((value) => localStorage.setItem('theme', value), theme);
      await page.goto('/');
      await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
      await expect(page.locator(FIELD).getByLabel(FORM.email)).toBeVisible();
      const { violations } = await scan(page);
      expect(describeViolations(violations)).toEqual([]);
    });
  }
});

for (const locale of ['es', 'en'] as const) {
  for (const kind of ['confirm', 'unsubscribe'] as const) {
    const copy = LANDING[locale][kind];
    const answerFor = (value: string) => ({ status: 200, body: result(value) });
    const ok_ = kind === 'confirm' ? 'confirmed' : 'unsubscribed';
    const bad = kind === 'confirm' ? 'invalid_or_expired' : 'invalid';

    test.describe(`${copy.path}`, () => {
      test('does not call the Action on load and calls it once on the button click', async ({
        page,
      }) => {
        const seen = actionRequests(page);
        await mockAction(page, kind, answerFor(ok_));
        await page.goto(`${copy.path}?token=abc.def`);
        await expect(page.getByRole('button', { name: copy.button })).toBeVisible();
        await page.waitForLoadState('load');
        expect(seen).toEqual([]);
        await page.getByRole('button', { name: copy.button }).click();
        await expect(page.getByRole('status').filter({ hasText: copy.done })).toBeVisible();
        expect(seen).toHaveLength(1);
        // The token never lands in the page HTML.
        expect(await page.content()).not.toContain('abc.def');
      });

      test('shows the invalid state for a rejected link', async ({ page }) => {
        await mockAction(page, kind, answerFor(bad));
        await page.goto(`${copy.path}?token=abc.def`);
        await page.getByRole('button', { name: copy.button }).click();
        await expect(page.getByRole('status').filter({ hasText: copy.invalid })).toBeVisible();
      });

      test('shows the invalid state, and no button, without a token', async ({ page }) => {
        const seen = actionRequests(page);
        await page.goto(copy.path);
        await expect(page.getByRole('status').filter({ hasText: copy.invalid })).toBeVisible();
        await expect(page.getByRole('button', { name: copy.button })).toBeHidden();
        expect(seen).toEqual([]);
      });

      test('shows the unavailable state and keeps the button for a retry', async ({ page }) => {
        await mockAction(page, kind, { status: 503, body: unavailable });
        await page.goto(`${copy.path}?token=abc.def`);
        await page.getByRole('button', { name: copy.button }).click();
        await expect(
          page.getByRole('status').filter({ hasText: LANDING[locale].unavailable }),
        ).toBeVisible();
        await expect(page.getByRole('button', { name: copy.button })).toBeEnabled();
      });

      for (const theme of THEMES) {
        test(`has no axe violations (${theme})`, async ({ page }) => {
          await page.addInitScript((value) => localStorage.setItem('theme', value), theme);
          await page.goto(`${copy.path}?token=abc.def`);
          await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
          await expect(page.getByRole('button', { name: copy.button })).toBeVisible();
          const { violations } = await scan(page);
          expect(describeViolations(violations)).toEqual([]);
        });
      }
    });
  }
}

test('the email field keeps a 44 px tap height on a phone', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 780 });
  await page.goto('/');
  const box = await page.locator('#subscribe-email').boundingBox();
  expect(box?.height).toBeGreaterThanOrEqual(44);
});
