import { describe, expect, it } from 'vitest';

import { groupCredentialsByYear } from './credentials.ts';

type Cred = { data: { title: string; year: number; month?: number | undefined } };
const c = (title: string, year: number, month?: number): Cred => ({ data: { title, year, month } });

describe('groupCredentialsByYear', () => {
  it('groups by year, newest year first', () => {
    const groups = groupCredentialsByYear([c('a', 2022), c('b', 2020), c('c', 2022)]);
    expect(groups.map((g) => g.year)).toEqual([2022, 2020]);
    expect(groups[0]?.items.map((i) => i.data.title)).toEqual(['a', 'c']);
  });

  it('orders items within a year by month, newest first', () => {
    const groups = groupCredentialsByYear([c('jan', 2022, 1), c('dec', 2022, 12)]);
    expect(groups[0]?.items.map((i) => i.data.title)).toEqual(['dec', 'jan']);
  });
});
