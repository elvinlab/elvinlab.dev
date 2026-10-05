import { describe, expect, it } from 'vitest';

import { LOCALES } from '@/shared/i18n/index.ts';

import { resolveLocaleTarget } from './locale-target.ts';

const run = (pathname: string, current: 'es' | 'en', translations?: Record<string, string>) =>
  resolveLocaleTarget({
    pathname,
    current,
    target: current === 'es' ? 'en' : 'es',
    translations,
    locales: LOCALES,
  });

describe('resolveLocaleTarget', () => {
  it('uses the declared translation of a note, from either side', () => {
    expect(run('/notes/smoke-es/', 'es', { en: '/en/notes/smoke-en/' })).toEqual({
      href: '/en/notes/smoke-en/',
      kind: 'translation',
    });
    expect(run('/en/notes/smoke-en/', 'en', { es: '/notes/smoke-es/' })).toEqual({
      href: '/notes/smoke-es/',
      kind: 'translation',
    });
  });

  it('switches to the equivalent page when both locales have it', () => {
    expect(run('/', 'es')).toEqual({ href: '/en/', kind: 'equivalent' });
    expect(run('/en/', 'en')).toEqual({ href: '/', kind: 'equivalent' });
    expect(run('/me/', 'es')).toEqual({ href: '/en/me/', kind: 'equivalent' });
    expect(run('/en/me/', 'en')).toEqual({ href: '/me/', kind: 'equivalent' });
    expect(run('/contact/', 'es')).toEqual({ href: '/en/contact/', kind: 'equivalent' });
    expect(run('/en/contact/', 'en')).toEqual({ href: '/contact/', kind: 'equivalent' });
  });

  it('falls back to the other home for Spanish-only routes without a translation', () => {
    expect(run('/notes/', 'es')).toEqual({ href: '/en/', kind: 'home-fallback' });
    expect(run('/notes/smoke-es-next/', 'es')).toEqual({ href: '/en/', kind: 'home-fallback' });
    expect(run('/notes/smoke-es-next/', 'es', {})).toEqual({ href: '/en/', kind: 'home-fallback' });
  });

  it('falls back to the Spanish home for English routes of a Spanish-only section', () => {
    expect(run('/en/notes/x/', 'en')).toEqual({ href: '/', kind: 'home-fallback' });
  });
});
