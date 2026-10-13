import { describe, expect, it } from 'vitest';

import {
  educationDateLabel,
  educationPath,
  groupEducationByYear,
  offeredEducationSorts,
  paginateEducation,
  recentEducationRows,
  sortEducation,
} from './education.ts';

type Entry = {
  id: string;
  data: { year: number; month?: number | undefined; order?: number | undefined };
};
const e = (id: string, year: number, month?: number, order?: number): Entry => ({
  id,
  data: { year, month, order },
});
const ids = (entries: readonly Entry[]) => entries.map((entry) => entry.id);

describe('sortEducation', () => {
  const list = [e('b', 2026), e('a1', 2021), e('a2', 2021), e('c', 2023)];

  it('puts the oldest year first and orders a year by id when no order or month is set', () => {
    expect(ids(sortEducation(list, 'oldest'))).toEqual(['a1', 'a2', 'c', 'b']);
  });

  it('puts the newest year first and orders a year by id when no order or month is set', () => {
    expect(ids(sortEducation(list, 'newest'))).toEqual(['b', 'c', 'a1', 'a2']);
  });

  it('uses the editorial order before the id, and entries with an order come first', () => {
    const list = [e('a', 2022), e('z', 2022, undefined, 1), e('m', 2022, undefined, 0)];
    expect(ids(sortEducation(list, 'oldest'))).toEqual(['m', 'z', 'a']);
    expect(ids(sortEducation(list, 'newest'))).toEqual(['m', 'z', 'a']);
  });

  it('orders a year by month, oldest first, and puts an unknown month before the known ones', () => {
    const list = [e('a9', 2022, 9), e('z4', 2022, 4), e('k0', 2022), e('m4', 2022, 4)];
    expect(ids(sortEducation(list, 'oldest'))).toEqual(['k0', 'm4', 'z4', 'a9']);
  });

  it('orders a year by month, newest first, and puts an unknown month last', () => {
    const list = [e('a9', 2022, 9), e('z4', 2022, 4), e('k0', 2022), e('m4', 2022, 4)];
    expect(ids(sortEducation(list, 'newest'))).toEqual(['a9', 'm4', 'z4', 'k0']);
  });

  it('lets an explicit editorial order win over the month', () => {
    const list = [e('late', 2022, 12, 0), e('early', 2022, 1)];
    expect(ids(sortEducation(list, 'oldest'))).toEqual(['late', 'early']);
  });

  it('does not mutate its input', () => {
    const input = [e('x', 2026), e('y', 2020)];
    sortEducation(input, 'oldest');
    expect(ids(input)).toEqual(['x', 'y']);
  });
});

describe('groupEducationByYear', () => {
  it('groups consecutive entries of the same year and keeps the incoming order', () => {
    const groups = groupEducationByYear([e('a', 2021), e('b', 2021), e('c', 2026)]);
    expect(groups.map((group) => group.year)).toEqual([2021, 2026]);
    expect(ids(groups[0]?.items ?? [])).toEqual(['a', 'b']);
  });

  it('follows a descending list as well and returns nothing for an empty one', () => {
    expect(groupEducationByYear([e('c', 2026), e('a', 2021)]).map((group) => group.year)).toEqual([
      2026, 2021,
    ]);
    expect(groupEducationByYear([])).toEqual([]);
  });
});

describe('educationDateLabel', () => {
  it('shows only the year when the month is unknown', () => {
    expect(educationDateLabel(2021, undefined, 'en')).toBe('2021');
  });

  it('shows the short month and the year when the month is known', () => {
    expect(educationDateLabel(2021, 3, 'en')).toBe('Mar 2021');
    expect(educationDateLabel(2021, 3, 'es')).toMatch(/^mar\.? 2021$/i);
  });
});

describe('paging and sorts', () => {
  it('offers no sort below sortFrom and newest first from it', () => {
    expect(offeredEducationSorts(3, 4)).toEqual([]);
    expect(offeredEducationSorts(4, 4)).toEqual(['newest', 'oldest']);
  });

  it('builds the paths: newest is the base, oldest lives under its key', () => {
    expect(educationPath(1)).toBe('/education/');
    expect(educationPath(2)).toBe('/education/page/2/');
    expect(educationPath(1, 'newest')).toBe('/education/');
    expect(educationPath(1, 'oldest')).toBe('/education/oldest/');
    expect(educationPath(3, 'oldest')).toBe('/education/oldest/page/3/');
  });

  it('pages the sorted list: one page while it fits, every entry exactly once', () => {
    const list = [e('a', 2021), e('b', 2022), e('c', 2023), e('d', 2024), e('f', 2025)];
    expect(paginateEducation(list, { perPage: 12, sort: 'oldest' })).toHaveLength(1);
    const pages = paginateEducation(list, { perPage: 4, sort: 'newest' });
    expect(pages.map((page) => ids(page.items))).toEqual([['f', 'd', 'c', 'b'], ['a']]);
  });
});

describe('recentEducationRows', () => {
  const list = [e('a', 2018), e('b', 2020), e('c', 2022), e('d', 2022, undefined, 0), e('f', 2025)];
  const pages = paginateEducation(list, { perPage: 2, sort: 'oldest' });

  it('takes the newest entries first, up to the number of rows', () => {
    expect(recentEducationRows(pages, 3).map((row) => row.id)).toEqual(['f', 'd', 'c']);
  });

  it('carries the page of the default timeline that holds each entry', () => {
    const rows = recentEducationRows(pages, 5);
    expect(rows.map((row) => [row.id, row.page])).toEqual([
      ['f', 3],
      ['d', 2],
      ['c', 2],
      ['b', 1],
      ['a', 1],
    ]);
  });

  it('returns every entry when there are fewer than the rows asked for, and none for zero', () => {
    expect(recentEducationRows(pages, 99)).toHaveLength(5);
    expect(recentEducationRows(pages, 0)).toEqual([]);
  });
});
