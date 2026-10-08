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
  email: 'Dónde enviarte las notas',
  submit: 'Suscribirme',
  success: 'Revisa tu bandeja de entrada para confirmar la suscripción.',
  error:
    'No se pudo suscribir. Inténtalo más tarde o escríbeme desde la página de Contacto y te agrego a mano.',
  capped: 'Hoy llegaron muchas solicitudes. Inténtalo de nuevo mañana.',
  rateLimited: 'Demasiados intentos seguidos. Espera un minuto y vuelve a intentarlo.',
  interactive: 'Marca la casilla de abajo para verificar que eres una persona.',
  timeout:
    'No pudimos verificar que eres una persona. Revisa tu conexión o desactiva bloqueadores y vuelve a intentarlo, o escríbeme desde la página de Contacto y te agrego a mano.',
  verifying: 'Verificando…',
};

const LANDING = {
  es: {
    confirm: {
      path: '/subscribe/confirm/',
      button: 'Confirmar suscripción',
      done: /Listo: tu suscripción está confirmada\./,
      invalid: /Este enlace ya se usó, lo reemplazó uno más nuevo o venció/,
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
      done: /Done: your subscription is confirmed\./,
      invalid: /This link was already used, was replaced by a newer one, or has expired/,
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

/** Stubs Turnstile and counts the requests to it; `script` replaces the default instant-token stub. */
async function stubTurnstile(page: Page, script: string = TURNSTILE_STUB): Promise<string[]> {
  const requests: string[] = [];
  page.on('request', (request) => {
    if (request.url().startsWith('https://challenges.cloudflare.com/')) {
      requests.push(request.url());
    }
  });
  await page.route(TURNSTILE_URL, (route) =>
    route.fulfill({ contentType: 'application/javascript', body: script }),
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

const FORM_PAGES = ['/', '/en/', '/privacy/', '/notes/', '/notes/smoke-es/'];
const NO_FORM_PAGES = [
  '/me/',
  '/contact/',
  '/en/contact/',
  '/subscribe/confirm/',
  '/subscribe/unsubscribe/',
];
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

  test('a daily_cap error shows its fixed message and keeps the form', async ({ page }) => {
    await stubTurnstile(page);
    await mockAction(page, 'request', {
      status: 429,
      body: JSON.stringify({
        type: 'AstroActionError',
        code: 'TOO_MANY_REQUESTS',
        status: 429,
        message: 'Too many requests today. Please try again tomorrow.',
      }),
    });
    await page.goto('/notes/smoke-es/');
    const band = page.locator(FIELD);
    await band.getByLabel(FORM.email).fill('reader@example.test');
    await band.getByRole('button', { name: FORM.submit }).click();
    await expect(band.getByRole('status').filter({ hasText: FORM.capped })).toBeVisible();
    await expect(band.getByLabel(FORM.email)).toBeVisible();
  });

  test('an interactive challenge is announced and the widget is scrolled into view', async ({
    page,
  }) => {
    await stubTurnstile(
      page,
      `window.turnstile = {
        render(el, opts) {
          el.style.height = '72px';
          el.textContent = 'challenge';
          setTimeout(() => opts['before-interactive-callback'](), 1_500);
          return 'w1';
        },
        reset() {},
      };`,
    );
    await page.setViewportSize({ width: 1280, height: 500 });
    await page.goto('/notes/smoke-es/');
    const band = page.locator(FIELD);
    await band.getByLabel(FORM.email).fill('reader@example.test');
    await band.getByRole('button', { name: FORM.submit }).click();
    await expect(band.getByRole('status').filter({ hasText: FORM.interactive })).toBeVisible();
    await expect
      .poll(() =>
        page.locator('[data-subscribe] [data-widget]').evaluate((node) => {
          const { top, bottom } = node.getBoundingClientRect();
          return top >= 0 && bottom <= window.innerHeight;
        }),
      )
      .toBe(true);
  });

  test('pressing the button after the box was asked keeps the instruction, not "Verifying…"', async ({
    page,
  }) => {
    await stubTurnstile(
      page,
      `window.turnstile = {
        render(el, opts) {
          el.style.height = '72px';
          setTimeout(() => opts['before-interactive-callback'](), 300);
          return 'w1';
        },
        reset() {},
      };`,
    );
    await page.goto('/notes/smoke-es/');
    const band = page.locator(FIELD);
    await band.getByLabel(FORM.email).fill('reader@example.test');
    const status = band.getByRole('status');
    await expect(status.filter({ hasText: FORM.interactive })).toBeVisible();
    await band.getByRole('button', { name: FORM.submit }).click();
    await expect(status.filter({ hasText: FORM.interactive })).toBeVisible();
    await expect(status.filter({ hasText: FORM.verifying })).toBeHidden();
  });

  test('after the time-out a later challenge request does not hide the fallback message', async ({
    page,
  }) => {
    await stubTurnstile(
      page,
      `window.turnstile = {
        render(el, opts) {
          window.__opts = opts;
          return 'w1';
        },
        reset() { setTimeout(() => window.__opts['before-interactive-callback'](), 200); },
      };`,
    );
    await page.clock.install();
    await page.goto('/notes/smoke-es/');
    const band = page.locator(FIELD);
    await band.getByLabel(FORM.email).fill('reader@example.test');
    await band.getByRole('button', { name: FORM.submit }).click();
    // The wait only starts once the form is pending: do not fast-forward before that.
    await expect(band.getByRole('status').filter({ hasText: FORM.verifying })).toBeVisible();
    await page.clock.fastForward(26_000);
    await expect(band.getByRole('status').filter({ hasText: FORM.timeout })).toBeVisible();
    await page.clock.fastForward(2_000);
    await expect(band.getByRole('status').filter({ hasText: FORM.timeout })).toBeVisible();
    await expect(band.getByRole('status').filter({ hasText: FORM.interactive })).toBeHidden();
  });

  test('a challenge that never answers times out after 25 s and can be retried', async ({
    page,
  }) => {
    await stubTurnstile(page, 'window.turnstile = { render() { return "w1"; }, reset() {} };');
    await page.clock.install();
    await page.goto('/notes/smoke-es/');
    const band = page.locator(FIELD);
    await band.getByLabel(FORM.email).fill('reader@example.test');
    const press = band.getByRole('button', { name: FORM.submit });
    await press.click();
    await expect(band.getByRole('status').filter({ hasText: FORM.verifying })).toBeVisible();
    await page.clock.fastForward(24_000);
    await expect(band.getByRole('status').filter({ hasText: FORM.timeout })).toBeHidden();
    await page.clock.fastForward(2_000);
    await expect(band.getByRole('status').filter({ hasText: FORM.timeout })).toBeVisible();
    await press.click();
    await expect(band.getByRole('status').filter({ hasText: FORM.verifying })).toBeVisible();
    await expect(press).toBeEnabled();
  });

  test('a Turnstile error shows the generic message with its code', async ({ page }) => {
    await stubTurnstile(
      page,
      `window.turnstile = {
        render(_el, opts) {
          // Late enough that the reader has already pressed the button and is waiting.
          setTimeout(() => opts['error-callback']('600010'), 1_500);
          return 'w1';
        },
        reset() {},
      };`,
    );
    const warnings: string[] = [];
    page.on('console', (message) => {
      if (message.type() === 'warning') warnings.push(message.text());
    });
    await page.goto('/notes/smoke-es/');
    const band = page.locator(FIELD);
    await band.getByLabel(FORM.email).fill('reader@example.test');
    await band.getByRole('button', { name: FORM.submit }).click();
    await expect(
      band.getByRole('status').filter({ hasText: `${FORM.error} (código 600010)` }),
    ).toBeVisible();
    expect(warnings.some((text) => text.includes('600010'))).toBe(true);
    expect(warnings.join(' ')).not.toContain('reader@example.test');
  });

  test('the rate limiter shows its own message, not the daily cap one', async ({ page }) => {
    await stubTurnstile(page);
    await mockAction(page, 'request', {
      status: 429,
      body: JSON.stringify({
        type: 'AstroActionError',
        code: 'TOO_MANY_REQUESTS',
        status: 429,
        message: 'Too many attempts in a row. Please wait a minute and try again.',
      }),
    });
    await page.goto('/notes/smoke-es/');
    const band = page.locator(FIELD);
    await band.getByLabel(FORM.email).fill('reader@example.test');
    await band.getByRole('button', { name: FORM.submit }).click();
    await expect(band.getByRole('status').filter({ hasText: FORM.rateLimited })).toBeVisible();
    await expect(band.getByRole('status').filter({ hasText: FORM.capped })).toBeHidden();
  });

  test('the honeypot is hidden from assistive tech and unreachable by keyboard', async ({
    page,
  }) => {
    await stubTurnstile(page);
    await page.goto('/');
    const honeypot = page.locator('input[name="homepage"]');
    await expect(honeypot).toHaveAttribute('tabindex', '-1');
    await expect(honeypot.locator('xpath=..')).toHaveAttribute('aria-hidden', 'true');
    await page.locator(FIELD).getByLabel(FORM.email).focus();
    const visited: string[] = [];
    for (let step = 0; step < 4; step++) {
      await page.keyboard.press('Tab');
      visited.push(await page.evaluate(() => document.activeElement?.getAttribute('name') ?? ''));
    }
    expect(visited).not.toContain('homepage');
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

      test('card shows the envelope, then the check after a successful click', async ({ page }) => {
        await mockAction(page, kind, answerFor(ok_));
        await page.goto(`${copy.path}?token=abc.def`);
        const card = page.locator('[data-subscribe-page]');
        await expect(card).toHaveAttribute('data-state', 'idle');
        await expect(card.locator('svg:visible')).toHaveCount(1);
        expect(
          await card
            .locator('svg')
            .evaluateAll((els) => els.every((e) => e.getAttribute('aria-hidden') === 'true')),
        ).toBe(true);
        await page.getByRole('button', { name: copy.button }).click();
        await expect(card).toHaveAttribute('data-state', 'done');
        await expect(card.locator('svg:visible')).toHaveCount(1);
      });

      test('card shows the exclamation for a rejected link and for a missing token', async ({
        page,
      }) => {
        await mockAction(page, kind, answerFor(bad));
        await page.goto(`${copy.path}?token=abc.def`);
        await page.getByRole('button', { name: copy.button }).click();
        await expect(page.locator('[data-subscribe-page]')).toHaveAttribute(
          'data-state',
          'invalid',
        );
        await page.goto(copy.path);
        await expect(page.locator('[data-subscribe-page]')).toHaveAttribute(
          'data-state',
          'invalid',
        );
      });

      test('has no horizontal overflow at 360 px', async ({ page }) => {
        await page.setViewportSize({ width: 360, height: 780 });
        await page.goto(`${copy.path}?token=abc.def`);
        await expect(page.getByRole('button', { name: copy.button })).toBeVisible();
        const overflow = await page.evaluate(
          () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
        );
        expect(overflow).toBeLessThanOrEqual(0);
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

const PAGE = {
  es: {
    path: '/subscribe/',
    lang: 'es',
    h1: 'Lo que construyo, en tu correo.',
    submit: FORM.submit,
    label: FORM.email,
    reassurance: 'Sin spam. Tu correo se usa solo para esto. Te das de baja en un clic.',
    privacy: ['Cómo se usa tu correo', '/privacy/#subscribe'],
    points: [
      'Una nota, un correo.',
      'Decisiones, no tutoriales.',
      'De vez en cuando, un proyecto.',
    ],
    latest: 'La última nota',
    alternates: { es: '/subscribe/', en: '/en/subscribe/' },
  },
  en: {
    path: '/en/subscribe/',
    lang: 'en',
    h1: 'What I build, in your inbox.',
    submit: 'Subscribe',
    label: 'Where to send the notes',
    reassurance: 'No spam. Your address is used for this only. Unsubscribe in one click.',
    privacy: ['How your email is used', '/en/privacy/#subscribe'],
    points: ['One note, one email.', 'Decisions, not tutorials.', 'Now and then, a project.'],
    latest: 'The latest note',
    alternates: { es: '/subscribe/', en: '/en/subscribe/' },
  },
} as const;

for (const locale of ['es', 'en'] as const) {
  const copy = PAGE[locale];
  const form = '[data-subscribe-landing] [data-subscribe]';

  test.describe(`the subscription page ${copy.path}`, () => {
    test('is indexable, canonical, linked to its twin and has no footer band', async ({ page }) => {
      await page.goto(copy.path);
      await expect(page.locator('html')).toHaveAttribute('lang', copy.lang);
      await expect(page.locator('meta[name="robots"]')).toHaveCount(0);
      await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
        'href',
        new RegExp(`${copy.path}$`),
      );
      await expect(page.locator('link[rel="alternate"][hreflang="es"]')).toHaveAttribute(
        'href',
        new RegExp(`${copy.alternates.es}$`),
      );
      await expect(page.locator('link[rel="alternate"][hreflang="en"]')).toHaveAttribute(
        'href',
        new RegExp(`${copy.alternates.en}$`),
      );
      await expect(page.locator('[data-subscribe]')).toHaveCount(1);
      await expect(page.locator('footer [data-subscribe]')).toHaveCount(0);
      await expect(page.locator('[data-subscribe-cta]')).toHaveCount(0);
    });

    test('shows the headline and the form without scrolling at 390x844', async ({ page }) => {
      await page.setViewportSize({ width: 390, height: 844 });
      await page.goto(copy.path);
      await expect(page.getByRole('heading', { level: 1, name: copy.h1 })).toBeVisible();
      const submit = page.locator(form).getByRole('button', { name: copy.submit });
      await expect(submit).toBeVisible();
      const box = await submit.boundingBox();
      expect((box?.y ?? 9999) + (box?.height ?? 0)).toBeLessThanOrEqual(844);
      await expect(page.locator(form).getByLabel(copy.label)).toBeVisible();
      await expect(page.locator(form)).toContainText(copy.reassurance);
      await expect(page.locator(form).getByRole('link', { name: copy.privacy[0] })).toHaveAttribute(
        'href',
        copy.privacy[1],
      );
      for (const point of copy.points) await expect(page.getByText(point)).toBeVisible();
    });

    test('has no horizontal overflow at 360 px', async ({ page }) => {
      await page.setViewportSize({ width: 360, height: 780 });
      await page.goto(copy.path);
      await expect(page.locator(form)).toBeVisible();
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
      ).toBe(true);
    });

    test('the latest note card links to a real note', async ({ page }) => {
      await page.goto(copy.path);
      const card = page.locator('[data-latest-note]');
      // The fixture has Spanish notes only: the English page omits the card, never shows a stranger's language.
      if (locale === 'en' && (await card.count()) === 0) return;
      await expect(card).toContainText(copy.latest);
      const link = card.getByRole('link');
      const href = (await link.getAttribute('href')) ?? '';
      expect(href).toMatch(/\/notes\/[^/]+\/$/);
      const response = await page.request.get(href);
      expect(response.status()).toBe(200);
    });

    test('a successful submit sends the page language', async ({ page }) => {
      await stubTurnstile(page);
      const calls = await mockAction(page, 'request', { status: 200, body: ok });
      await page.goto(copy.path);
      await page.locator(form).getByLabel(copy.label).fill('reader@example.test');
      await page.locator(form).getByRole('button', { name: copy.submit }).click();
      await expect(page.locator(form).getByRole('status').filter({ hasText: /\S/ })).toBeVisible();
      await expect.poll(() => calls.bodies.length).toBe(1);
      expect(JSON.parse(calls.bodies[0] ?? '{}')).toMatchObject({
        email: 'reader@example.test',
        locale: copy.lang,
        token: 'stub-token',
      });
    });

    test('the envelope hops on hover only with motion allowed', async ({ page }) => {
      const envelope = page.locator('[data-subscribe-landing] header svg');
      await page.goto(copy.path);
      await envelope.hover();
      await page.waitForTimeout(400);
      expect(await envelope.evaluate((el) => getComputedStyle(el).translate)).toBe('none');
      await page.emulateMedia({ reducedMotion: 'no-preference' });
      await page.mouse.move(0, 0);
      await envelope.hover();
      await expect
        .poll(() => envelope.evaluate((el) => getComputedStyle(el).translate))
        .not.toBe('none');
    });

    for (const theme of THEMES) {
      test(`has no axe violations (${theme})`, async ({ page }) => {
        await stubThirdParties(page);
        await page.addInitScript((value) => localStorage.setItem('theme', value), theme);
        await page.goto(copy.path);
        await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
        await expect(page.locator(form).getByLabel(copy.label)).toBeVisible();
        const { violations } = await scan(page);
        expect(describeViolations(violations)).toEqual([]);
      });
    }
  });
}

test('confirm and unsubscribe stay noindex while the subscription page is indexable', async ({
  page,
}) => {
  for (const path of ['/subscribe/confirm/', '/subscribe/unsubscribe/', '/en/subscribe/confirm/']) {
    await page.goto(path);
    await expect(page.locator('meta[name="robots"]'), path).toHaveAttribute('content', /noindex/);
  }
});

test.describe('footer link to the subscription page', () => {
  test('is in the footer links on ordinary pages and leads to the page, in both languages', async ({
    page,
  }) => {
    for (const [path, name, target] of [
      ['/', 'Suscribirse', '/subscribe/'],
      ['/contact/', 'Suscribirse', '/subscribe/'],
      ['/en/', 'Subscribe', '/en/subscribe/'],
    ] as const) {
      await page.goto(path);
      const link = page.locator('footer').getByRole('link', { name, exact: true });
      await expect(link, path).toHaveAttribute('href', target);
    }
    await page.goto('/');
    await page.locator('footer').getByRole('link', { name: 'Suscribirse', exact: true }).click();
    await expect(page).toHaveURL(/\/subscribe\/$/);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  });

  test('is not on the printable CV', async ({ page }) => {
    await page.goto('/me/');
    await expect(
      page.locator('footer').getByRole('link', { name: 'Suscribirse', exact: true }),
    ).toHaveCount(0);
  });
});
