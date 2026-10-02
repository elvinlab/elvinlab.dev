/**
 * Registry of every environment variable and secret this project uses. It is the single list the
 * configuration guide and `.dev.vars.example` are generated from, and a test fails when code reads
 * a variable that is not here. Values never live in the repo: secrets are set in Cloudflare.
 */
export type EnvVar = {
  name: string;
  /** build: read while building; worker: Cloudflare Worker binding at runtime; ci: GitHub Actions; local: developer tooling. */
  scope: 'build' | 'worker' | 'ci' | 'local';
  /** True when the value must never be committed or logged. */
  secret: boolean;
  required: boolean;
  description: string;
  /** Where to set it. */
  setIn: string;
};

export const ENV_VARS: readonly EnvVar[] = [
  {
    name: 'SITE_INDEXABLE',
    scope: 'build',
    secret: false,
    required: false,
    description:
      'Exactly `true` on production builds lets search engines index the site. Anything else adds noindex (header, meta tag and robots.txt), so previews and local builds are never indexed.',
    setIn: 'CI deploy step (`.github/workflows/ci.yml`); leave unset locally',
  },
  {
    name: 'PUBLIC_CF_ANALYTICS_TOKEN',
    scope: 'build',
    secret: false,
    required: false,
    description:
      'Overrides `integrations.cloudflareAnalyticsToken`. Public by design: the token ships in the HTML. Normally leave it unset and edit the config.',
    setIn: 'optional override: `.env` locally or a GitHub environment variable',
  },
  {
    name: 'PUBLIC_TURNSTILE_SITE_KEY',
    scope: 'build',
    secret: false,
    required: false,
    description:
      'Overrides `integrations.turnstileSiteKey`. Use it locally: a production key is bound to the domain and fails on localhost, so put a Cloudflare test key here.',
    setIn: 'optional override: `.env` locally or a GitHub environment variable',
  },
  {
    name: 'RESEND_API_KEY',
    scope: 'worker',
    secret: true,
    required: true,
    description: 'Resend API key used to send the contact notification email.',
    setIn: 'Cloudflare Worker secret (`wrangler secret put`); `.dev.vars` locally',
  },
  {
    name: 'CONTACT_FROM',
    scope: 'worker',
    secret: true,
    required: true,
    description:
      'Sender address of the notification email, on a domain verified in Resend. An address is never written in tracked files.',
    setIn: 'Cloudflare Worker secret; `.dev.vars` locally',
  },
  {
    name: 'CONTACT_TO',
    scope: 'worker',
    secret: true,
    required: true,
    description:
      'Inbox that receives contact messages. Never written in tracked files; the site only exposes the /contact form.',
    setIn: 'Cloudflare Worker secret; `.dev.vars` locally',
  },
  {
    name: 'TURNSTILE_SECRET_KEY',
    scope: 'worker',
    secret: true,
    required: true,
    description: 'Cloudflare Turnstile secret key that verifies the anti-bot token server side.',
    setIn: 'Cloudflare Worker secret; `.dev.vars` locally (use the Cloudflare test secret)',
  },
  {
    name: 'TURNSTILE_HOSTNAME',
    scope: 'worker',
    secret: false,
    required: true,
    description:
      'Hostname Turnstile must report for a valid token (for example the production domain). It makes a token from another site invalid.',
    setIn: 'Cloudflare Worker variable; `.dev.vars` locally (`localhost`)',
  },
  {
    name: 'CLOUDFLARE_API_TOKEN',
    scope: 'ci',
    secret: true,
    required: true,
    description:
      'Cloudflare API token with permission to deploy the Worker; used only by the deploy job.',
    setIn: 'GitHub environment secret (`production`)',
  },
  {
    name: 'CLOUDFLARE_ACCOUNT_ID',
    scope: 'ci',
    secret: false,
    required: true,
    description:
      'Cloudflare account id the deploy job targets. Not a secret, but not needed anywhere else.',
    setIn: 'GitHub repository variable',
  },
  {
    name: 'DEV_CHECK_STRIP_DEPS',
    scope: 'local',
    secret: false,
    required: false,
    description:
      'Set to `1` to run `pnpm check:dev-cold-start` as its own negative control: it removes the pre-optimized dependencies first and must then fail.',
    setIn: 'the shell, only when running that check',
  },
  {
    name: 'FIXTURE_APPEARANCE',
    scope: 'local',
    secret: false,
    required: false,
    description:
      'Set to `minimal` or `full` to build the browser-test fixture with that appearance preset instead of the one in `site.config.ts` (only the temporary copy changes). Any other value fails the run.',
    setIn:
      'the shell, only when running `pnpm test:e2e` (for example to verify the `minimal` preset)',
  },
];
