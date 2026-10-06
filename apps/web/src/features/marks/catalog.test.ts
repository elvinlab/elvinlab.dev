import { describe, expect, it, vi } from 'vitest';

import { buildCatalog, PAGE_KEYS } from './catalog.ts';
import { leaveMarks, readMarks } from './marks.ts';
import type { MarksPorts } from './ports.ts';

function makePorts(noteIds: string[]): MarksPorts {
  return {
    store: { total: vi.fn(async () => 3), add: vi.fn(async () => 4) },
    limiter: { allow: vi.fn(async () => true) },
    catalog: buildCatalog(noteIds),
  };
}

describe('buildCatalog', () => {
  it('lists home as a page key', () => {
    expect(PAGE_KEYS).toContain('home');
  });

  it('accepts published note ids and page keys, nothing else', () => {
    const catalog = buildCatalog(['first-note']);
    expect(catalog.has('first-note')).toBe(true);
    expect(catalog.has('home')).toBe(true);
    expect(catalog.has('made-up')).toBe(false);
  });

  it('reads the home counter', async () => {
    const ports = makePorts(['first-note']);
    await expect(readMarks({ slug: 'home' }, ports)).resolves.toEqual({ ok: true, total: 3 });
    expect(ports.store.total).toHaveBeenCalledWith('home');
  });

  it('lets a visitor leave footprints on home', async () => {
    const ports = makePorts([]);
    await expect(leaveMarks({ slug: 'home', by: 2 }, '192.0.2.1', ports)).resolves.toEqual({
      ok: true,
      total: 4,
    });
    expect(ports.store.add).toHaveBeenCalledWith('home', 2);
  });

  it('still rejects an unknown slug on read and leave', async () => {
    const ports = makePorts(['first-note']);
    const unknown = { ok: false, reason: 'unknown_note' };
    await expect(readMarks({ slug: 'made-up' }, ports)).resolves.toEqual(unknown);
    await expect(leaveMarks({ slug: 'made-up', by: 1 }, '192.0.2.1', ports)).resolves.toEqual(
      unknown,
    );
    expect(ports.store.add).not.toHaveBeenCalled();
  });
});
