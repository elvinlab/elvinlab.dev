import type { Tokens } from './schema.ts';

/** Prefix of the runtime CSS variables that components read (`var(--ui-page)`). */
const RUNTIME_PREFIX = '--ui-';

type Declarations = ReadonlyArray<readonly [name: string, value: string]>;

const block = (selector: string, declarations: Declarations): string =>
  `${selector} {\n${declarations.map(([name, value]) => `  ${name}: ${value};`).join('\n')}\n}`;

const runtimeColors = (colors: Record<string, string>): Declarations =>
  Object.entries(colors).map(([name, value]) => [`${RUNTIME_PREFIX}${name}`, value] as const);

/**
 * Renders the tokens as CSS: a Tailwind `@theme inline` block whose utilities (`bg-page`,
 * `rounded-card`, `font-display`) read runtime variables, the default theme on `:root`, and every
 * theme on `[data-theme="<name>"]` so themes switch without rebuilding.
 */
export const renderTokensCss = (tokens: Tokens): string => {
  const colorNames = Object.keys(tokens.themes[tokens.defaultTheme]?.colors ?? {});
  const tailwind: Declarations = [
    ...colorNames.map((name) => [`--color-${name}`, `var(${RUNTIME_PREFIX}${name})`] as const),
    ...Object.keys(tokens.radius).map(
      (name) => [`--radius-${name}`, `var(${RUNTIME_PREFIX}radius-${name})`] as const,
    ),
    ...Object.keys(tokens.fonts).map(
      (name) => [`--font-${name}`, `var(${RUNTIME_PREFIX}font-${name})`] as const,
    ),
  ];
  const shared: Declarations = [
    ...Object.entries(tokens.radius).map(
      ([name, value]) => [`${RUNTIME_PREFIX}radius-${name}`, value] as const,
    ),
    ...Object.entries(tokens.fonts).map(
      ([name, value]) => [`${RUNTIME_PREFIX}font-${name}`, value] as const,
    ),
  ];
  const themes = Object.entries(tokens.themes).map(([name, theme]) => {
    const selector =
      name === tokens.defaultTheme ? `:root,\n[data-theme="${name}"]` : `[data-theme="${name}"]`;
    return block(selector, [['color-scheme', theme.scheme], ...runtimeColors(theme.colors)]);
  });

  return [
    '/* Generated from tokens.json by `pnpm --filter @elvinlab/core tokens`. Do not edit by hand. */',
    block('@theme inline', tailwind),
    block(':root', shared),
    ...themes,
  ]
    .join('\n\n')
    .concat('\n');
};
