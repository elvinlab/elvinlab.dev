/** Declarations of one CSS rule, `property -> value`. */
export type Declarations = Record<string, string>;

/**
 * Splits a CSS source into `selector -> declarations`, at one nesting level (comments are
 * dropped). A tiny reader for the unit tests that assert the preset values of the style files.
 */
export function parseRules(css: string): Map<string, Declarations> {
  const rules = new Map<string, Declarations>();
  const rule = /([^{}]+)\{([^{}]*)\}/g;
  for (const match of css.replaceAll(/\/\*[\s\S]*?\*\//g, '').matchAll(rule)) {
    const selector = (match[1] ?? '').trim().replaceAll(/\s+/g, ' ');
    const declarations: Declarations = {};
    for (const line of (match[2] ?? '').split(';')) {
      const [name, ...value] = line.split(':');
      if (name?.trim()) declarations[name.trim()] = value.join(':').trim();
    }
    rules.set(selector, declarations);
  }
  return rules;
}
