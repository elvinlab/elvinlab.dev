export const TURNSTILE_SCRIPT_URL =
  'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';

export type TurnstileOptions = {
  sitekey: string;
  action: string;
  theme: 'auto';
  size: 'flexible';
  callback: (token: string) => void;
  'expired-callback': () => void;
  'error-callback': () => void;
};

export type TurnstileApi = {
  render: (container: HTMLElement, options: TurnstileOptions) => string;
  reset: (widgetId: string) => void;
  remove: (widgetId: string) => void;
};

export type TurnstileLoaderDeps = {
  inject: (src: string, onLoad: () => void, onError: (err: Error) => void) => void;
  getApi: () => TurnstileApi | undefined;
};

export function createTurnstileLoader(deps: TurnstileLoaderDeps): () => Promise<TurnstileApi> {
  let loadPromise: Promise<TurnstileApi> | null = null;

  return function loadTurnstile(): Promise<TurnstileApi> {
    if (loadPromise) {
      return loadPromise;
    }

    loadPromise = new Promise<TurnstileApi>((resolve, reject) => {
      let checkApiInterval: ReturnType<typeof setInterval>;
      let safetyTimeout: ReturnType<typeof setTimeout>;

      const cleanup = () => {
        clearInterval(checkApiInterval);
        clearTimeout(safetyTimeout);
      };

      deps.inject(
        TURNSTILE_SCRIPT_URL,
        () => {
          const loadedApi = deps.getApi();
          if (loadedApi) {
            cleanup();
            resolve(loadedApi);
          } else {
            checkApiInterval = setInterval(() => {
              const api = deps.getApi();
              if (api) {
                cleanup();
                resolve(api);
              }
            }, 50);
            safetyTimeout = setTimeout(() => {
              cleanup();
              if (!deps.getApi()) {
                reject(new Error('Turnstile API not available after script load'));
              }
            }, 5000);
          }
        },
        (err) => {
          // Clear promise on error so next call retries
          loadPromise = null;
          reject(err);
        },
      );
    });

    loadPromise.catch(() => {
      loadPromise = null;
    });

    return loadPromise;
  };
}
