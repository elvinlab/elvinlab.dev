import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

import sharp from 'sharp';
import { afterEach, describe, expect, it } from 'vitest';

import {
  cardContentFor,
  ogImages,
  parseNoteFrontmatter,
  readNoteCardSourcesFromDisk,
} from './og-images.ts';

const temporary: string[] = [];
afterEach(() => {
  for (const directory of temporary.splice(0)) rmSync(directory, { recursive: true, force: true });
});

function contentDir(notes: Record<string, string>): string {
  const root = mkdtempSync(join(tmpdir(), 'og-content-'));
  temporary.push(root);
  for (const [slug, mdx] of Object.entries(notes)) {
    mkdirSync(join(root, 'notes', slug), { recursive: true });
    writeFileSync(join(root, 'notes', slug, 'index.mdx'), mdx);
  }
  return root;
}

const note = (title: string, extra = '') =>
  `---\nnumber: 2\ntitle: ${title}\ndescription: "d"\npubDate: 2026-10-01\nlang: es\n${extra}---\n\nBody\n`;

describe('parseNoteFrontmatter', () => {
  it('reads number, title, language and date', () => {
    expect(parseNoteFrontmatter(note('"Cómo construí este sitio"'))).toEqual({
      number: 2,
      title: 'Cómo construí este sitio',
      lang: 'es',
      pubDate: new Date('2026-10-01'),
    });
  });

  it('understands escaped double quotes, single quotes and bare titles', () => {
    expect(parseNoteFrontmatter(note('"Dijo \\"hola\\": sí"'))?.title).toBe('Dijo "hola": sí');
    expect(parseNoteFrontmatter(note("'It''s fine'"))?.title).toBe("It's fine");
    expect(parseNoteFrontmatter(note('Plain title'))?.title).toBe('Plain title');
  });

  it('returns null when required fields are missing', () => {
    expect(parseNoteFrontmatter('---\ntitle: "x"\n---\n')).toBeNull();
    expect(parseNoteFrontmatter('no frontmatter')).toBeNull();
  });
});

describe('readNoteCardSourcesFromDisk', () => {
  it('lists published notes by slug and ignores drafts and folders without a note', () => {
    const dir = contentDir({ 'one-note': note('"One"'), 'two-note': note('"Two"') });
    mkdirSync(join(dir, 'drafts', 'secret'), { recursive: true });
    writeFileSync(join(dir, 'drafts', 'secret', 'index.mdx'), note('"Secret"'));
    mkdirSync(join(dir, 'notes', 'empty'), { recursive: true });
    const slugs = readNoteCardSourcesFromDisk(dir).map((source) => source.slug);
    expect(slugs.sort()).toEqual(['one-note', 'two-note']);
  });

  it('returns nothing when there is no notes folder', () => {
    expect(readNoteCardSourcesFromDisk(contentDir({}))).toEqual([]);
  });
});

describe('cardContentFor', () => {
  const site = { domain: 'example.dev', owner: 'Jane Doe' };

  it('labels a Spanish note with its number and a long Spanish date', () => {
    const card = cardContentFor(
      { slug: 'x', number: 1, title: 'Título', lang: 'es', pubDate: new Date('2026-10-01') },
      site,
    );
    expect(card).toEqual({
      domain: 'example.dev',
      eyebrow: 'Nota 001',
      title: 'Título',
      footer: 'Jane Doe · 1 de octubre de 2026',
    });
  });

  it('uses the English labels for an English note', () => {
    const card = cardContentFor(
      { slug: 'x', number: 12, title: 'Title', lang: 'en', pubDate: new Date('2026-10-01') },
      site,
    );
    expect(card.eyebrow).toBe('Note 012');
    expect(card.footer).toBe('Jane Doe · October 1, 2026');
  });
});

describe('ogImages integration', () => {
  it('writes one PNG per published note into og/notes of the build', async () => {
    const dir = contentDir({ 'one-note': note('"One"') });
    const out = mkdtempSync(join(tmpdir(), 'og-out-'));
    temporary.push(out);
    const hook = ogImages(dir).hooks['astro:build:done'] as (arg: unknown) => Promise<void>;
    await hook({ dir: pathToFileURL(`${out}/`), logger: { info: () => undefined } });
    const png = readFileSync(join(out, 'og', 'notes', 'one-note.png'));
    const meta = await sharp(png).metadata();
    expect([meta.format, meta.width, meta.height]).toEqual(['png', 1200, 630]);
  });
});

describe('ogImages integration: /me cards', () => {
  const site = {
    url: 'https://example.dev',
    identity: {
      name: 'Jane Doe',
      role: { es: 'Ingeniera', en: 'Engineer' },
      location: 'Lisboa',
      startedYear: 2020,
      avatar: 'avatar.png',
    },
    recruiter: { available: true, openToWork: true, status: { es: 'Disponible', en: 'Available' } },
    features: { me: true },
  };

  async function run(options: { photo: boolean; me?: boolean }): Promise<string> {
    const assetsDir = mkdtempSync(join(tmpdir(), 'og-assets-'));
    const out = mkdtempSync(join(tmpdir(), 'og-out-'));
    temporary.push(assetsDir, out);
    if (options.photo) {
      const photo = await sharp({
        create: { width: 400, height: 500, channels: 3, background: '#8b5cf6' },
      })
        .png()
        .toBuffer();
      writeFileSync(join(assetsDir, 'avatar.png'), photo);
    }
    const config = { ...site, features: { me: options.me ?? true } };
    const hook = ogImages(contentDir({}), { assetsDir, site: config }).hooks[
      'astro:build:done'
    ] as (arg: unknown) => Promise<void>;
    await hook({ dir: pathToFileURL(`${out}/`), logger: { info: () => undefined } });
    return out;
  }

  it('writes a 1200x630 card per locale, with the photo', async () => {
    const out = await run({ photo: true });
    for (const locale of ['es', 'en']) {
      const meta = await sharp(readFileSync(join(out, 'og', `me-${locale}.png`))).metadata();
      expect([meta.format, meta.width, meta.height]).toEqual(['png', 1200, 630]);
    }
  });

  it('reads the photo from the assets folder (the card differs from the photo-less one)', async () => {
    const withPhoto = readFileSync(join(await run({ photo: true }), 'og', 'me-es.png'));
    const withoutPhoto = readFileSync(join(await run({ photo: false }), 'og', 'me-es.png'));
    expect(withPhoto.equals(withoutPhoto)).toBe(false);
  });

  it('still writes the cards when the photo file is missing', async () => {
    const out = await run({ photo: false });
    expect(existsSync(join(out, 'og', 'me-es.png'))).toBe(true);
  });

  it('writes no /me card when the /me feature is off', async () => {
    const out = await run({ photo: true, me: false });
    expect(existsSync(join(out, 'og', 'me-es.png'))).toBe(false);
  });
});

describe('ogImages integration: /me card portrait', () => {
  type Identity = { avatar?: string; photo?: string };
  type Raster = {
    width: number;
    height: number;
    color: string;
    /** Rows from `splitAt` down are painted `bottomColor`. */
    bottomColor?: string;
    splitAt?: number;
  };

  /** Writes the given images into a fresh assets folder, builds the cards and returns the es card. */
  async function card(identity: Identity, images: Record<string, Raster>): Promise<Buffer> {
    const assetsDir = mkdtempSync(join(tmpdir(), 'og-assets-'));
    const out = mkdtempSync(join(tmpdir(), 'og-out-'));
    temporary.push(assetsDir, out);
    for (const [name, { width, height, color, bottomColor, splitAt = width }] of Object.entries(
      images,
    )) {
      let image = sharp({ create: { width, height, channels: 3, background: color } });
      if (bottomColor) {
        const band = await sharp({
          create: { width, height: height - splitAt, channels: 3, background: bottomColor },
        })
          .png()
          .toBuffer();
        image = image.composite([{ input: band, top: splitAt, left: 0 }]);
      }
      writeFileSync(join(assetsDir, name), await image.png().toBuffer());
    }
    const config = {
      url: 'https://example.dev',
      identity: {
        name: 'Jane Doe',
        role: { es: 'Ingeniera', en: 'Engineer' },
        startedYear: 2020,
        ...identity,
      },
      recruiter: { available: false, openToWork: false, status: {} },
      features: { me: true },
    };
    const hook = ogImages(contentDir({}), { assetsDir, site: config }).hooks[
      'astro:build:done'
    ] as (arg: unknown) => Promise<void>;
    await hook({ dir: pathToFileURL(`${out}/`), logger: { info: () => undefined } });
    return readFileSync(join(out, 'og', 'me-es.png'));
  }

  const red = { width: 400, height: 400, color: '#ff0000' };
  const blue = { width: 400, height: 400, color: '#0000ff' };

  it('uses identity.photo when present, not the avatar', async () => {
    const withPhoto = await card(
      { avatar: 'avatar.png', photo: 'photo.png' },
      { 'avatar.png': red, 'photo.png': blue },
    );
    const photoAsAvatar = await card({ avatar: 'avatar.png' }, { 'avatar.png': blue });
    const avatarOnly = await card({ avatar: 'avatar.png' }, { 'avatar.png': red });
    expect(withPhoto.equals(photoAsAvatar)).toBe(true);
    expect(withPhoto.equals(avatarOnly)).toBe(false);
  });

  it('falls back to the avatar when no photo is configured', async () => {
    const withoutPhoto = await card({ avatar: 'avatar.png' }, { 'avatar.png': red });
    const sameAvatar = await card(
      { avatar: 'avatar.png' },
      { 'avatar.png': red, 'photo.png': blue },
    );
    expect(withoutPhoto.equals(sameAvatar)).toBe(true);
  });

  it('crops a portrait photo from the top instead of the centre', async () => {
    // 400x800 scales to 300x600; the square crop keeps 300 rows. From the top those rows come from
    // the red 500 rows only; from the centre they would reach the blue band below.
    const portrait = { width: 400, height: 800, color: '#ff0000' };
    const cropped = await card(
      { photo: 'photo.png' },
      { 'photo.png': { ...portrait, bottomColor: '#0000ff', splitAt: 500 } },
    );
    const allRed = await card({ photo: 'photo.png' }, { 'photo.png': portrait });
    const noImage = await card({}, {});
    expect(cropped.equals(noImage)).toBe(false);
    expect(cropped.equals(allRed)).toBe(true);
  });
});
