import { createTranslator, type LocaleConfig } from '@elvinlab/core';

/** Site locales: English at the root, Spanish under `/es`. */
export const LOCALES = {
  locales: ['en', 'es'],
  defaultLocale: 'en',
} as const satisfies LocaleConfig<'en' | 'es'>;

export type Locale = (typeof LOCALES.locales)[number];

/** Interface strings. English is complete; Spanish falls back to English for missing keys. */
export const t = createTranslator({
  defaultLocale: 'en',
  dictionaries: {
    en: {
      'placeholder.title': 'Coming soon',
      'placeholder.body': 'Walking skeleton: Astro, Tailwind v4 and Cloudflare Workers.',
      'language.switch': 'Leer en español',
      'theme.switch': 'Switch theme',
    },
    es: {
      'placeholder.title': 'Muy pronto',
      'placeholder.body': 'Esqueleto funcional: Astro, Tailwind v4 y Cloudflare Workers.',
      'language.switch': 'Read in English',
      'theme.switch': 'Cambiar tema',
    },
  },
});
