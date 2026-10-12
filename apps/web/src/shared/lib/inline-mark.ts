/** One run of a marked string: `marked` is true for the part wrapped in `[[` and `]]`. */
export type MarkedSegment = { text: string; marked: boolean };

/**
 * Site-copy convention: a phrase wrapped in double square brackets, `[[like this]]`, is the one
 * the layout may emphasise (the home headline draws an ink underline under it). The marker lives
 * in the i18n string, so a fork chooses the phrase, or drops the brackets for no emphasis. An
 * unbalanced or empty marker stays plain text, so no word is ever lost.
 */
const MARKED = /\[\[([^[\]]+)\]\]/g;

/** Splits `value` into plain and marked segments, in reading order. */
export function splitMarked(value: string): MarkedSegment[] {
  const segments: MarkedSegment[] = [];
  let cursor = 0;
  for (const match of value.matchAll(MARKED)) {
    if (match.index > cursor)
      segments.push({ text: value.slice(cursor, match.index), marked: false });
    segments.push({ text: match[1] as string, marked: true });
    cursor = match.index + match[0].length;
  }
  if (cursor < value.length) segments.push({ text: value.slice(cursor), marked: false });
  return segments;
}

/** The same sentence without markers, for any plain-text use (titles, meta, accessible names). */
export function stripMarks(value: string): string {
  return value.replace(MARKED, '$1');
}
