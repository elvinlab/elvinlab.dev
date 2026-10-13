/** The pieces of a result count: the two templates (`{count}` placeholder) the page ships as data attributes. */
export type CountTemplates = { one: string; other: string };

/**
 * The visible result count of the notes index ("13 notas", "1 nota", "0 notas"). Exactly one note
 * takes the singular template; zero and every other number take the plural one, in both locales.
 */
export function resultsLabel(count: number, templates: CountTemplates): string {
  const template = count === 1 ? templates.one : templates.other;
  return template.replace('{count}', String(count));
}
