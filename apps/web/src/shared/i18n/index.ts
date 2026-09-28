import { createTranslator, type LocaleConfig } from '@elvinlab/core';

/** Site locales: Spanish at the root, English under `/en`. */
export const LOCALES = {
  locales: ['es', 'en'],
  defaultLocale: 'es',
} as const satisfies LocaleConfig<'es' | 'en'>;

export type Locale = (typeof LOCALES.locales)[number];

/** Interface strings. Spanish is complete; English falls back to Spanish for missing keys. */
export const t = createTranslator({
  defaultLocale: 'es',
  dictionaries: {
    es: {
      'placeholder.title': 'Muy pronto',
      'placeholder.body': 'Esqueleto funcional: Astro, Tailwind v4 y Cloudflare Workers.',
      'language.switch': 'Read in English',
      'language.hint': 'También disponible en español',
      'language.hint.action': 'Ver en español',
      'language.hint.dismiss': 'Cerrar',
      'theme.switch': 'Cambiar tema',
      'skip.content': 'Saltar al contenido',
      'nav.label': 'Principal',
      'nav.menu': 'Menú',
      'nav.home': 'Inicio',
      'nav.notes': 'Notas',
      'nav.experiments': 'Experimentos',
      'nav.about': 'Sobre mí',
      'nav.contact': 'Contacto',
      'footer.social': 'Redes',
      'notFound.title': 'Página no encontrada',
      'notFound.body': 'Esta página no existe o se movió.',
      'notFound.home': 'Volver al inicio',
    },
    en: {
      'placeholder.title': 'Coming soon',
      'placeholder.body': 'Walking skeleton: Astro, Tailwind v4 and Cloudflare Workers.',
      'language.switch': 'Leer en español',
      'language.hint': 'Also available in English',
      'language.hint.action': 'Read in English',
      'language.hint.dismiss': 'Dismiss',
      'theme.switch': 'Switch theme',
      'skip.content': 'Skip to content',
      'nav.label': 'Main',
      'nav.menu': 'Menu',
      'nav.home': 'Home',
      'nav.notes': 'Notes',
      'nav.experiments': 'Experiments',
      'nav.about': 'About',
      'nav.contact': 'Contact',
      'footer.social': 'Social links',
      'notFound.title': 'Page not found',
      'notFound.body': 'This page does not exist or has moved.',
      'notFound.home': 'Back to home',
    },
  },
});
