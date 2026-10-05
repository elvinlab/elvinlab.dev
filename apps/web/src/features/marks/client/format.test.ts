import { describe, expect, it } from 'vitest';

import { describeMarks, type MarksStrings } from './format.ts';

const strings: MarksStrings = {
  button: 'Dejé mi huella',
  hint: 'Sé de los primeros en dejar tu huella',
  countOne: '1 huella',
  countMany: '{n} huellas',
  thanks: '¡Gracias por pasar!',
  cap: 'Ya dejaste todas las huellas',
  invite: '¿Te gustó? Deja tu huella',
};

describe('describeMarks', () => {
  it('shows the hint below the threshold', () => {
    expect(describeMarks({ total: 3, capped: false }, 5, strings)).toEqual({
      label: 'Dejé mi huella',
      note: strings.hint,
    });
  });

  it('shows the count from the threshold on, in plural', () => {
    expect(describeMarks({ total: 12, capped: false }, 5, strings).note).toBe('12 huellas');
    expect(describeMarks({ total: 5, capped: false }, 5, strings).note).toBe('5 huellas');
  });

  it('uses the singular for exactly one when the threshold allows it', () => {
    expect(describeMarks({ total: 1, capped: false }, 1, strings).note).toBe('1 huella');
  });

  it('switches the label to the cap text at the cap and keeps the count rule', () => {
    expect(describeMarks({ total: 12, capped: true }, 5, strings)).toEqual({
      label: strings.cap,
      note: '12 huellas',
    });
  });
});
