import { describe, expect, it } from 'vitest';

import { t } from './index.ts';

describe('language fallback strings', () => {
  it.each(['language.switch.home', 'language.hint.home', 'language.hint.home.action'] as const)(
    '%s is translated in both locales',
    (key) => {
      expect(t('es', key)).not.toBe(key);
      expect(t('en', key)).not.toBe(key);
      expect(t('es', key)).not.toBe(t('en', key));
    },
  );
});
