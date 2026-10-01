import { expect, type Page, test } from '@playwright/test';

// Only the third-party script is stubbed; the Action runs for real. The fixture preview has no
// Cloudflare bindings, so the Action answers SERVICE_UNAVAILABLE.
const TURNSTILE_STUB = `
  window.turnstile = {
    render(_el, opts) {
      window.__turnstile = opts;
      setTimeout(() => opts.callback('stub-token'), 0);
      return 'w1';
    },
    reset() {
      window.__resets = (window.__resets || 0) + 1;
    },
    remove() {},
  };
`;

const COPY = {
  es: {
    path: '/contact/',
    name: 'Nombre',
    email: 'Correo electrónico',
    message: 'Mensaje',
    submit: 'Enviar mensaje',
    required: ['Escribe tu nombre.', 'Escribe tu correo.', 'Escribe un mensaje.'],
    invalidEmail: 'Revisa el formato del correo.',
    unavailable: 'El formulario no está disponible por ahora. Inténtalo más tarde.',
  },
  en: {
    path: '/en/contact/',
    name: 'Name',
    email: 'Email',
    message: 'Message',
    submit: 'Send message',
    required: ['Enter your name.', 'Enter your email.', 'Write a message.'],
    invalidEmail: 'Check the email format.',
    unavailable: 'The form is not available right now. Please try again later.',
  },
} as const;

type Copy = (typeof COPY)[keyof typeof COPY];

test.beforeEach(async ({ page }) => {
  await page.route('https://challenges.cloudflare.com/turnstile/v0/api.js*', (route) =>
    route.fulfill({ contentType: 'application/javascript', body: TURNSTILE_STUB }),
  );
});

/** Opens the page, waits for hydration and for the lazy widget (loaded on first focus). */
async function openForm(page: Page, copy: Copy): Promise<void> {
  await page.goto(copy.path);
  const name = page.getByLabel(copy.name);
  await expect(name).toBeEnabled();
  await name.focus();
  await page.waitForFunction(() => '__turnstile' in window);
}

async function fillValid(page: Page, copy: Copy): Promise<void> {
  await page.getByLabel(copy.name).fill('Test User');
  await page.getByLabel(copy.email).fill('test@example.com');
  await page.getByLabel(copy.message).fill('Hello world');
}

const isContactAction = (url: string, method: string): boolean =>
  url.includes('/_actions/contact/') && method === 'POST';

for (const [locale, copy] of Object.entries(COPY)) {
  test.describe(`${locale} contact form`, () => {
    test('empty submit shows every required error and focuses the first field', async ({
      page,
    }) => {
      await openForm(page, copy);
      await page.getByRole('button', { name: copy.submit }).click();

      for (const message of copy.required) {
        await expect(page.getByRole('alert').filter({ hasText: message })).toBeVisible();
      }
      for (const label of [copy.name, copy.email, copy.message]) {
        await expect(page.getByLabel(label)).toHaveAttribute('aria-invalid', 'true');
      }
      await expect(page.getByLabel(copy.name)).toBeFocused();
    });

    test('invalid email is rejected before sending', async ({ page }) => {
      await openForm(page, copy);
      await fillValid(page, copy);
      await page.getByLabel(copy.email).fill('not-an-email');
      await page.getByRole('button', { name: copy.submit }).click();

      await expect(page.getByRole('alert').filter({ hasText: copy.invalidEmail })).toBeVisible();
      await expect(page.getByLabel(copy.email)).toHaveAttribute('aria-invalid', 'true');
    });
  });
}

test('valid submit sends the exact payload, shows the unavailable state and resets the widget', async ({
  page,
}) => {
  test.setTimeout(30_000);
  const copy = COPY.es;
  await openForm(page, copy);
  await fillValid(page, copy);

  const requestPromise = page.waitForRequest((req) => isContactAction(req.url(), req.method()));
  await page.getByRole('button', { name: copy.submit }).click();
  const body = (await requestPromise).postDataJSON();

  expect(Object.keys(body).sort()).toEqual(
    ['email', 'message', 'name', 'startedAt', 'token', 'website'].sort(),
  );
  expect(body).toMatchObject({
    name: 'Test User',
    email: 'test@example.com',
    message: 'Hello world',
    website: '',
    token: 'stub-token',
  });
  expect(typeof body.startedAt).toBe('number');

  await expect(page.getByRole('alert').filter({ hasText: copy.unavailable })).toBeVisible();
  expect(await page.evaluate(() => (window as unknown as { __resets?: number }).__resets)).toBe(1);
});

test('a filled honeypot is sent as typed so the server can reject it', async ({ page }) => {
  test.setTimeout(30_000);
  const copy = COPY.es;
  await openForm(page, copy);
  await fillValid(page, copy);
  await page.locator('input[name="website"]').evaluate((el: HTMLInputElement) => {
    el.value = 'bot';
  });

  const requestPromise = page.waitForRequest((req) => isContactAction(req.url(), req.method()));
  await page.getByRole('button', { name: copy.submit }).click();

  expect((await requestPromise).postDataJSON().website).toBe('bot');
});

test('the honeypot is hidden from assistive technology and skipped by the keyboard', async ({
  page,
}) => {
  await page.goto(COPY.es.path);
  const honeypot = page.locator('input[name="website"]');
  await expect(honeypot).toHaveAttribute('tabindex', '-1');
  await expect(honeypot.locator('xpath=ancestor::*[@aria-hidden="true"][1]')).toBeAttached();
});
