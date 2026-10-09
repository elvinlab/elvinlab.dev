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
    requiredNote: 'Todos los campos son obligatorios.',
    summary: 'Revisa 3 campos',
    unavailable: 'El formulario no está disponible por ahora. Inténtalo más tarde.',
    linkedin: 'Búscame allí.',
    placeholder: 'nombre@ejemplo.com',
  },
  en: {
    path: '/en/contact/',
    name: 'Name',
    email: 'Email',
    message: 'Message',
    submit: 'Send message',
    required: ['Enter your name.', 'Enter your email.', 'Write a message.'],
    invalidEmail: 'Check the email format.',
    requiredNote: 'All fields are required.',
    summary: 'Check 3 fields',
    unavailable: 'The form is not available right now. Please try again later.',
    linkedin: 'Find me there.',
    placeholder: 'name@example.com',
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

const LINKEDIN_URL = 'https://www.linkedin.com/in/elvinlab';
const EMAIL_PATTERN = /[\w.+-]+@[\w-]+\.[\w.-]+/g;

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

    test('marks the three fields as required and says so before the first field', async ({
      page,
    }) => {
      await openForm(page, copy);
      for (const label of [copy.name, copy.email, copy.message]) {
        const field = page.getByLabel(label);
        await expect(field).toHaveAttribute('aria-required', 'true');
        await expect(field).toHaveAttribute('required', '');
      }
      const note = page.getByText(copy.requiredNote);
      await expect(note).toBeVisible();
      const noteBox = await note.boundingBox();
      const nameBox = await page.getByLabel(copy.name).boundingBox();
      expect(noteBox?.y ?? Number.POSITIVE_INFINITY).toBeLessThan(nameBox?.y ?? 0);
    });

    test('a failed submit announces a summary in a persistent polite live region', async ({
      page,
    }) => {
      await openForm(page, copy);
      const live = page.locator('form p[role="status"][aria-live="polite"].sr-only').first();
      await expect(live).toHaveCount(1);
      await expect(live).toHaveText('');
      await page.getByRole('button', { name: copy.submit }).click();
      await expect(live).toHaveText(copy.summary);
    });

    test('shows the LinkedIn link, opening in a new tab with the shared hint', async ({ page }) => {
      await page.goto(copy.path);
      const aside = page.locator('article').getByText(copy.linkedin);
      await expect(aside).toBeVisible();
      const link = page.locator('article').getByRole('link', { name: /LinkedIn/ });
      await expect(link).toBeVisible();
      await expect(link).toHaveAttribute('href', LINKEDIN_URL);
      await expect(link).toHaveAttribute('target', '_blank');
      await expect(link).toHaveAttribute('rel', /noopener/);
      await expect(link.locator('.sr-only')).toHaveCount(1);
    });

    test('the page exposes no email address or mailto link', async ({ page }) => {
      await page.goto(copy.path);
      const html = await page.content();
      expect(html).not.toContain('mailto:');
      const found = (html.match(EMAIL_PATTERN) ?? []).filter((m) => m !== copy.placeholder);
      expect(found).toEqual([]);
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

test('a failed send keeps the typed text, announces sending then the error and returns focus to the submit button', async ({
  page,
}) => {
  test.setTimeout(30_000);
  const copy = COPY.es;
  await page.route(
    (url) => url.pathname.includes('/_actions/contact/'),
    async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 600));
      await route.fulfill({
        status: 503,
        contentType: 'application/json',
        body: JSON.stringify({ type: 'AstroActionError', code: 'SERVICE_UNAVAILABLE' }),
      });
    },
  );
  await openForm(page, copy);
  await fillValid(page, copy);
  await page.getByRole('button', { name: copy.submit }).click();

  await expect(page.getByRole('button', { name: 'Enviando…' })).toHaveAttribute(
    'aria-busy',
    'true',
  );
  await expect(page.getByRole('status').filter({ hasText: 'Enviando…' })).toBeAttached();
  await expect(page.getByRole('alert').filter({ hasText: copy.unavailable })).toBeVisible();

  await expect(page.getByLabel(copy.name)).toHaveValue('Test User');
  await expect(page.getByLabel(copy.email)).toHaveValue('test@example.com');
  await expect(page.getByLabel(copy.message)).toHaveValue('Hello world');
  await expect(page.getByRole('button', { name: copy.submit })).toHaveAttribute(
    'aria-busy',
    'false',
  );
  // The button and fields were disabled while sending, which drops focus to the page: it comes back.
  await expect(page.getByRole('button', { name: copy.submit })).toBeFocused();
});
