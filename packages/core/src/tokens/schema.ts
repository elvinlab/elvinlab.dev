import { z } from 'zod';

const tokenName = z
  .string()
  .regex(/^[a-z][a-z0-9]*(-[a-z0-9]+)*$/, 'token names must be kebab-case');
const tokenGroup = z.record(tokenName, z.string().min(1));

const themeSchema = z.object({
  scheme: z.enum(['dark', 'light']),
  colors: tokenGroup,
});

const tokensSchema = z
  .object({
    defaultTheme: tokenName,
    themes: z.record(tokenName, themeSchema),
    radius: tokenGroup,
    fonts: tokenGroup,
  })
  .superRefine((tokens, ctx) => {
    const defaultTheme = tokens.themes[tokens.defaultTheme];
    if (!defaultTheme) {
      ctx.addIssue({
        code: 'custom',
        path: ['defaultTheme'],
        message: `defaultTheme "${tokens.defaultTheme}" is not defined in themes`,
      });
      return;
    }
    const expected = Object.keys(defaultTheme.colors).sort();
    for (const [name, theme] of Object.entries(tokens.themes)) {
      const actual = Object.keys(theme.colors).sort();
      const missing = expected.filter((key) => !actual.includes(key));
      const extra = actual.filter((key) => !expected.includes(key));
      if (missing.length > 0 || extra.length > 0) {
        ctx.addIssue({
          code: 'custom',
          path: ['themes', name, 'colors'],
          message: `theme "${name}" must define the same colors as the default theme (missing: ${missing.join(', ') || 'none'}; extra: ${extra.join(', ') || 'none'})`,
        });
      }
    }
  });

/** Design tokens: one set of semantic colors per theme plus theme-independent radii and fonts. */
export type Tokens = z.infer<typeof tokensSchema>;

/**
 * Validates raw tokens (usually `tokens.json`). Every theme must define exactly the colors of the
 * default theme, so a white-label theme can never ship with a missing variable.
 */
export const parseTokens = (raw: unknown): Tokens => tokensSchema.parse(raw);
