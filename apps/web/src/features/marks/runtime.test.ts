import { describe, expect, it, vi } from 'vitest';

import { leaveConfiguredMarks, readConfiguredMarks } from './runtime.ts';

function makeEnv(overrides: Record<string, unknown> = {}) {
  const first = vi.fn(async () => ({ total: 9 }));
  const bind = vi.fn(() => ({ first }));
  const prepare = vi.fn(() => ({ bind }));
  const limit = vi.fn(async (_options: { key: string }) => ({ success: true }));
  return {
    env: { MARKS_DB: { prepare }, MARKS_RATE_LIMITER: { limit }, ...overrides },
    prepare,
    bind,
    limit,
  };
}
const catalog = { has: (slug: string) => slug === 'first-note' };

describe('readConfiguredMarks', () => {
  it('reads the total through the D1 binding', async () => {
    const { env, bind } = makeEnv();
    await expect(readConfiguredMarks({ slug: 'first-note' }, env, catalog)).resolves.toEqual({
      ok: true,
      total: 9,
    });
    expect(bind).toHaveBeenCalledWith('first-note');
  });

  it('returns null and logs only key names when bindings are missing', async () => {
    const log = vi.fn();
    await expect(
      readConfiguredMarks({ slug: 'first-note' }, { MARKS_DB: 'secret-value' }, catalog, log),
    ).resolves.toBeNull();
    const message = String(log.mock.calls[0]?.[0]);
    expect(message).toContain('MARKS_DB');
    expect(message).toContain('MARKS_RATE_LIMITER');
    expect(message).not.toContain('secret-value');
  });
});

describe('leaveConfiguredMarks', () => {
  it('rate limits by a namespaced client address and writes', async () => {
    const { env, limit, bind } = makeEnv();
    await expect(
      leaveConfiguredMarks({ slug: 'first-note', by: 2 }, '192.0.2.1', env, catalog),
    ).resolves.toEqual({ ok: true, total: 9 });
    expect(limit).toHaveBeenCalledWith({ key: 'marks:192.0.2.1' });
    expect(bind).toHaveBeenCalledWith('first-note', 2);
  });

  it('reports rate_limited when the limiter denies and never writes', async () => {
    const { env, bind } = makeEnv({
      MARKS_RATE_LIMITER: { limit: async () => ({ success: false }) },
    });
    await expect(
      leaveConfiguredMarks({ slug: 'first-note', by: 2 }, '192.0.2.1', env, catalog),
    ).resolves.toEqual({ ok: false, reason: 'rate_limited' });
    expect(bind).not.toHaveBeenCalled();
  });

  it('fails closed on an unexpected limiter answer', async () => {
    const { env } = makeEnv({ MARKS_RATE_LIMITER: { limit: async () => 'yes' } });
    await expect(
      leaveConfiguredMarks({ slug: 'first-note', by: 2 }, '192.0.2.1', env, catalog),
    ).resolves.toEqual({ ok: false, reason: 'rate_limited' });
  });

  it('returns null when unconfigured', async () => {
    await expect(
      leaveConfiguredMarks({ slug: 'first-note', by: 2 }, '192.0.2.1', {}, catalog, vi.fn()),
    ).resolves.toBeNull();
  });
});
