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
    changelog: true,
    readingMode: true,
  },
  legal: { privacyUpdated: '2026-10-01', termsUpdated: '2026-10-01' },
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

  describe('recruiter.openToWork', () => {
    it('defaults to true so existing configs keep the green status dot', () => {
      expect(parseSiteConfig(valid).recruiter.openToWork).toBe(true);
    });

    it('accepts false for an owner who is not open to work', () => {
      const config = { ...valid, recruiter: { ...valid.recruiter, openToWork: false } };
      expect(parseSiteConfig(config).recruiter.openToWork).toBe(false);
    });

    it('rejects a non-boolean value', () => {
      const broken = { ...valid, recruiter: { ...valid.recruiter, openToWork: 'no' } };
      expect(() => parseSiteConfig(broken)).toThrow(/openToWork/);
    });
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

  describe('giscus', () => {
    const giscus = {
      repo: 'janedoe/janedoe.dev',
      repoId: 'R_kgDOExample',
      category: 'Comments',
      categoryId: 'DIC_kwDOExample',
    };

    it('is optional', () => {
      expect(parseSiteConfig(valid).giscus).toBeUndefined();
    });

    it('accepts a complete giscus block', () => {
      expect(parseSiteConfig({ ...valid, giscus }).giscus).toEqual(giscus);
    });

    it('rejects a repo that is not owner/name', () => {
      expect(() => parseSiteConfig({ ...valid, giscus: { ...giscus, repo: 'janedoe' } })).toThrow(
        /repo/,
      );
    });

    it('rejects a block with a missing id', () => {
      const { categoryId: _omitted, ...incomplete } = giscus;
      expect(() => parseSiteConfig({ ...valid, giscus: incomplete })).toThrow(/categoryId/);
    });
  });

  it('rejects config missing the readingMode feature', () => {
    const { readingMode: _omitted, ...features } = valid.features;
    expect(() => parseSiteConfig({ ...valid, features })).toThrow(/readingMode/);
  });

  describe('integrations', () => {
    it('defaults to no integrations', () => {
      expect(parseSiteConfig(valid).integrations).toEqual({});
    });

    it('accepts the analytics token and the Turnstile site key', () => {
      const config = {
        ...valid,
        integrations: { cloudflareAnalyticsToken: 'tok123', turnstileSiteKey: '0xKEY' },
      };
      expect(parseSiteConfig(config).integrations).toEqual({
        cloudflareAnalyticsToken: 'tok123',
        turnstileSiteKey: '0xKEY',
      });
    });

    it('rejects an empty value instead of silently disabling the integration', () => {
      const broken = { ...valid, integrations: { turnstileSiteKey: '  ' } };
      expect(() => parseSiteConfig(broken)).toThrow(/turnstileSiteKey/);
    });
  });

  describe('legal', () => {
    it('keeps the two last-updated dates', () => {
      expect(parseSiteConfig(valid).legal).toEqual({
        privacyUpdated: '2026-10-01',
        termsUpdated: '2026-10-01',
      });
    });

    it('is required: a page that claims a date needs one', () => {
      const { legal: _omitted, ...withoutLegal } = valid;
      expect(() => parseSiteConfig(withoutLegal)).toThrow(/legal/);
    });

    it('rejects a date that is not YYYY-MM-DD', () => {
      const broken = { ...valid, legal: { ...valid.legal, termsUpdated: '1 October 2026' } };
      expect(() => parseSiteConfig(broken)).toThrow(/termsUpdated/);
    });
  });

  it('rejects config missing me feature', () => {
    const broken = {
      ...valid,
      features: { ...valid.features, me: undefined as unknown as boolean },
    };
    expect(() => parseSiteConfig(broken)).toThrow();
  });
});
