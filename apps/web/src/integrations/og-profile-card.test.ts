import sharp from 'sharp';
import { describe, expect, it } from 'vitest';

import { CARD_SIZE } from './og-card.ts';
import {
  buildProfileCardTree,
  type ProfileCardContent,
  profileCardContentFor,
  renderProfileCardPng,
} from './og-profile-card.ts';

const site = {
  url: 'https://example.dev',
  identity: {
    name: 'Jane Doe',
    role: { es: 'Ingeniera full-stack', en: 'Full-stack engineer' },
    location: 'Lisboa',
    startedYear: 2020,
  },
  recruiter: {
    available: true,
    openToWork: false,
    status: { es: 'No disponible · trabajando en Acme', en: 'Not available · working at Acme' },
  },
} as const;

type Node = { type: string; props: { children?: unknown; style?: Record<string, unknown> } };

function collect(node: unknown, found: { text: string[]; types: string[] }): void {
  if (typeof node === 'string') found.text.push(node);
  else if (Array.isArray(node)) for (const child of node) collect(child, found);
  else if (node && typeof node === 'object' && 'props' in node) {
    found.types.push((node as Node).type);
    collect((node as Node).props.children, found);
  }
}

describe('profileCardContentFor', () => {
  it('builds the Spanish card from the site config', () => {
    expect(profileCardContentFor(site, 'es', 2026)).toEqual({
      domain: 'example.dev/me',
      eyebrow: 'hola, soy',
      name: 'Jane Doe',
      role: 'Ingeniera full-stack',
      facts: ['Lisboa', '6+ años'],
      status: { text: 'No disponible · trabajando en Acme', open: false },
    });
  });

  it('builds the English card with English labels', () => {
    const card = profileCardContentFor(site, 'en', 2026);
    expect(card.eyebrow).toBe("hello, I'm");
    expect(card.role).toBe('Full-stack engineer');
    expect(card.facts).toEqual(['Lisboa', '6+ years']);
  });

  it('shows the dot as open when the owner is open to work', () => {
    const open = { ...site, recruiter: { ...site.recruiter, openToWork: true } };
    expect(profileCardContentFor(open, 'es', 2026).status?.open).toBe(true);
  });

  it('omits the status when the status line is hidden and the location when absent', () => {
    const hidden = {
      ...site,
      identity: { name: 'Jane Doe', role: site.identity.role, startedYear: 2020 },
      recruiter: { ...site.recruiter, available: false },
    };
    const card = profileCardContentFor(hidden, 'es', 2026);
    expect(card.status).toBeUndefined();
    expect(card.facts).toEqual(['6+ años']);
  });
});

describe('buildProfileCardTree', () => {
  const content: ProfileCardContent = {
    domain: 'example.dev/me',
    eyebrow: 'hola, soy',
    name: 'Jane Doe',
    role: 'Ingeniera full-stack',
    facts: ['Lisboa', '6+ años'],
    status: { text: 'No disponible · trabajando en Acme', open: false },
  };

  it('is a 1200x630 canvas carrying every piece of text', () => {
    const tree = buildProfileCardTree(content) as unknown as Node;
    expect(tree.props.style?.['width']).toBe(CARD_SIZE.width);
    expect(tree.props.style?.['height']).toBe(CARD_SIZE.height);
    const found = { text: [] as string[], types: [] as string[] };
    collect(tree, found);
    const text = found.text.join('|');
    for (const part of [
      'example.dev/me',
      'hola, soy',
      'Jane Doe',
      'Ingeniera full-stack',
      'Lisboa',
      '6+ años',
      'No disponible · trabajando en Acme',
    ]) {
      expect(text).toContain(part);
    }
  });

  it('includes the photo only when one is given', () => {
    const without = { text: [] as string[], types: [] as string[] };
    collect(buildProfileCardTree(content), without);
    expect(without.types).not.toContain('img');
    const withPhoto = { text: [] as string[], types: [] as string[] };
    collect(buildProfileCardTree({ ...content, avatar: 'data:image/png;base64,AAAA' }), withPhoto);
    expect(withPhoto.types).toContain('img');
  });
});

describe('renderProfileCardPng', () => {
  const content: ProfileCardContent = {
    domain: 'example.dev/me',
    eyebrow: 'hola, soy',
    name: 'Jane Doe',
    role: 'Ingeniera full-stack',
    facts: ['Lisboa', '6+ años'],
    status: { text: 'No disponible · trabajando en Acme', open: false },
  };

  it('renders a 1200x630 PNG with a photo', async () => {
    const photo = await sharp({
      create: { width: 300, height: 300, channels: 3, background: '#8b5cf6' },
    })
      .png()
      .toBuffer();
    const png = await renderProfileCardPng({
      ...content,
      avatar: `data:image/png;base64,${photo.toString('base64')}`,
    });
    const meta = await sharp(png).metadata();
    expect([meta.format, meta.width, meta.height]).toEqual(['png', 1200, 630]);
  });

  it('renders without a photo or a status', async () => {
    const { status: _status, ...bare } = content;
    const png = await renderProfileCardPng(bare);
    expect((await sharp(png).metadata()).height).toBe(630);
  });
});
