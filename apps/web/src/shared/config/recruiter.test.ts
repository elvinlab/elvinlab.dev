import { describe, expect, it } from 'vitest';

import { resolveCvUrl } from './recruiter.ts';

describe('resolveCvUrl', () => {
  it('returns nothing when no CV is configured', () => {
    expect(resolveCvUrl(undefined, 'en', 'es')).toBeUndefined();
  });

  it('serves a single URL to every locale', () => {
    expect(resolveCvUrl('https://x.dev/cv.pdf', 'en', 'es')).toBe('https://x.dev/cv.pdf');
  });

  it('picks the URL of the visitor locale', () => {
    const cvUrl = { es: 'https://x.dev/cv-es.pdf', en: 'https://x.dev/cv-en.pdf' };
    expect(resolveCvUrl(cvUrl, 'en', 'es')).toBe('https://x.dev/cv-en.pdf');
    expect(resolveCvUrl(cvUrl, 'es', 'es')).toBe('https://x.dev/cv-es.pdf');
  });

  it('falls back to the default locale when the visitor locale has no CV', () => {
    expect(resolveCvUrl({ es: 'https://x.dev/cv-es.pdf' }, 'en', 'es')).toBe(
      'https://x.dev/cv-es.pdf',
    );
  });

  it('returns nothing when neither the locale nor the default has a CV', () => {
    expect(resolveCvUrl({ fr: 'https://x.dev/cv-fr.pdf' }, 'en', 'es')).toBeUndefined();
  });
});
