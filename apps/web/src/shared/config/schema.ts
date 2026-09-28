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
    /** Each flag is one feature: off means its routes are not generated and its nav entry is hidden. */
    features: z.object({
      blog: z.boolean(),
      comments: z.boolean(),
      contact: z.boolean(),
      credentials: z.boolean(),
      experiments: z.boolean(),
    }),
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
