import { beforeEach, describe, expect, it, vi } from 'vitest';

import { LISTING_SORTS } from '@/shared/config/index.ts';

vi.mock('@/features/portfolio/index.ts', () => ({
  loadExperiments: vi.fn(),
  loadExperimentPages: vi.fn(),
}));

import { loadExperimentPages, loadExperiments } from '@/features/portfolio/index.ts';

import { casePaths, laterPagePaths, sortPagePaths, sortParam, sortPaths } from './static-paths.ts';

type Locale = 'es' | 'en';

const emptyPageData = {
  page: 1,
  pages: 1,
  big: [],
  entries: [],
  groups: [],
  from: 0,
  to: 0,
  total: 0,
};

const makePageData = (page: number, pages: number) => ({
  page,
  pages,
  big: [],
  entries: [],
  groups: [],
  from: (page - 1) * 12 + 1,
  to: Math.min(page * 12, pages * 12),
  total: pages * 12,
});

const makeExperiment = (id: string, noteLang: Locale = 'es') => ({
  id,
  title: id.toUpperCase(),
  description: '',
  year: 2025,
  publishedAt: '2025-01-01',
  status: 'shipped' as const,
  featured: false,
  tags: [],
  tech: [],
  order: 100,
  noteLang,
});

describe('sortParam', () => {
  it('returns the key for each configured LISTING_SORTS', () => {
    for (const sort of LISTING_SORTS) {
      expect(sortParam(sort)).toBe(sort);
    }
  });

  it('throws for an unknown value', () => {
    expect(() => sortParam('unknown')).toThrow('"unknown" is not an experiments sort');
  });

  it('throws for undefined', () => {
    expect(() => sortParam(undefined)).toThrow('"undefined" is not an experiments sort');
  });
});

describe('laterPagePaths', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('returns paths for pages 2 and 3 when there are 3 pages', async () => {
    vi.mocked(loadExperimentPages).mockResolvedValue({
      experiments: [],
      pages: [emptyPageData, makePageData(2, 3), makePageData(3, 3)],
      sort: 'newest',
      defaultSort: 'newest',
      offered: ['newest'],
    } as const);

    const result = await laterPagePaths();
    expect(result).toEqual([{ params: { page: '2' } }, { params: { page: '3' } }]);
  });

  it('returns empty array when only page 1 exists', async () => {
    vi.mocked(loadExperimentPages).mockResolvedValue({
      experiments: [],
      pages: [emptyPageData],
      sort: 'newest',
      defaultSort: 'newest',
      offered: ['newest'],
    } as const);

    const result = await laterPagePaths();
    expect(result).toEqual([]);
  });
});

describe('casePaths', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('returns one path per experiment id in order', async () => {
    vi.mocked(loadExperiments).mockResolvedValue([
      makeExperiment('a'),
      makeExperiment('b'),
    ] as const);

    const result = await casePaths();
    expect(result).toEqual([{ params: { slug: 'a' } }, { params: { slug: 'b' } }]);
  });

  it('returns empty array for empty experiments list', async () => {
    vi.mocked(loadExperiments).mockResolvedValue([] as const);

    const result = await casePaths();
    expect(result).toEqual([]);
  });
});

describe('sortPaths', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('returns alternate sorts when offered includes multiple and default is newest', async () => {
    vi.mocked(loadExperimentPages).mockResolvedValue({
      experiments: [],
      pages: [emptyPageData],
      sort: 'newest',
      defaultSort: 'newest',
      offered: ['newest', 'oldest', 'title'],
    } as const);

    const result = await sortPaths();
    expect(result).toEqual([{ params: { sort: 'oldest' } }, { params: { sort: 'title' } }]);
  });

  it('returns empty array when only one sort is offered', async () => {
    vi.mocked(loadExperimentPages).mockResolvedValue({
      experiments: [],
      pages: [emptyPageData],
      sort: 'newest',
      defaultSort: 'newest',
      offered: ['newest'],
    } as const);

    const result = await sortPaths();
    expect(result).toEqual([]);
  });
});

describe('sortPagePaths', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('returns later pages for each alternate sort with correct params', async () => {
    vi.mocked(loadExperimentPages)
      .mockResolvedValueOnce({
        experiments: [],
        pages: [emptyPageData],
        sort: 'newest',
        defaultSort: 'newest',
        offered: ['newest', 'oldest', 'title'],
      } as const)
      .mockResolvedValueOnce({
        experiments: [],
        pages: [emptyPageData, makePageData(2, 3), makePageData(3, 3)],
        sort: 'oldest',
        defaultSort: 'newest',
        offered: ['newest', 'oldest', 'title'],
      } as const)
      .mockResolvedValueOnce({
        experiments: [],
        pages: [emptyPageData, makePageData(2, 2)],
        sort: 'title',
        defaultSort: 'newest',
        offered: ['newest', 'oldest', 'title'],
      } as const);

    const result = await sortPagePaths();
    expect(result).toEqual([
      { params: { sort: 'oldest', page: '2' } },
      { params: { sort: 'oldest', page: '3' } },
      { params: { sort: 'title', page: '2' } },
    ]);
  });

  it('returns empty array when no alternate sorts exist', async () => {
    vi.mocked(loadExperimentPages).mockResolvedValue({
      experiments: [],
      pages: [emptyPageData],
      sort: 'newest',
      defaultSort: 'newest',
      offered: ['newest'],
    } as const);

    const result = await sortPagePaths();
    expect(result).toEqual([]);
  });
});
