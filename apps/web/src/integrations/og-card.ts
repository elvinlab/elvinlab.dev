import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';

import { tokens } from '@elvinlab/core';
import satori from 'satori';
import sharp from 'sharp';

export const CARD_SIZE = { width: 1200, height: 630 } as const;

export type CardContent = { domain: string; eyebrow: string; title: string; footer: string };

export type CardChild = string | CardNode | CardChild[];
export type CardNode = {
  type: string;
  props: {
    style: Record<string, string | number>;
    children?: CardChild;
    src?: string;
    width?: number;
    height?: number;
  };
};
type CardFont = { name: string; data: Buffer; weight: 400 | 700; style: 'normal' };

const FONT_FAMILY = 'JetBrains Mono';

export const palette = (() => {
  const dark = Object.values(tokens.themes).find((theme) => theme.scheme === 'dark');
  if (!dark) throw new Error('og-card: the tokens define no dark theme');
  return dark.colors;
})();

export const rgba = (hex: string, alpha: number): string => {
  const value = Number.parseInt(hex.slice(1), 16);
  return `rgba(${(value >> 16) & 255}, ${(value >> 8) & 255}, ${value & 255}, ${alpha})`;
};

/** Longer titles get a smaller size so they stay within about three lines. */
export function cardTitleSize(title: string): number {
  if (title.length <= 36) return 68;
  if (title.length <= 60) return 56;
  return 46;
}

export const text = (style: Record<string, string | number>, children: string): CardNode => ({
  type: 'div',
  props: { style: { display: 'flex', ...style }, children },
});

/** Root style shared by every share card: dark page with the cyan and pink glows. */
export const cardRootStyle: Record<string, string | number> = {
  display: 'flex',
  width: CARD_SIZE.width,
  height: CARD_SIZE.height,
  padding: '72px 90px',
  fontFamily: FONT_FAMILY,
  color: palette['text'] ?? '#ffffff',
  backgroundColor: palette['page'] ?? '#000000',
  backgroundImage: [
    `radial-gradient(circle at 18% 12%, ${rgba(palette['cyan'] ?? '#22d3ee', 0.16)} 0%, rgba(0, 0, 0, 0) 55%)`,
    `radial-gradient(circle at 88% 92%, ${rgba(palette['pink'] ?? '#ec4899', 0.16)} 0%, rgba(0, 0, 0, 0) 50%)`,
  ].join(', '),
};

/** The satori element tree of a note share card, styled like `public/og-image.png`. */
export function buildCardTree(content: CardContent): CardNode {
  return {
    type: 'div',
    props: {
      style: { ...cardRootStyle, flexDirection: 'column', justifyContent: 'space-between' },
      children: [
        text({ fontSize: 28, color: palette['cyan'] ?? '#22d3ee' }, content.domain),
        {
          type: 'div',
          props: {
            style: { display: 'flex', flexDirection: 'column', gap: 20 },
            children: [
              text(
                {
                  fontSize: 26,
                  fontWeight: 700,
                  letterSpacing: 3,
                  textTransform: 'uppercase',
                  color: palette['pink'] ?? '#ec4899',
                },
                content.eyebrow,
              ),
              text(
                {
                  fontSize: cardTitleSize(content.title),
                  fontWeight: 700,
                  lineHeight: 1.2,
                  maxWidth: 1020,
                },
                content.title,
              ),
            ],
          },
        },
        {
          type: 'div',
          props: {
            style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
            children: [
              text({ fontSize: 26, color: palette['muted'] ?? '#8b949e' }, content.footer),
              {
                type: 'div',
                props: {
                  style: { width: 14, height: 38, backgroundColor: palette['pink'] ?? '#ec4899' },
                },
              },
            ],
          },
        },
      ],
    },
  };
}

let fonts: CardFont[] | undefined;

/** satori reads TTF/OTF/WOFF, not WOFF2, so the static Fontsource files are used (cached). */
export function loadCardFonts(): CardFont[] {
  if (fonts) return fonts;
  const root = dirname(
    createRequire(import.meta.url).resolve('@fontsource/jetbrains-mono/package.json'),
  );
  const file = (weight: 400 | 700): CardFont => ({
    name: FONT_FAMILY,
    data: readFileSync(join(root, 'files', `jetbrains-mono-latin-${weight}-normal.woff`)),
    weight,
    style: 'normal',
  });
  fonts = [file(400), file(700)];
  return fonts;
}

export async function renderCardTree(tree: CardNode): Promise<Buffer> {
  const svg = await satori(tree as unknown as Parameters<typeof satori>[0], {
    ...CARD_SIZE,
    fonts: loadCardFonts(),
  });
  return sharp(Buffer.from(svg)).png().toBuffer();
}

export const renderCardPng = (content: CardContent): Promise<Buffer> =>
  renderCardTree(buildCardTree(content));
