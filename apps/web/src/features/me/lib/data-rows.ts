/** One line of the `/me` raw-data layer: a field name, its inferred type and the value as text. */
export type DataRow = { field: string; type: 'text' | 'int' | 'text[]'; value: string };

type Localized = Readonly<Record<string, string>>;

export type DataRowsInput = {
  identity: {
    name: string;
    handle: string;
    role: Localized;
    location?: string | undefined;
    startedYear: number;
  };
  headline?: Localized | undefined;
  stack: readonly { items: readonly string[] }[];
};

/** The text for `locale`, or the first configured locale when that one is missing. */
const pick = (text: Localized | undefined, locale: string): string | undefined =>
  text?.[locale] ?? Object.values(text ?? {})[0];

/**
 * Rows for the raw-data layer, generated from the site configuration so no value is a literal here.
 * Field names are generic; types are inferred (`text`, `int`, `text[]`) and values are shown as written
 * in a typed record: strings quoted, integers bare, arrays bracketed.
 */
export function buildDataRows(input: DataRowsInput, locale: string): DataRow[] {
  const rows: DataRow[] = [];
  const text = (field: string, value: string | undefined): void => {
    if (value) rows.push({ field, type: 'text', value: JSON.stringify(value) });
  };
  const { identity } = input;
  text('name', identity.name);
  text('handle', identity.handle);
  text('role', pick(identity.role, locale));
  text('headline', pick(input.headline, locale));
  text('location', identity.location);
  rows.push({ field: 'started_year', type: 'int', value: String(identity.startedYear) });
  input.stack.forEach((group, index) => {
    rows.push({
      field: `stack.${index + 1}`,
      type: 'text[]',
      value: `[${group.items.map((item) => JSON.stringify(item)).join(', ')}]`,
    });
  });
  return rows;
}
