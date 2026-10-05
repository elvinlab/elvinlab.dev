import { describe, expect, it, vi } from 'vitest';

import { leaveMarks, readMarks } from './marks.ts';
import type { MarksPorts } from './ports.ts';

function makePorts(overrides: Partial<MarksPorts> = {}): MarksPorts {
  return {
    store: { total: vi.fn(async () => 7), add: vi.fn(async () => 12) },
    limiter: { allow: vi.fn(async () => true) },
    catalog: { has: (slug) => slug === 'first-note' },
    ...overrides,
  };
}

describe('readMarks', () => {
  it('returns the stored total of a published note', async () => {
    const ports = makePorts();
    await expect(readMarks({ slug: 'first-note' }, ports)).resolves.toEqual({
      ok: true,
      total: 7,
    });
    expect(ports.store.total).toHaveBeenCalledWith('first-note');
  });

  it.each([
    undefined,
    null,
    {},
    { slug: 3 },
    { slug: 'Bad_Slug' },
    { slug: '-lead' },
    { slug: 'a--b' },
    { slug: `a${'b'.repeat(80)}` },
    { slug: 'first-note', extra: 1 },
  ])('rejects invalid input %j before touching the store', async (input) => {
    const ports = makePorts();
    await expect(readMarks(input, ports)).resolves.toEqual({ ok: false, reason: 'invalid' });
    expect(ports.store.total).not.toHaveBeenCalled();
  });

  it('rejects a slug that is not a published note', async () => {
    const ports = makePorts();
    await expect(readMarks({ slug: 'made-up' }, ports)).resolves.toEqual({
      ok: false,
      reason: 'unknown_note',
    });
    expect(ports.store.total).not.toHaveBeenCalled();
  });

  it('lets store failures propagate', async () => {
    const ports = makePorts({
      store: {
        total: vi.fn(async () => {
          throw new Error('d1 down');
        }),
        add: vi.fn(),
      },
    });
    await expect(readMarks({ slug: 'first-note' }, ports)).rejects.toThrow('d1 down');
  });
});

describe('leaveMarks', () => {
  it('adds the footprints and returns the new total', async () => {
    const ports = makePorts();
    await expect(leaveMarks({ slug: 'first-note', by: 3 }, '192.0.2.1', ports)).resolves.toEqual({
      ok: true,
      total: 12,
    });
    expect(ports.limiter.allow).toHaveBeenCalledWith('192.0.2.1');
    expect(ports.store.add).toHaveBeenCalledWith('first-note', 3);
  });

  it.each([0, 11, 1.5, -1, '3', null, Number.NaN])('rejects by = %j', async (by) => {
    const ports = makePorts();
    await expect(leaveMarks({ slug: 'first-note', by }, '192.0.2.1', ports)).resolves.toEqual({
      ok: false,
      reason: 'invalid',
    });
    expect(ports.store.add).not.toHaveBeenCalled();
  });

  it.each([1, 10])('accepts the boundary by = %s', async (by) => {
    const ports = makePorts();
    await expect(leaveMarks({ slug: 'first-note', by }, '192.0.2.1', ports)).resolves.toMatchObject(
      { ok: true },
    );
  });

  it('rejects an unknown note without writing', async () => {
    const ports = makePorts();
    await expect(leaveMarks({ slug: 'made-up', by: 1 }, '192.0.2.1', ports)).resolves.toEqual({
      ok: false,
      reason: 'unknown_note',
    });
    expect(ports.store.add).not.toHaveBeenCalled();
  });

  it('rejects a missing client address', async () => {
    const ports = makePorts();
    await expect(leaveMarks({ slug: 'first-note', by: 1 }, undefined, ports)).resolves.toEqual({
      ok: false,
      reason: 'invalid',
    });
    expect(ports.limiter.allow).not.toHaveBeenCalled();
  });

  it('runs the limiter before any write and stops when it denies', async () => {
    const order: string[] = [];
    const ports = makePorts({
      limiter: {
        allow: vi.fn(async () => {
          order.push('limit');
          return false;
        }),
      },
      store: {
        total: vi.fn(),
        add: vi.fn(async () => {
          order.push('add');
          return 1;
        }),
      },
    });
    await expect(leaveMarks({ slug: 'first-note', by: 1 }, '192.0.2.1', ports)).resolves.toEqual({
      ok: false,
      reason: 'rate_limited',
    });
    expect(order).toEqual(['limit']);
  });

  it('lets store failures propagate', async () => {
    const ports = makePorts({
      store: {
        total: vi.fn(),
        add: vi.fn(async () => {
          throw new Error('d1 down');
        }),
      },
    });
    await expect(leaveMarks({ slug: 'first-note', by: 1 }, '192.0.2.1', ports)).rejects.toThrow(
      'd1 down',
    );
  });
});
