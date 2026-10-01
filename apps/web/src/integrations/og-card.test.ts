import sharp from 'sharp';
import { describe, expect, it } from 'vitest';

import { buildCardTree, CARD_SIZE, cardTitleSize, renderCardPng } from './og-card.ts';

const content = {
  domain: 'example.dev',
  eyebrow: 'Nota 001',
  title: 'Cómo construí este sitio',
  footer: 'Jane Doe · 1 de octubre de 2026',
};

type Node = { type: string; props: { children?: unknown; style?: Record<string, unknown> } };

function collectText(node: unknown): string[] {
  if (typeof node === 'string') return [node];
  if (Array.isArray(node)) return node.flatMap(collectText);
  if (node && typeof node === 'object' && 'props' in node) {
    return collectText((node as Node).props.children);
  }
  return [];
}

describe('cardTitleSize', () => {
  it('shrinks the title as it gets longer so it stays within a few lines', () => {
    expect(cardTitleSize('x'.repeat(30))).toBe(68);
    expect(cardTitleSize('x'.repeat(50))).toBe(56);
    expect(cardTitleSize('x'.repeat(90))).toBe(46);
  });
});

describe('buildCardTree', () => {
  it('is a 1200x630 canvas that carries every piece of text', () => {
    const tree = buildCardTree(content) as unknown as Node;
    expect(tree.props.style?.['width']).toBe(CARD_SIZE.width);
    expect(tree.props.style?.['height']).toBe(CARD_SIZE.height);
    const text = collectText(tree).join('|');
    for (const part of Object.values(content)) expect(text).toContain(part);
  });
});

describe('renderCardPng', () => {
  it('renders a 1200x630 PNG', async () => {
    const png = await renderCardPng(content);
    expect([...png.subarray(0, 8)]).toEqual([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    const meta = await sharp(png).metadata();
    expect([meta.format, meta.width, meta.height]).toEqual(['png', 1200, 630]);
  });

  it('renders the longest allowed title (90 characters) without failing', async () => {
    const png = await renderCardPng({ ...content, title: 'Á'.repeat(90) });
    expect((await sharp(png).metadata()).height).toBe(630);
  });

  it('draws different cards for different titles', async () => {
    const a = await renderCardPng(content);
    const b = await renderCardPng({ ...content, title: 'Otro título' });
    expect(a.equals(b)).toBe(false);
  });
});
