import { callSubscribeAction } from '@/shared/subscribe/action-client.ts';
import { SUBSCRIBE_RATE_LIMITED_MESSAGE } from '@/shared/subscribe/client-policy.ts';
import { createTurnstileLoader, type TurnstileApi } from '@/shared/subscribe/turnstile.ts';
import { createVerifyTimeout, withErrorCode } from '@/shared/subscribe/verify-wait.ts';

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
  // Cloudflare asked for a visible click, and the reader has not been told otherwise since.
  let interactive = false;
  // The wait ran out: keep the fallback message until the reader tries again.
  let timedOut = false;

  const say = (message: string) => {
    status.textContent = message;
  };

  // Without a token after the wait, say so and let the reader press the button again.
  const verifyWait = createVerifyTimeout(() => {
    if (!pending) return;
    pending = false;
    interactive = false;
    timedOut = true;
    say(text['timeout'] ?? text['error'] ?? '');
    if (api && widgetId !== undefined) api.reset(widgetId);
  });

  const showWidget = () => {
    const { top, bottom } = box.getBoundingClientRect();
    if (top >= 0 && bottom <= window.innerHeight) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    box.scrollIntoView({ block: 'center', behavior: reduced ? 'auto' : 'smooth' });
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
    } else if (outcome.code === 'TOO_MANY_REQUESTS') {
      // Two limits share the status; only the fixed message tells them apart.
      const rateLimited = outcome.message === SUBSCRIBE_RATE_LIMITED_MESSAGE;
      say((rateLimited ? text['rateLimited'] : text['capped']) ?? text['error'] ?? '');
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
            interactive = false;
            verifyWait.clear();
            if (pending) {
              pending = false;
              form.requestSubmit();
            }
          },
          'expired-callback': () => {
            token = '';
          },
          'before-interactive-callback': () => {
            if (timedOut) return;
            interactive = true;
            say(text['interactive'] ?? '');
            showWidget();
          },
          'after-interactive-callback': () => {
            interactive = false;
            if (timedOut) return;
            say(pending ? (text['verifying'] ?? '') : '');
          },
          'error-callback': (code) => {
            token = '';
            pending = false;
            verifyWait.clear();
            // Only the short Cloudflare code is shown and logged, never the address.
            console.warn('subscribe: turnstile error', code);
            say(withErrorCode(text['error'] ?? '', text['codeLabel'] ?? 'code', code));
          },
        });
      })
      .catch(() => {
        rendering = false;
        pending = false;
        verifyWait.clear();
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
      timedOut = false;
      // If the box was already asked for, keep telling the reader to tick it.
      say((interactive ? text['interactive'] : text['verifying']) ?? '');
      verifyWait.start();
      return;
    }
    void send();
  });
  // The import was triggered by the first interaction, which has already happened.
  begin();
}
