import { describe, expect, it } from 'vitest';

import { parseSiteConfig } from './schema.ts';

const valid = {
  url: 'https://example.dev',
  title: 'janedoe.dev',
  description: { es: 'Notas y proyectos.', en: 'Notes and projects.' },
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
  features: {
    blog: true,
    comments: false,
    contact: true,
    credentials: true,
    experiments: true,
    me: true,
  },
  background: { galaxy: true, cursorWaves: false },
  recruiter: {
    available: true,
    status: { es: 'Disponible', en: 'Available' },
    lookingFor: { es: 'Full-stack / IA', en: 'Full-stack / AI' },
  },
  me: {
    timezone: 'UTC-6',
    workMode: { es: 'Remoto', en: 'Remote' },
    intro: { es: 'Construyo cosas.', en: 'I build things.' },
    facts: [
      { value: { es: '5+ años', en: '5+ years' }, label: { es: 'construyendo', en: 'building' } },
    ],
    strengths: [
      {
        icon: 'layers',
        title: { es: 'Arquitectura', en: 'Architecture' },
        body: { es: 'Límites claros.', en: 'Clear boundaries.' },
      },
    ],
    stack: [{ label: { es: 'Lenguajes', en: 'Languages' }, items: ['TypeScript'] }],
  },
};

const validWithNotice = {
  ...valid,
  notice: { es: 'En construcción', en: 'Under construction' },
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

  it('requires the site description in the default locale', () => {
    expect(() => parseSiteConfig({ ...valid, description: { en: 'Notes' } })).toThrow(
      /default locale "es"[\s\S]*at description/,
    );
  });

  it('rejects localized texts in locales the site does not support', () => {
    const broken = {
      ...valid,
      identity: { ...valid.identity, bio: { es: 'Hola', fr: 'Salut' } },
    };

    expect(() => parseSiteConfig(broken)).toThrow(/"fr"/);
  });

  it('requires the recruiter status in the default locale', () => {
    const broken = { ...valid, recruiter: { ...valid.recruiter, status: { en: 'Available' } } };
    expect(() => parseSiteConfig(broken)).toThrow(/default locale "es"/);
  });

  it('rejects a recruiter cvUrl that is not https', () => {
    const broken = { ...valid, recruiter: { ...valid.recruiter, cvUrl: 'http://x.dev/cv.pdf' } };
    expect(() => parseSiteConfig(broken)).toThrow();
  });

  it('defaults both background effects and lets each be toggled', () => {
    const { background: _, ...rest } = valid;
    expect(parseSiteConfig(rest).background).toEqual({ galaxy: true, cursorWaves: false });
    expect(
      parseSiteConfig({ ...valid, background: { galaxy: false, cursorWaves: true } }).background
        .cursorWaves,
    ).toBe(true);
    expect(() =>
      parseSiteConfig({ ...valid, background: { galaxy: 'yes', cursorWaves: false } }),
    ).toThrow();
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

  it('accepts config without notice', () => {
    expect(parseSiteConfig(valid).identity.name).toBe('Jane Doe');
  });

  it('accepts config with notice in both locales', () => {
    expect(parseSiteConfig(validWithNotice).notice).toEqual({
      es: 'En construcción',
      en: 'Under construction',
    });
  });

  it('rejects notice missing the default locale', () => {
    const broken = { ...valid, notice: { en: 'Under construction' } };
    expect(() => parseSiteConfig(broken)).toThrow(/default locale "es"/);
  });

  it('rejects notice with an unsupported locale', () => {
    const broken = { ...valid, notice: { es: 'En construcción', fr: 'En construction' } };
    expect(() => parseSiteConfig(broken)).toThrow(/"fr"/);
  });

  it('rejects config missing me feature', () => {
    const broken = {
      ...valid,
      features: { ...valid.features, me: undefined as unknown as boolean },
    };
    expect(() => parseSiteConfig(broken)).toThrow();
  });
});
