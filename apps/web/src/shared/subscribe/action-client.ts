/**
 * Calls the `subscribe` Astro Actions with a plain `fetch`, so the notes pages do not ship the
 * Actions client runtime (same approach as the marks). The wire format is Astro's: a JSON POST to
 * `/_actions/<name>/`, a devalue body on success (`{ result }` is `[{"result":1},"confirmed"]`) and
 * a `{ code }` body with the HTTP status on failure. No token or address is ever logged here.
 */
export type SubscribeActionName = 'request' | 'confirm' | 'unsubscribe';

export type ActionOutcome =
  | { ok: true; data: Record<string, unknown> }
  | { ok: false; code: string };

type Fetch = (input: string, init: RequestInit) => Promise<Response>;

const UNKNOWN: ActionOutcome = { ok: false, code: 'UNKNOWN' };

/** Resolves the flat table of a devalue object whose fields are primitives. */
function readFlat(text: string): Record<string, unknown> | null {
  const table = JSON.parse(text) as unknown;
  if (!Array.isArray(table) || typeof table[0] !== 'object' || table[0] === null) return null;
  const data: Record<string, unknown> = {};
  for (const [key, index] of Object.entries(table[0] as Record<string, number>)) {
    const value: unknown = table[index];
    if (typeof value === 'string' || typeof value === 'boolean' || typeof value === 'number') {
      data[key] = value;
    }
  }
  return data;
}

export async function callSubscribeAction(
  name: SubscribeActionName,
  body: unknown,
  request: Fetch = (url, init) => fetch(url, init),
): Promise<ActionOutcome> {
  try {
    const response = await request(`/_actions/subscribe.${name}/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(body),
    });
    const text = await response.text();
    if (response.ok) {
      const data = readFlat(text);
      return data ? { ok: true, data } : UNKNOWN;
    }
    const error = JSON.parse(text) as { code?: unknown };
    return typeof error.code === 'string' ? { ok: false, code: error.code } : UNKNOWN;
  } catch {
    return UNKNOWN;
  }
}
