import { registerHooks } from 'node:module';

/** Maps the `@/` alias (apps/web/src) so scripts run with plain Node can import app modules. */
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith('@/')) {
      return nextResolve(new URL(`../src/${specifier.slice(2)}`, import.meta.url).href, context);
    }
    return nextResolve(specifier, context);
  },
});
