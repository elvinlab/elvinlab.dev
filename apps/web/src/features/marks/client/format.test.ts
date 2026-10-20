import { describe, expect, it } from 'vitest';

import { describeMarks, type MarksStrings } from './format.ts';

const strings: MarksStrings = {
  button: 'Dejé mi huella',
  hint: 'Sé el primero en dejar tu huella',
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

  it('thanks the visitor below the threshold once they left a footprint, without the total', () => {
    expect(describeMarks({ total: 2, mine: 1, capped: false }, 5, strings).note).toBe(
      strings.thanks,
    );
  });

  it('still shows the hint below the threshold while the visitor has left nothing', () => {
    expect(describeMarks({ total: 2, mine: 0, capped: false }, 5, strings).note).toBe(strings.hint);
  });

  it('keeps showing the count from the threshold on, even after the visitor left a footprint', () => {
    expect(describeMarks({ total: 7, mine: 3, capped: false }, 5, strings).note).toBe('7 huellas');
  });
});
