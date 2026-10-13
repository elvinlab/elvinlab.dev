import { describe, expect, it } from 'vitest';

import { experimentNumbers, formatExperimentNumber } from './experiment-number.ts';

const entry = (id: string, year: number, publishedAt?: string) => ({ id, year, publishedAt });

describe('formatExperimentNumber', () => {
  it('pads to three digits', () => {
    expect(formatExperimentNumber(1)).toBe('001');
    expect(formatExperimentNumber(42)).toBe('042');
    expect(formatExperimentNumber(128)).toBe('128');
    expect(formatExperimentNumber(1000)).toBe('1000');
  });
});

describe('experimentNumbers', () => {
  const all = [entry('c', 2026, '2026-09-01'), entry('a', 2024), entry('b', 2025, '2025-03-10')];

  it('numbers by publication date, oldest first', () => {
    const numbers = experimentNumbers(all);
    expect(numbers.get('a')).toBe('001');
    expect(numbers.get('b')).toBe('002');
    expect(numbers.get('c')).toBe('003');
  });

  it('uses 1 January of the year when there is no publishedAt', () => {
    const numbers = experimentNumbers([entry('x', 2025, '2025-06-01'), entry('y', 2025)]);
    expect(numbers.get('y')).toBe('001');
    expect(numbers.get('x')).toBe('002');
  });

  it('breaks ties by id', () => {
    const numbers = experimentNumbers([
      entry('b', 2025, '2025-01-01'),
      entry('a', 2025, '2025-01-01'),
    ]);
    expect(numbers.get('a')).toBe('001');
    expect(numbers.get('b')).toBe('002');
  });

  it('does not depend on the order of the input (every sort and page gets the same number)', () => {
    const forward = experimentNumbers(all);
    const backward = experimentNumbers([...all].reverse());
    for (const { id } of all) expect(backward.get(id)).toBe(forward.get(id));
  });

  it('does not mutate its input', () => {
    const copy = [...all];
    experimentNumbers(all);
    expect(all).toEqual(copy);
  });
});
