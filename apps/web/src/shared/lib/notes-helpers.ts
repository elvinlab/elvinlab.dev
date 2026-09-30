/** True when the notes collection has at least one entry. */
export function hasPublishedNotes(notes: readonly unknown[]): boolean {
  return notes.length > 0;
}
