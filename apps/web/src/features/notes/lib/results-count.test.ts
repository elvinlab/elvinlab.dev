import { describe, expect, it } from 'vitest';

import { resultsLabel } from './results-count.ts';

const ES = { one: '{count} nota', other: '{count} notas' };
const EN = { one: '{count} note', other: '{count} notes' };

describe('resultsLabel', () => {
  it('uses the singular template for exactly one note', () => {
    expect(resultsLabel(1, ES)).toBe('1 nota');
    expect(resultsLabel(1, EN)).toBe('1 note');
  });

  it('uses the plural template for zero and for many', () => {
    expect(resultsLabel(0, ES)).toBe('0 notas');
    expect(resultsLabel(13, EN)).toBe('13 notes');
  });

  it('puts the number wherever the template places it', () => {
    expect(resultsLabel(3, { one: 'una', other: 'son {count}' })).toBe('son 3');
  });
});
