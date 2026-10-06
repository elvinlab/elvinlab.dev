import { callSubscribeAction } from '@/shared/subscribe/action-client.ts';
import { createTurnstileLoader, type TurnstileApi } from '@/shared/subscribe/turnstile.ts';

/**
 * Form logic of the footer subscription band. It is imported on the first focus or pointer
 * enter, never on page load, so a visitor who ignores the form downloads none of it and sends no
 * request to Turnstile. Texts and the site key arrive as `data-*` attributes of the root.
 */
export function initSubscribeForm(root: HTMLElement): void {
  const form = root.querySelector('form');
  const email = form?.querySelector<HTMLInputElement>('input[name=email]');
  const honeypot = form?.querySelector<HTMLInputElement>('input[name=homepage]');
  const box = root.querySelector<HTMLElement>('[data-widget]');
  const submit = form?.querySelector<HTMLButtonElement>('button[type=submit]');
  const status = root.querySelector<HTMLElement>('[data-status]');
  if (!form || !email || !honeypot || !box || !submit || !status) return;

  const text = root.dataset;
  const load = createTurnstileLoader({
    inject: (src, onLoad, onError) => {
      const script = document.createElement('script');
      script.src = src;
      script.async = true;
      script.onload = onLoad;
      script.onerror = () => onError(new Error('turnstile script failed'));
      document.head.append(script);
    },
    getApi: () => (window as Window & { turnstile?: TurnstileApi }).turnstile,
  });
  let startedAt: number | null = null;
  let token = '';
  let api: TurnstileApi | undefined;
  let widgetId: string | undefined;
  let rendering = false;
  let pending = false;
  let sending = false;

  const say = (message: string) => {
    status.textContent = message;
  };

  const send = async () => {
    sending = true;
    submit.disabled = true;
    say(text['sending'] ?? '');
    const outcome = await callSubscribeAction('request', {
      email: email.value,
      locale: text['locale'],
      website: honeypot.value,
      startedAt: startedAt ?? Date.now(),
      token,
    });
    // A Turnstile token is single use: whatever happened, the next try needs a new one.
    token = '';
    if (api && widgetId !== undefined) api.reset(widgetId);
    sending = false;
    submit.disabled = false;
    if (outcome.ok) {
      form.hidden = true;
      say(text['success'] ?? '');
    } else {
      say(text['error'] ?? '');
    }
  };

  const startWidget = () => {
    if (rendering) return;
    rendering = true;
    load()
      .then((loaded) => {
        api = loaded;
        widgetId = loaded.render(box, {
          sitekey: text['siteKey'] ?? '',
          action: text['action'] ?? '',
          theme: 'auto',
          size: 'flexible',
          appearance: 'interaction-only',
          callback: (value) => {
            token = value;
            if (pending) {
              pending = false;
              form.requestSubmit();
            }
          },
          'expired-callback': () => {
            token = '';
          },
          'error-callback': () => {
            token = '';
            pending = false;
            say(text['error'] ?? '');
          },
        });
      })
      .catch(() => {
        rendering = false;
        pending = false;
        say(text['error'] ?? '');
      });
  };

  // The first interaction starts both the "time to fill" clock and the lazy Turnstile load.
  const begin = () => {
    startedAt ??= Date.now();
    startWidget();
  };
  form.addEventListener('focusin', begin);
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    if (sending) return;
    if (!form.reportValidity()) return;
    begin();
    if (!token) {
      pending = true;
      say(text['verifying'] ?? '');
      return;
    }
    void send();
  });
  // The import was triggered by the first interaction, which has already happened.
  begin();
}
