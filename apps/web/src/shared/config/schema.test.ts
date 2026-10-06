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
    marks: true,
    subscribe: false,
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

  describe('appearance and home', () => {
    it("defaults to the full appearance so existing configs keep today's look", () => {
      const config = parseSiteConfig(valid);
      expect(config.appearance).toBe('full');
      expect(config.home).toEqual({});
    });

    it('accepts both presets', () => {
      expect(parseSiteConfig({ ...valid, appearance: 'minimal' }).appearance).toBe('minimal');
      expect(parseSiteConfig({ ...valid, appearance: 'full' }).appearance).toBe('full');
    });

    it('rejects an unknown preset and lists the allowed ones', () => {
      expect(() => parseSiteConfig({ ...valid, appearance: 'x' })).toThrow(/appearance/);
      expect(() => parseSiteConfig({ ...valid, appearance: 'x' })).toThrow(/minimal/);
    });

    it('accepts boolean overrides for every home section', () => {
      const home = {
        heroPills: true,
        authorCard: false,
        hiringCard: true,
        marks: false,
        now: true,
        pillars: false,
        notebookIndex: true,
        experiments: false,
      };
      expect(parseSiteConfig({ ...valid, home }).home).toEqual(home);
    });

    it('rejects an unknown home section instead of ignoring a typo', () => {
      expect(() => parseSiteConfig({ ...valid, home: { pillar: false } })).toThrow(/pillar/);
    });

    it('rejects a non-boolean override', () => {
      expect(() => parseSiteConfig({ ...valid, home: { now: 'off' } })).toThrow(/now/);
    });
  });

  it('rejects the retired home.labLog switch (renamed to home.now)', () => {
    expect(() => parseSiteConfig({ ...valid, home: { labLog: true } })).toThrow(/labLog/);
  });

  describe('now', () => {
    const item = { kind: 'focus', text: { es: 'Optimizar IA', en: 'Optimizing AI' } };
    const withNow = (now: unknown) => ({ ...valid, now });
    const block = { updatedAt: '2026-10-02', items: [item] };

    it('is optional (without it the Now card does not render)', () => {
      expect(parseSiteConfig(valid).now).toBeUndefined();
    });

    it('accepts a valid block', () => {
      expect(parseSiteConfig(withNow(block)).now).toEqual(block);
    });

    it('accepts one to three items of every kind, with an optional href', () => {
      const items = [
        { ...item, kind: 'building', href: 'https://example.dev/x' },
        { ...item, kind: 'exploring', href: '/notes/' },
        { ...item, kind: 'learning' },
      ];
      expect(parseSiteConfig(withNow({ ...block, items })).now?.items).toHaveLength(3);
    });

    it('rejects more than three items', () => {
      const items = [item, item, item, item];
      expect(() => parseSiteConfig(withNow({ ...block, items }))).toThrow(/items/);
    });

    it('rejects an empty item list', () => {
      expect(() => parseSiteConfig(withNow({ ...block, items: [] }))).toThrow(/items/);
    });

    it.each(['2026-13-40', '10/02/2026', '2026-02-30', '2 October 2026', ''])(
      'rejects the date %s (a real YYYY-MM-DD date is required)',
      (updatedAt) => {
        expect(() => parseSiteConfig(withNow({ ...block, updatedAt }))).toThrow(/updatedAt/);
      },
    );

    it('requires the item text in the default locale', () => {
      const items = [{ kind: 'focus', text: { en: 'Optimizing AI' } }];
      expect(() => parseSiteConfig(withNow({ ...block, items }))).toThrow(
        /default locale "es"[\s\S]*now/,
      );
    });

    it('rejects item texts in locales the site does not support', () => {
      const items = [{ kind: 'focus', text: { es: 'Hola', fr: 'Salut' } }];
      expect(() => parseSiteConfig(withNow({ ...block, items }))).toThrow(/"fr"/);
    });

    it('rejects an unknown kind', () => {
      const items = [{ ...item, kind: 'sleeping' }];
      expect(() => parseSiteConfig(withNow({ ...block, items }))).toThrow(/kind/);
    });

    it.each([
      'http://example.dev',
      'javascript:alert(1)',
      '//evil.example',
      'notes/',
      'mailto:someone@example.dev',
    ])('rejects the href %s (https or a site path only)', (href) => {
      const items = [{ ...item, href }];
      expect(() => parseSiteConfig(withNow({ ...block, items }))).toThrow(/href/);
    });

    it('rejects unknown keys on the block and on an item', () => {
      expect(() => parseSiteConfig(withNow({ ...block, extra: 1 }))).toThrow();
      expect(() =>
        parseSiteConfig(withNow({ ...block, items: [{ ...item, extra: 1 }] })),
      ).toThrow();
    });
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

  describe('identity.avatar', () => {
    const withAvatar = (avatar: unknown) => ({ ...valid, identity: { ...valid.identity, avatar } });

    it('is optional (initials are shown without it)', () => {
      expect(parseSiteConfig(valid).identity.avatar).toBeUndefined();
    });

    it('accepts the file name of an image placed in src/assets', () => {
      expect(parseSiteConfig(withAvatar('avatar.png')).identity.avatar).toBe('avatar.png');
      expect(parseSiteConfig(withAvatar('me.JPG')).identity.avatar).toBe('me.JPG');
    });

    it.each(['/avatar.png', '../avatar.png', 'photos/avatar.png', 'avatar.gif', 'avatar'])(
      'rejects %s (only a bare png, jpg, webp or avif file name is allowed)',
      (avatar) => {
        expect(() => parseSiteConfig(withAvatar(avatar))).toThrow(/avatar/);
      },
    );
  });

  describe('identity.photo', () => {
    const withPhoto = (photo: unknown) => ({ ...valid, identity: { ...valid.identity, photo } });

    it('is optional (the avatar is used on /me without it)', () => {
      expect(parseSiteConfig(valid).identity.photo).toBeUndefined();
    });

    it('accepts the file name of an image placed in src/assets', () => {
      expect(parseSiteConfig(withPhoto('photo.jpg')).identity.photo).toBe('photo.jpg');
      expect(parseSiteConfig(withPhoto('me.JPG')).identity.photo).toBe('me.JPG');
    });

    it.each(['/photo.jpg', '../photo.jpg', 'photos/photo.jpg', 'photo.gif', 'photo'])(
      'rejects %s (only a bare png, jpg, webp or avif file name is allowed)',
      (photo) => {
        expect(() => parseSiteConfig(withPhoto(photo))).toThrow(/photo/);
      },
    );
  });

  it('rejects a recruiter cvUrl that is not https', () => {
    const broken = { ...valid, recruiter: { ...valid.recruiter, cvUrl: 'http://x.dev/cv.pdf' } };
    expect(() => parseSiteConfig(broken)).toThrow();
  });

  describe('recruiter.cvUrl per locale', () => {
    const withCv = (cvUrl: unknown) => ({ ...valid, recruiter: { ...valid.recruiter, cvUrl } });

    it('still accepts one https URL for every locale', () => {
      expect(parseSiteConfig(withCv('https://x.dev/cv.pdf')).recruiter.cvUrl).toBe(
        'https://x.dev/cv.pdf',
      );
    });

    it('accepts one https URL per locale', () => {
      const cvUrl = { es: 'https://x.dev/cv-es.pdf', en: 'https://x.dev/cv-en.pdf' };
      expect(parseSiteConfig(withCv(cvUrl)).recruiter.cvUrl).toEqual(cvUrl);
    });

    it('rejects a per-locale URL that is not https', () => {
      expect(() => parseSiteConfig(withCv({ es: 'http://x.dev/cv-es.pdf' }))).toThrow();
    });

    it('rejects an empty per-locale map', () => {
      expect(() => parseSiteConfig(withCv({}))).toThrow();
    });
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

  it('rejects config missing the subscribe feature', () => {
    const { subscribe: _omitted, ...features } = valid.features;
    expect(() => parseSiteConfig({ ...valid, features })).toThrow(/subscribe/);
  });

  it('rejects config missing the marks feature', () => {
    const { marks: _omitted, ...features } = valid.features;
    expect(() => parseSiteConfig({ ...valid, features })).toThrow(/marks/);
  });

  describe('marks block', () => {
    it('applies the defaults when the block is omitted', () => {
      expect(parseSiteConfig(valid).marks).toEqual({
        animation: 'stamp',
        maxPerVisitor: 50,
        showCountFrom: 5,
      });
    });

    it('accepts a complete block', () => {
      const marks = { animation: 'pulse', maxPerVisitor: 10, showCountFrom: 0 };
      expect(parseSiteConfig({ ...valid, marks }).marks).toEqual(marks);
    });

    it('fills the omitted keys of a partial block', () => {
      expect(parseSiteConfig({ ...valid, marks: { animation: 'none' } }).marks).toEqual({
        animation: 'none',
        maxPerVisitor: 50,
        showCountFrom: 5,
      });
    });

    it.each(['stamp', 'burst', 'pulse', 'none'])('accepts the %s animation', (animation) => {
      expect(parseSiteConfig({ ...valid, marks: { animation } }).marks.animation).toBe(animation);
    });

    it('rejects an unknown animation', () => {
      expect(() => parseSiteConfig({ ...valid, marks: { animation: 'confetti' } })).toThrow(
        /animation/,
      );
    });

    it.each([
      ['maxPerVisitor', 0],
      ['maxPerVisitor', 201],
      ['maxPerVisitor', 1.5],
      ['showCountFrom', -1],
      ['showCountFrom', 1001],
    ])('rejects %s = %s', (key, value) => {
      expect(() => parseSiteConfig({ ...valid, marks: { [key]: value } })).toThrow(new RegExp(key));
    });
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
