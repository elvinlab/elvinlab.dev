import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

type Rgb = [number, number, number];

const json = JSON.parse(readFileSync(new URL('./tokens.json', import.meta.url), 'utf8')) as {
  themes: Record<string, { colors: Record<string, string> }>;
};

function hex(value: string): Rgb {
  const n = Number.parseInt(value.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function luminance([r, g, b]: Rgb): number {
  const lin = (v: number) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

function contrast(a: Rgb, b: Rgb): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
}

/** The light `bg-chip` token (violet at 8 %) composited over a solid surface. */
function chipOver(surface: Rgb): Rgb {
  const ink: Rgb = [124, 58, 237];
  return ink.map((v, i) => v * 0.08 + (surface[i] ?? 0) * 0.92) as Rgb;
}

describe('light theme muted text contrast', () => {
  const colors = json.themes['elvinlab-light']?.colors ?? {};
  const muted = hex(colors['muted'] ?? '#000000');
  const surfaces: Record<string, Rgb> = {
    page: hex(colors['page'] ?? '#ffffff'),
    banner: hex(colors['banner'] ?? '#ffffff'),
    card: hex(colors['card'] ?? '#ffffff'),
    'card-hover': hex(colors['card-hover'] ?? '#ffffff'),
    'chip on page': chipOver(hex(colors['page'] ?? '#ffffff')),
    'chip on card': chipOver(hex(colors['card'] ?? '#ffffff')),
  };

  it.each(Object.entries(surfaces))('reaches 5:1 on %s', (_name, surface) => {
    expect(contrast(muted, surface)).toBeGreaterThanOrEqual(5);
  });
});
