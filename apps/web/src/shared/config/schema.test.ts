import { describe, expect, it } from 'vitest';
import { parseSiteConfig } from './schema.ts';

const valid = {
  url: 'https://example.dev',
  locales: { default: 'es', supported: ['es', 'en'] },
  identity: {
    name: 'Jane Doe',
    handle: 'janedoe',
    role: { es: 'Ingeniera full-stack', en: 'Full-stack engineer' },
    bio: { es: 'Construyo cosas.' },
    location: 'Lisboa',
    startedYear: 2019,
  },
  socials: [{ label: 'GitHub', url: 'https://github.com/janedoe', icon: 'github' }],
  features: { blog: true, comments: false, contact: true, credentials: true, experiments: true },
};

describe('parseSiteConfig', () => {
  it('accepts a complete config', () => {
    expect(parseSiteConfig(valid).identity.name).toBe('Jane Doe');
  });

  it('rejects a default locale that is not supported', () => {
    expect(() =>
      parseSiteConfig({ ...valid, locales: { default: 'fr', supported: ['es', 'en'] } }),
    ).toThrow(/default locale/);
  });

  it('requires every localized text in the default locale', () => {
    const broken = { ...valid, identity: { ...valid.identity, role: { en: 'Engineer' } } };

    expect(() => parseSiteConfig(broken)).toThrow(/default locale "es"/);
  });

  it('rejects localized texts in locales the site does not support', () => {
    const broken = {
      ...valid,
      identity: { ...valid.identity, bio: { es: 'Hola', fr: 'Salut' } },
    };

    expect(() => parseSiteConfig(broken)).toThrow(/"fr"/);
  });

  it('rejects social links that are not https URLs', () => {
    const broken = { ...valid, socials: [{ label: 'X', url: 'javascript:alert(1)', icon: 'x' }] };

    expect(() => parseSiteConfig(broken)).toThrow();
  });

  it('never accepts an email address in the config', () => {
    const broken = {
      ...valid,
      socials: [{ label: 'Mail', url: 'mailto:someone@example.dev', icon: 'mail' }],
    };

    expect(() => parseSiteConfig(broken)).toThrow();
  });
});
