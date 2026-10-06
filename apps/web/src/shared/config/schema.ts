import { z } from 'zod';

const httpsUrl = z.url({ protocol: /^https$/, error: 'must be an https URL' });

/** A bare image file name: no directories, so it can only point inside `src/assets`. */
const AVATAR_FILE = /^[\w-][\w.-]*\.(?:png|jpe?g|webp|avif)$/i;

/** A link target: an https URL, or a path inside the site (`/notes/`, never protocol-relative `//`). */
const siteHref = z.union([httpsUrl, z.string().regex(/^\/(?!\/)\S*$/)], {
  error: 'must be an https URL or a site path starting with "/"',
});

/** Text keyed by locale, e.g. `{ es: 'Hola', en: 'Hello' }`. Checked against `locales` below. */
const localized = z.record(z.string(), z.string().trim().min(1));

/**
 * The shape of `src/site.config.ts`: the one file that holds every setting of the site. Each field
 * is described with `.describe()`: those texts are the source of the reference tables in the
 * configuration guide (`pnpm docs:config`), and a test fails if a field has no description.
 */
export const siteConfigSchema = z
  .object({
    url: httpsUrl.describe(
      'Canonical origin of the site (https). Used for canonical links, the sitemap and share images.',
    ),
    title: z
      .string()
      .trim()
      .min(1)
      .describe('Site name: browser tab suffix, Open Graph site name and footer.'),
    description: localized.describe(
      'Default meta description per locale (shown in search results and link previews).',
    ),
    locales: z
      .object({
        default: z
          .string()
          .min(2)
          .describe('Default locale, served without a URL prefix (for example `es` at `/`).'),
        supported: z
          .array(z.string().min(2))
          .nonempty()
          .describe(
            'Every locale the UI is translated into; non-default ones live under `/<locale>/`.',
          ),
      })
      .describe('Languages of the site.'),
    identity: z
      .object({
        name: z.string().trim().min(1).describe('Full name of the site owner.'),
        handle: z
          .string()
          .regex(/^[a-z0-9-]+$/)
          .describe('Short lowercase handle shown in the navbar and footer wordmark.'),
        role: localized.describe('One-line professional headline per locale.'),
        bio: localized.describe('Short bio per locale (also the description of the /me page).'),
        location: z
          .string()
          .trim()
          .min(1)
          .optional()
          .describe('City or country shown on /me and share cards.'),
        startedYear: z
          .int()
          .min(1970)
          .describe('First year of professional work; years of experience are derived from it.'),
        avatar: z
          .string()
          .trim()
          .regex(AVATAR_FILE, 'must be a bare file name (png, jpg, webp or avif) in src/assets')
          .optional()
          .describe(
            'File name of a profile photo placed in `apps/web/src/assets/` (for example `avatar.png`); it is optimized at build time. Omit to show initials.',
          ),
        photo: z
          .string()
          .trim()
          .regex(AVATAR_FILE, 'must be a bare file name (png, jpg, webp or avif) in src/assets')
          .optional()
          .describe(
            'Portrait shown only on /me (and in the /me share card); `avatar` is used elsewhere. Falls back to `avatar` when omitted.',
          ),
      })
      .describe('Who the site is about.'),
    appearance: z
      .enum(['minimal', 'full'])
      .default('full')
      .describe(
        'Visual preset. `minimal` is the calm look (smaller type, fewer home sections); `full` is the original look. Defaults to `full` so a config written before the preset existed does not change.',
      ),
    home: z
      .strictObject({
        heroPills: z
          .boolean()
          .optional()
          .describe('The three keyword pills under the hero intro (desktop only).'),
        authorCard: z
          .boolean()
          .optional()
          .describe('The sidebar author card: photo, name, bio and social buttons.'),
        hiringCard: z
          .boolean()
          .optional()
          .describe(
            'The sidebar "Hiring?" recruiter card: availability and links to /me and the CV.',
          ),
        marks: z
          .boolean()
          .optional()
          .describe(
            'The sidebar footprint card (heart button with its own counter). It also needs the top-level `features.marks`: with that flag off it never shows.',
          ),
        now: z
          .boolean()
          .optional()
          .describe(
            'The sidebar "Now" card: what you are focused on, from the top-level `now` block. It also needs that block: without it the card never shows.',
          ),
        pillars: z
          .boolean()
          .optional()
          .describe('The four pillars strip at the bottom of the home (desktop only).'),
        notebookIndex: z
          .boolean()
          .optional()
          .describe('The notebook index: compact rows for the notes after the latest one.'),
        experiments: z
          .boolean()
          .optional()
          .describe(
            'The experiments section of the home. Also needs `features.experiments`: with that flag off it never shows.',
          ),
      })
      .default({})
      .describe(
        'Show or hide each home section; a key you set wins over the `appearance` preset, a key you omit follows it. `minimal` hides `heroPills` and `pillars`; `full` shows everything. A hidden section renders nothing.',
      ),
    now: z
      .strictObject({
        updatedAt: z.iso
          .date()
          .describe('Date of the last update of the block (`YYYY-MM-DD`), shown on the card.'),
        items: z
          .array(
            z.strictObject({
              kind: z
                .enum(['focus', 'building', 'exploring', 'learning'])
                .describe('Label of the row: `focus`, `building`, `exploring` or `learning`.'),
              text: localized.describe('What it is, per locale (the default locale is required).'),
              href: siteHref
                .optional()
                .describe(
                  'Optional link for the text: an https URL or a site path starting with `/`.',
                ),
            }),
          )
          .min(1)
          .max(3)
          .describe('One to three rows, in display order.'),
      })
      .optional()
      .describe(
        'Optional dated "Now" block: what you are focused on, shown as a sidebar card on the home. Remove the key to hide the card. Update `updatedAt` whenever you change the rows.',
      ),
    socials: z
      .array(
        z.object({
          label: z.string().min(1).describe('Link text and accessible name.'),
          url: httpsUrl.describe(
            'Profile URL (https only: an email address never belongs in public config).',
          ),
          icon: z.string().min(1).describe('Icon name (`github`, `linkedin`, ...).'),
        }),
      )
      .describe(
        'Social profile links shown in the footer and used as `sameAs` in structured data.',
      ),
    background: z
      .object({
        galaxy: z.boolean().describe('Nebula clouds and a twinkling star field.'),
        cursorWaves: z
          .boolean()
          .describe('Slow colour waves with a ripple that follows the pointer.'),
      })
      .default({ galaxy: true, cursorWaves: false })
      .describe(
        'Default animated banner background (each visitor can change it). All effects read the theme palette.',
      ),
    marks: z
      .object({
        animation: z
          .enum(['stamp', 'burst', 'pulse', 'none'])
          .default('stamp')
          .describe(
            'Animation played when a reader leaves a footprint: `stamp` an ink stamp pressed on the page, `burst` a burst of pixel squares, `pulse` a soft ring, `none` no animation. All obey `prefers-reduced-motion`.',
          ),
        maxPerVisitor: z
          .int()
          .min(1)
          .max(200)
          .default(50)
          .describe('Footprints one browser can leave on one note; after that taps add nothing.'),
        showCountFrom: z
          .int()
          .min(0)
          .max(1000)
          .default(5)
          .describe(
            'The counter is hidden until a note has this many footprints; before that the button invites the reader to be among the first.',
          ),
      })
      .prefault({})
      .describe(
        'Settings of the footprint button (`features.marks`). Every key is optional and falls back to its default.',
      ),
    recruiter: z
      .object({
        available: z
          .boolean()
          .describe('Show or hide the whole availability line (not whether you are open to work).'),
        openToWork: z
          .boolean()
          .default(true)
          .describe(
            'Whether you are open to work: green status dot when true, the brand accent colour when false.',
          ),
        status: localized.describe(
          'Availability text per locale. Parts separated by " · " show as a headline plus short tags on the home card (for example "Working at Buo · open to chat"); a single part is one tag (for example "Open to work").',
        ),
        lookingFor: localized.describe('What you are looking for, per locale.'),
        cvUrl: z
          .union([
            httpsUrl,
            z
              .record(z.string(), httpsUrl)
              .refine((urls) => Object.keys(urls).length > 0, 'needs at least one locale'),
          ])
          .optional()
          .describe(
            'Link to a downloadable CV (https): one URL for every locale, or one per locale (`{ es: ..., en: ... }`, a locale without one falls back to the default locale). Omit to hide the CV button.',
          ),
      })
      .describe('Recruiter card on the home page and /me.'),
    me: z
      .object({
        timezone: z.string().trim().min(1).describe('Display timezone, for example `UTC−6`.'),
        workMode: localized.describe('Work mode per locale (remote, hybrid, ...).'),
        intro: localized.describe('The "what I bring" intro paragraph per locale.'),
        facts: z
          .array(
            z.object({
              value: localized.describe('The highlighted value.'),
              label: localized.describe('What the value means.'),
            }),
          )
          .min(1)
          .describe('At-a-glance strip: value and label pairs (the design shows up to four).'),
        strengths: z
          .array(
            z.object({
              icon: z.string().min(1).describe('Icon name of the tile.'),
              title: localized.describe('Tile title.'),
              body: localized.describe('Tile text.'),
            }),
          )
          .min(1)
          .describe('"What I bring" tiles.'),
        stack: z
          .array(
            z.object({
              label: localized.describe('Group name (Languages, Frontend, ...).'),
              items: z.array(z.string().min(1)).min(1).describe('Tools in the group.'),
            }),
          )
          .min(1)
          .describe('Tech stack groups.'),
      })
      .describe(
        'Singular /me profile data. Lists that grow (experience, certificates) live in `src/content/`.',
      ),
    features: z
      .object({
        blog: z
          .boolean()
          .describe('Lab Notes: the notes index, note pages, RSS and the nav entry.'),
        comments: z
          .boolean()
          .describe(
            'Giscus comments on notes. Needs the `giscus` block below, otherwise nothing renders.',
          ),
        contact: z.boolean().describe('The /contact form and its nav entry.'),
        credentials: z.boolean().describe('Certificates and degrees on /me.'),
        experiments: z.boolean().describe('The experiments (projects) section and its pages.'),
        changelog: z
          .boolean()
          .describe(
            'Visitor-facing /changelog page: off hides the footer link, marks it noindex and keeps it out of the sitemap.',
          ),
        me: z
          .boolean()
          .describe(
            'The /me recruiter page: off hides it from the nav, marks it noindex and keeps it out of the sitemap.',
          ),
        readingMode: z
          .boolean()
          .describe(
            'Reading mode on notes: off renders no toggle, loads no script or CSS and stores nothing in the browser.',
          ),
        marks: z
          .boolean()
          .describe(
            'The anonymous "I was here" footprint button on notes. Needs the `SITE_DB` D1 binding (the site database, table `note_footprints`) and the `MARKS_RATE_LIMITER` binding, otherwise the buttons never render.',
          ),
      })
      .describe(
        'Feature flags: off means the routes are not generated and the nav entry is hidden.',
      ),
    integrations: z
      .object({
        cloudflareAnalyticsToken: z
          .string()
          .trim()
          .min(1)
          .optional()
          .describe(
            'Cloudflare Web Analytics beacon token (public). Omit to turn analytics off. Env `PUBLIC_CF_ANALYTICS_TOKEN` overrides it.',
          ),
        turnstileSiteKey: z
          .string()
          .trim()
          .min(1)
          .optional()
          .describe(
            'Cloudflare Turnstile public site key for the contact form, bound to the domain. Env `PUBLIC_TURNSTILE_SITE_KEY` overrides it (use a test key locally).',
          ),
      })
      .default({})
      .describe(
        'Public ids of third-party services. They ship in the HTML by design, so they live here and not in secrets.',
      ),
    legal: z
      .object({
        privacyUpdated: z.iso
          .date()
          .describe('"Last updated" date of the privacy page. Bump it when its text changes.'),
        termsUpdated: z.iso
          .date()
          .describe('"Last updated" date of the terms page. Bump it when its text changes.'),
      })
      .describe('Dates shown at the bottom of the legal pages.'),
    giscus: z
      .object({
        repo: z
          .string()
          .regex(/^[\w.-]+\/[\w.-]+$/, { error: 'must be "owner/name"' })
          .describe('Repository whose Discussions store the comments, as `owner/name`.'),
        repoId: z
          .string()
          .trim()
          .min(1)
          .describe('Repository node id from https://giscus.app (starts with `R_`).'),
        category: z
          .string()
          .trim()
          .min(1)
          .describe('Discussion category name (an Announcements-type category).'),
        categoryId: z
          .string()
          .trim()
          .min(1)
          .describe('Category node id from https://giscus.app (starts with `DIC_`).'),
      })
      .optional()
      .describe(
        'Giscus comments (GitHub Discussions). Optional: without it nothing renders even when `features.comments` is on.',
      ),
    notice: localized
      .optional()
      .describe(
        'Optional site-wide notice strip per locale (for example "under construction"). Remove the key to hide it.',
      ),
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
      ...Object.fromEntries(
        (config.now?.items ?? []).map((item, index) => [
          `now.items.${index}`,
          { path: ['now', 'items', index, 'text'], text: item.text },
        ]),
      ),
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
