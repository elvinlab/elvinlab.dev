/** Flat map of translation keys to strings; `{name}` marks an interpolation placeholder. */
export type Dictionary = Readonly<Record<string, string>>;

/** Translates `key` for `locale`, filling `{param}` placeholders. */
export type Translator<L extends string, K extends string> = (
  locale: L,
  key: K,
  params?: Readonly<Record<string, string | number>>,
) => string;

const interpolate = (text: string, params: Readonly<Record<string, string | number>>): string =>
  text.replace(/\{(\w+)\}/g, (placeholder, name: string) => {
    const value = params[name];
    return value === undefined ? placeholder : String(value);
  });

/**
 * Creates a typed translator. Locales come from the dictionaries and keys from the default
 * locale's dictionary, so an unknown locale or key is a compile error. A key missing in another
 * locale falls back to the default locale at runtime.
 */
export const createTranslator = <
  const Dictionaries extends Readonly<Record<string, Dictionary>>,
  Default extends Extract<keyof Dictionaries, string>,
>(options: {
  defaultLocale: Default;
  dictionaries: Dictionaries;
}): Translator<
  Extract<keyof Dictionaries, string>,
  Extract<keyof Dictionaries[Default], string>
> => {
  const fallback: Dictionary = options.dictionaries[options.defaultLocale] ?? {};
  return (locale, key, params = {}) => {
    const localized: Dictionary = options.dictionaries[locale] ?? {};
    const text = localized[key] ?? fallback[key] ?? key;
    return interpolate(text, params);
  };
};
