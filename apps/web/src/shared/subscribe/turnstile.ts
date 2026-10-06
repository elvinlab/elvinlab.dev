/** Lazy Cloudflare Turnstile loader for the subscribe form: nothing is requested until asked. */
export const TURNSTILE_SCRIPT_URL =
  'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';

export type TurnstileOptions = {
  sitekey: string;
  action: string;
  theme: 'auto';
  size: 'flexible';
  /** Hidden unless Cloudflare needs a visible interaction, so the widget never shifts the layout. */
  appearance: 'interaction-only';
  callback: (token: string) => void;
  'expired-callback': () => void;
  /** Receives Cloudflare's error code (for example `600010`); it may be missing. */
  'error-callback': (code?: string) => void;
  /** The widget is about to show a checkbox the reader must tick. */
  'before-interactive-callback'?: () => void;
  /** The checkbox was handled; the widget goes quiet again. */
  'after-interactive-callback'?: () => void;
};

export type TurnstileApi = {
  render: (container: HTMLElement, options: TurnstileOptions) => string;
  reset: (widgetId: string) => void;
};

export type TurnstileLoaderDeps = {
  inject: (src: string, onLoad: () => void, onError: (error: Error) => void) => void;
  getApi: () => TurnstileApi | undefined;
};

/** One shared promise; a failure clears it so the next attempt retries. */
export function createTurnstileLoader(deps: TurnstileLoaderDeps): () => Promise<TurnstileApi> {
  let pending: Promise<TurnstileApi> | null = null;
  return () => {
    pending ??= new Promise<TurnstileApi>((resolve, reject) => {
      deps.inject(
        TURNSTILE_SCRIPT_URL,
        () => {
          const api = deps.getApi();
          if (api) resolve(api);
          else reject(new Error('Turnstile API not available after script load'));
        },
        reject,
      );
    });
    pending.catch(() => {
      pending = null;
    });
    return pending;
  };
}
