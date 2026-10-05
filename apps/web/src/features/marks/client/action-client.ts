/**
 * Calls the `marks` Astro Actions with a plain `fetch`, so the note page does not ship the Actions
 * client runtime. The wire format is Astro's: a JSON POST to `/_actions/<name>/`, a devalue body on
 * success (`{ total }` is `[{"total":1},<n>]`) and an `{ code }` error body with the HTTP status.
 */
import type { MarksClient, MarksResult } from './store.ts';

type Fetch = (input: string, init: RequestInit) => Promise<Response>;

async function parse(response: Response): Promise<MarksResult> {
  const text = await response.text();
  try {
    if (response.ok) {
      const table = JSON.parse(text) as unknown[];
      const total = table[(table[0] as { total: number }).total];
      if (typeof total === 'number') return { data: { total }, error: undefined };
    } else {
      const body = JSON.parse(text) as { code?: string };
      if (typeof body.code === 'string') return { data: undefined, error: { code: body.code } };
    }
  } catch {
    // Fall through: an unreadable body is an unknown failure.
  }
  return { data: undefined, error: { code: 'UNKNOWN' } };
}

export function createActionClient(request: Fetch = (url, init) => fetch(url, init)): MarksClient {
  const call = async (name: string, body: unknown): Promise<MarksResult> =>
    parse(
      await request(`/_actions/marks.${name}/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(body),
      }),
    );
  return { get: (input) => call('get', input), leave: (input) => call('leave', input) };
}
