import { describe, expect, it } from 'vitest';

import { introText, labWords } from './header-text.ts';

describe('labWords', () => {
  it('uses the configured words of the locale and adds the comment marker', () => {
    expect(labWords({ es: ['construir', 'probar'], en: ['build'] }, 'en', 'es')).toEqual([
      '// build',
    ]);
  });

  it('does not double a marker the owner already wrote', () => {
    expect(labWords({ es: ['// construir', '//  probar'] }, 'es', 'es')).toEqual([
      '// construir',
      '// probar',
    ]);
  });

  it('falls back to the default locale, and renders nothing when none is configured', () => {
    expect(labWords({ es: ['uno'] }, 'en', 'es')).toEqual(['// uno']);
    expect(labWords(undefined, 'es', 'es')).toEqual([]);
    expect(labWords({}, 'es', 'es')).toEqual([]);
  });

  it('shows at most six words', () => {
    const many = ['a', 'b', 'c', 'd', 'e', 'f', 'g'];
    expect(labWords({ es: many }, 'es', 'es')).toHaveLength(6);
  });
});

describe('introText', () => {
  it('prefers the configured intro, then the default locale, then the interface text', () => {
    expect(introText({ es: 'Hola', en: 'Hi' }, 'en', 'es', 'fallback')).toBe('Hi');
    expect(introText({ es: 'Hola' }, 'en', 'es', 'fallback')).toBe('Hola');
    expect(introText(undefined, 'en', 'es', 'fallback')).toBe('fallback');
  });
});
