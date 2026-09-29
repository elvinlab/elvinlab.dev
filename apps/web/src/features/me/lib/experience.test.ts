import { describe, expect, it } from 'vitest';

import { sortExperience } from './experience.ts';

type Exp = { data: { company: string; start: number; end?: number | undefined } };
const e = (company: string, start: number, end?: number): Exp => ({
  data: { company, start, end },
});

describe('sortExperience', () => {
  it('orders newest first, ongoing (no end) before ended', () => {
    const sorted = sortExperience([e('old', 2018, 2020), e('now', 2022), e('mid', 2020, 2022)]);
    expect(sorted.map((x) => x.data.company)).toEqual(['now', 'mid', 'old']);
  });

  it('does not mutate the input', () => {
    const list = [e('a', 2020), e('b', 2022)];
    sortExperience(list);
    expect(list.map((x) => x.data.company)).toEqual(['a', 'b']);
  });
});
