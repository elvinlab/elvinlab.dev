/**
 * @packageDocumentation
 * `@elvinlab/core` — presentation-only design base: tokens, themes and i18n infrastructure.
 * No fetch, no persistence. Data in via props, events out.
 */

import { parseTokens, type Tokens } from './tokens/schema.ts';
import rawTokens from './tokens/tokens.json' with { type: 'json' };

export { renderTokensCss } from './tokens/render-css.ts';
export { parseTokens, type Tokens } from './tokens/schema.ts';

/** Validated design tokens of the default theme set (`tokens.json`). */
export const tokens: Tokens = parseTokens(rawTokens);

/** Theme applied when the visitor has no stored or system preference. */
export const DEFAULT_THEME: string = tokens.defaultTheme;
