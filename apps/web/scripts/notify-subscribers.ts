/**
 * Owner command: emails a published note to the subscriber list through the protected endpoint
 * `POST /api/subscribe/notify` (ADR 0014). Usage: `pnpm notify:note <slug> [--send]`.
 *
 * It is a dry run unless `--send` is given. The token comes from the environment variable
 * `SUBSCRIBE_ADMIN_TOKEN` only (never an argument, so it stays out of the shell history) and is
 * never printed. The base URL is `site.url` from the site configuration.
 */
import { fileURLToPath } from 'node:url';

const TOKEN_VARIABLE = 'SUBSCRIBE_ADMIN_TOKEN';
const ENDPOINT = '/api/subscribe/notify';
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export type NotifyArgs = { slug: string; send: boolean };

export type ParsedArgs = { ok: true; args: NotifyArgs } | { ok: false; message: string };

export function parseArgs(argv: readonly string[]): ParsedArgs {
  const usage = 'Usage: pnpm notify:note <slug> [--send]';
  let send = false;
  const positional: string[] = [];
  for (const arg of argv) {
    if (arg === '--send') send = true;
    else if (arg.startsWith('-'))
      return { ok: false, message: `Unknown option "${arg}". ${usage}` };
    else positional.push(arg);
  }
  const [slug, ...extra] = positional;
  if (!slug || extra.length > 0) return { ok: false, message: usage };
  if (!SLUG.test(slug) || slug.length > 80)
    return { ok: false, message: `"${slug}" is not a note slug (lowercase words joined by "-").` };
  return { ok: true, args: { slug, send } };
}

export function buildRequest(
  baseUrl: string,
  token: string,
  args: NotifyArgs,
): { url: string; init: RequestInit } {
  return {
    url: new URL(ENDPOINT, baseUrl).href,
    init: {
      method: 'POST',
      headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
      body: JSON.stringify({ slug: args.slug, dryRun: !args.send }),
      // A redirect would resend the token to somewhere else.
      redirect: 'manual',
    },
  };
}

const FAILURES: Record<number, string> = {
  400: 'The server rejected the request.',
  401: 'Unauthorized: the token was not accepted.',
  403: 'Forbidden.',
  404: 'No published note has that slug. Release the note first, then notify.',
  413: 'The request was too large.',
  415: 'The server rejected the content type.',
  429: 'Too many attempts. Wait a minute and try again.',
  502: 'The email provider refused a batch. Nothing was marked as sent for it; run the command again.',
  503: 'The endpoint is not available: check that the secret is set on the Worker and the feature is on.',
};

const count = (value: unknown): number => (typeof value === 'number' ? value : 0);
const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
const again = 'Run it again tomorrow to continue.';

type Output = { log: (line: string) => void; error: (line: string) => void };

/** Returns the process exit code. Every line printed is a plain sentence with counts only. */
export async function run(
  argv: readonly string[],
  env: Record<string, string | undefined>,
  baseUrl: string,
  request: typeof fetch,
  out: Output = { log: console.log, error: console.error },
): Promise<number> {
  const parsed = parseArgs(argv);
  if (!parsed.ok) {
    out.error(parsed.message);
    return 1;
  }
  const token = env[TOKEN_VARIABLE];
  if (!token) {
    out.error(
      `Set ${TOKEN_VARIABLE} in the environment for this command (it is never read from a file).`,
    );
    return 1;
  }
  const target = new URL(baseUrl);
  if (target.protocol !== 'https:' && target.hostname !== 'localhost') {
    out.error('The site URL must be https, so the token never travels in clear text.');
    return 1;
  }
  const { url, init } = buildRequest(baseUrl, token, parsed.args);
  let response: Response;
  try {
    response = await request(url, init);
  } catch {
    out.error('Could not reach the site.');
    return 1;
  }
  if (!response.ok) {
    out.error(FAILURES[response.status] ?? `The server answered ${response.status}.`);
    // A failed batch still reports how far it got.
    if (response.status !== 502) return 1;
  }
  const body: unknown = await response.json().catch(() => ({}));
  const data = typeof body === 'object' && body !== null ? (body as Record<string, unknown>) : {};

  if (!parsed.args.send) {
    out.log(
      `Dry run for "${parsed.args.slug}": ${plural(count(data['recipients']), 'subscriber', 'subscribers')} of its language have not received it.`,
    );
    out.log(
      `Today's pool allows ${count(data['remainingPool'])} emails; a real send would deliver ${count(data['wouldSend'])}.`,
    );
    out.log('Nothing was sent. Add --send to send it for real.');
    return response.ok ? 0 : 1;
  }
  const remaining = count(data['remaining']);
  out.log(
    `Sent "${parsed.args.slug}" to ${plural(count(data['sent']), 'subscriber', 'subscribers')}; ${remaining} still waiting.`,
  );
  if (remaining > 0) out.log(again);
  return response.ok ? 0 : 1;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { siteConfig } = await import('@/site.config.ts');
  process.exitCode = await run(process.argv.slice(2), process.env, siteConfig.url, fetch);
}
