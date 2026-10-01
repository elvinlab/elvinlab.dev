import { z } from 'zod';

const httpsUrl = z.url({ protocol: /^https$/, error: 'must be an https URL' });

/** Text keyed by locale, e.g. `{ es: 'Hola', en: 'Hello' }`. Checked against `locales` below. */
const localized = z.record(z.string(), z.string().trim().min(1));

const siteConfigSchema = z
  .object({
    url: httpsUrl,
    /** Site name: browser tab suffix, Open Graph site name, footer. */
    title: z.string().trim().min(1),
    description: localized,
    locales: z.object({
      default: z.string().min(2),
      supported: z.array(z.string().min(2)).nonempty(),
    }),
    identity: z.object({
      name: z.string().trim().min(1),
      handle: z.string().regex(/^[a-z0-9-]+$/),
      role: localized,
      bio: localized,
      location: z.string().trim().min(1).optional(),
      /** First year of professional work; years of experience are derived from it. */
      startedYear: z.int().min(1970),
    }),
    /** https only: an email address never belongs in public config (contact goes through /contact). */
    socials: z.array(
      z.object({ label: z.string().min(1), url: httpsUrl, icon: z.string().min(1) }),
    ),
    /** Banner background effects, each toggled independently (all read the theme palette). */
    background: z
      .object({
        /** Nebula clouds + a twinkling star field. */
        galaxy: z.boolean(),
        /** Slow colour waves with a ripple that follows the pointer. */
        cursorWaves: z.boolean(),
      })
      .default({ galaxy: true, cursorWaves: false }),
    /** Recruiter card data (home "Hiring?" card and /me). cvUrl is https-only and optional. */
    recruiter: z.object({
      available: z.boolean(),
      status: localized,
      lookingFor: localized,
      cvUrl: httpsUrl.optional(),
    }),
    /** Singular /me profile data (list data like experience/credentials lives in content). */
    me: z.object({
      /** Display timezone, e.g. `UTC−6`. */
      timezone: z.string().trim().min(1),
      workMode: localized,
      /** The "what I bring" intro paragraph. */
      intro: localized,
      /** At-a-glance strip: value + label pairs (the design shows four). */
      facts: z.array(z.object({ value: localized, label: localized })).min(1),
      /** "What I bring" tiles: an icon name, a title and a body. */
      strengths: z
        .array(z.object({ icon: z.string().min(1), title: localized, body: localized }))
        .min(1),
      /** Tech-stack groups: a label and its items. */
      stack: z
        .array(z.object({ label: localized, items: z.array(z.string().min(1)).min(1) }))
        .min(1),
    }),
    /** Each flag is one feature: off means its routes are not generated and its nav entry is hidden. */
    features: z.object({
      blog: z.boolean(),
      comments: z.boolean(),
      contact: z.boolean(),
      credentials: z.boolean(),
      experiments: z.boolean(),
      /** /me recruiter page: off hides it from the nav, marks it noindex and keeps it out of the sitemap. */
      me: z.boolean(),
    }),
    /** Optional site-wide notice strip (localized). White-label: remove the key to hide. */
    notice: localized.optional(),
  })
  .superRefine((config, ctx) => {
    const { default: defaultLocale, supported } = config.locales;
    if (!supported.includes(defaultLocale)) {
      ctx.addIssue({
        code: 'custom',
        path: ['locales', 'default'],
        message: `default locale "${defaultLocale}" is not in supported locales`,
      });
    }

    const texts = {
      description: { path: ['description'], text: config.description },
      role: { path: ['identity', 'role'], text: config.identity.role },
      bio: { path: ['identity', 'bio'], text: config.identity.bio },
      'recruiter.status': { path: ['recruiter', 'status'], text: config.recruiter.status },
      'recruiter.lookingFor': {
        path: ['recruiter', 'lookingFor'],
        text: config.recruiter.lookingFor,
      },
      'me.workMode': { path: ['me', 'workMode'], text: config.me.workMode },
      'me.intro': { path: ['me', 'intro'], text: config.me.intro },
      ...(config.notice && { notice: { path: ['notice'], text: config.notice } }),
    };
    for (const { path, text } of Object.values(texts)) {
      if (!(defaultLocale in text)) {
        ctx.addIssue({
          code: 'custom',
          path,
          message: `missing default locale "${defaultLocale}"`,
        });
      }
      for (const locale of Object.keys(text)) {
        if (!supported.includes(locale)) {
          ctx.addIssue({ code: 'custom', path, message: `unsupported locale "${locale}"` });
        }
      }
    }
  });

export type SiteConfig = z.infer<typeof siteConfigSchema>;
export type Feature = keyof SiteConfig['features'];

/** Validates the site config; throws with every problem listed so a bad config fails the build. */
export function parseSiteConfig(input: unknown): SiteConfig {
  const result = siteConfigSchema.safeParse(input);
  if (!result.success) {
    throw new Error(`Invalid site config:\n${z.prettifyError(result.error)}`);
  }
  return result.data;
}
