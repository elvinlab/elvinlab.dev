/** The words of the footprint button, resolved on the server for the page locale. */
export type MarksStrings = {
  button: string;
  hint: string;
  /** Whole text for a single footprint, e.g. "1 huella". */
  countOne: string;
  /** Plural with an `{n}` placeholder, e.g. "{n} huellas". */
  countMany: string;
  thanks: string;
  cap: string;
  invite: string;
};

export function formatCount(total: number, strings: MarksStrings): string {
  return total === 1 ? strings.countOne : strings.countMany.replace('{n}', String(total));
}

/**
 * What the button says: its label (the cap text once the visitor reached the cap) and a note
 * that is the count from `showCountFrom` on, or the invitation to be among the first.
 */
export function describeMarks(
  state: { total: number; capped: boolean },
  showCountFrom: number,
  strings: MarksStrings,
): { label: string; note: string } {
  return {
    label: state.capped ? strings.cap : strings.button,
    note: state.total >= showCountFrom ? formatCount(state.total, strings) : strings.hint,
  };
}
