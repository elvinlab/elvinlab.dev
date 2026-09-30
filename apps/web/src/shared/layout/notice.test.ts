import { describe, expect, it, vi } from 'vitest';

describe('getNotice', () => {
  it('returns the text for the requested locale', async () => {
    vi.resetModules();
    vi.doMock('@/shared/config/index.ts', () => ({
      site: {
        notice: { es: 'Sitio en construcción', en: 'Under construction' },
        locales: { default: 'es', supported: ['es', 'en'] },
      },
    }));

    const { getNotice } = await import('./notice.ts');
    expect(getNotice('es')).toBe('Sitio en construcción');
    expect(getNotice('en')).toBe('Under construction');
  });

  it('falls back to the default locale when that locale is missing', async () => {
    vi.resetModules();
    vi.doMock('@/shared/config/index.ts', () => ({
      site: {
        notice: { es: 'Sitio en construcción' },
        locales: { default: 'es', supported: ['es', 'en'] },
      },
    }));

    const { getNotice } = await import('./notice.ts');
    expect(getNotice('en')).toBe('Sitio en construcción');
  });

  it('returns undefined when config has no notice', async () => {
    vi.resetModules();
    vi.doMock('@/shared/config/index.ts', () => ({
      site: {
        notice: undefined,
        locales: { default: 'es', supported: ['es', 'en'] },
      },
    }));

    const { getNotice } = await import('./notice.ts');
    expect(getNotice('es')).toBeUndefined();
    expect(getNotice('en')).toBeUndefined();
  });
});
