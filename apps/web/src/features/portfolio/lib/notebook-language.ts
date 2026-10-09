/** The note languages that differ from the page language, each once, in first-seen order. */
export function otherNoteLanguages(locale: string, langs: readonly string[]): string[] {
  return [...new Set(langs)].filter((lang) => lang !== locale);
}
