import { describe, expect, it } from 'vitest';
import { buildThemeBootScript, THEME_STORAGE_KEY } from './boot-script.ts';
import { resolveTheme, type ThemeOption } from './resolve-theme.ts';

const themes: ThemeOption[] = [
  { name: 'lab-dark', scheme: 'dark' },
  { name: 'lab-light', scheme: 'light' },
];
const base = { themes, defaultTheme: 'lab-dark' };

describe('resolveTheme', () => {
  it('uses the stored theme when it exists', () => {
    expect(resolveTheme({ ...base, stored: 'lab-light', prefersDark: true })).toBe('lab-light');
  });

  it('ignores a stored theme that is not available', () => {
    expect(resolveTheme({ ...base, stored: 'retired', prefersDark: true })).toBe('lab-dark');
  });

  it('follows the system preference when nothing is stored', () => {
    expect(resolveTheme({ ...base, stored: null, prefersDark: false })).toBe('lab-light');
    expect(resolveTheme({ ...base, stored: null, prefersDark: true })).toBe('lab-dark');
  });

  it('prefers the default theme when it matches the system scheme', () => {
    const many: ThemeOption[] = [{ name: 'other-dark', scheme: 'dark' }, ...themes];
    expect(
      resolveTheme({ themes: many, defaultTheme: 'lab-dark', stored: null, prefersDark: true }),
    ).toBe('lab-dark');
  });

  it('falls back to the default theme when no theme matches the system scheme', () => {
    const darkOnly: ThemeOption[] = [{ name: 'lab-dark', scheme: 'dark' }];
    expect(
      resolveTheme({
        themes: darkOnly,
        defaultTheme: 'lab-dark',
        stored: null,
        prefersDark: false,
      }),
    ).toBe('lab-dark');
  });
});

describe('buildThemeBootScript', () => {
  const run = (stored: string | null, prefersDark: boolean): string | undefined => {
    const attributes: Record<string, string> = {};
    const context = {
      localStorage: { getItem: (key: string) => (key === THEME_STORAGE_KEY ? stored : null) },
      matchMedia: (query: string) => ({ matches: query.includes('dark') && prefersDark }),
      document: {
        documentElement: { setAttribute: (k: string, v: string) => (attributes[k] = v) },
      },
    };
    new Function('localStorage', 'matchMedia', 'document', buildThemeBootScript(base))(
      context.localStorage,
      context.matchMedia,
      context.document,
    );
    return attributes['data-theme'];
  };

  it('applies the resolved theme to <html> before paint', () => {
    expect(run('lab-light', true)).toBe('lab-light');
    expect(run(null, false)).toBe('lab-light');
    expect(run(null, true)).toBe('lab-dark');
  });

  it('never throws when storage is unavailable', () => {
    const script = buildThemeBootScript(base);
    const failingStorage = {
      getItem: () => {
        throw new Error('blocked');
      },
    };
    const attributes: Record<string, string> = {};
    const document = {
      documentElement: { setAttribute: (k: string, v: string) => (attributes[k] = v) },
    };

    expect(() =>
      new Function('localStorage', 'matchMedia', 'document', script)(
        failingStorage,
        () => ({ matches: true }),
        document,
      ),
    ).not.toThrow();
    expect(attributes['data-theme']).toBe('lab-dark');
  });
});
