import { describe, expect, it } from 'vitest';

import { experimentSchema } from './schema.ts';

const schema = experimentSchema();
const valid = {
  title: 'agentic-dev-setup',
  description: 'Multi-agent dev environment: model routing and persistent memory.',
  tags: ['ai-agents', 'tooling'],
  year: 2026,
  status: 'running',
  url: 'https://github.com/elvinlab/agentic-dev-setup',
  featured: true,
};

describe('experimentSchema', () => {
  it('accepts a complete experiment', () => {
    expect(schema.parse(valid).title).toBe('agentic-dev-setup');
  });

  it('makes url optional but rejects non-https links', () => {
    const { url: _, ...withoutUrl } = valid;
    expect(() => schema.parse(withoutUrl)).not.toThrow();
    expect(() => schema.parse({ ...valid, url: 'http://insecure.dev' })).toThrow();
  });

  it('never allows a mailto or email link', () => {
    expect(() => schema.parse({ ...valid, url: 'mailto:me@example.dev' })).toThrow();
  });

  it('accepts an optional non-negative integer order', () => {
    expect(schema.parse(valid).order).toBeUndefined();
    expect(schema.parse({ ...valid, order: 1 }).order).toBe(1);
    expect(() => schema.parse({ ...valid, order: -1 })).toThrow();
    expect(() => schema.parse({ ...valid, order: 1.5 })).toThrow();
  });

  it('accepts the archived status', () => {
    expect(schema.parse({ ...valid, status: 'archived' }).status).toBe('archived');
  });

  it('defaults status to shipped and rejects unknown status', () => {
    const { status: _, ...rest } = valid;
    expect(schema.parse(rest).status).toBe('shipped');
    expect(() => schema.parse({ ...valid, status: 'paused' })).toThrow();
  });

  it('defaults featured to false and caps tags', () => {
    const { featured: _, ...rest } = valid;
    expect(schema.parse(rest).featured).toBe(false);
    expect(() => schema.parse({ ...valid, tags: ['a', 'b', 'c', 'd', 'e', 'f'] })).toThrow();
  });

  it('keeps a plain string description valid and accepts one text per locale', () => {
    expect(schema.parse(valid).description).toBe(valid.description);
    const localized = { es: 'Hola', en: 'Hello' };
    expect(schema.parse({ ...valid, description: localized }).description).toEqual(localized);
  });

  it('rejects a localized description without the default locale or with an unknown locale', () => {
    expect(() => schema.parse({ ...valid, description: { en: 'Hello' } })).toThrow();
    expect(() => schema.parse({ ...valid, description: { es: 'Hola', fr: 'Salut' } })).toThrow();
  });

  it('parses an entry that has only the original fields', () => {
    const parsed = schema.parse(valid);
    expect(parsed.subtitle).toBeUndefined();
    expect(parsed.repo).toBeUndefined();
    expect(parsed.note).toBeUndefined();
    expect(parsed.images).toBeUndefined();
  });

  it('accepts the optional case fields, localized and capped at 200 characters', () => {
    const fields = {
      subtitle: { es: 'Sub', en: 'Sub' },
      problem: { es: 'Problema', en: 'Problem' },
      contribution: 'Mine',
      result: { es: 'Resultado', en: 'Result' },
    };
    expect(schema.parse({ ...valid, ...fields }).problem).toEqual(fields.problem);
    for (const key of Object.keys(fields)) {
      expect(() => schema.parse({ ...valid, [key]: 'x'.repeat(201) })).toThrow();
    }
  });

  it('treats repo like url: https only, never an email', () => {
    const repo = 'https://github.com/elvinlab/elvinlab.dev';
    expect(schema.parse({ ...valid, repo }).repo).toBe(repo);
    expect(() => schema.parse({ ...valid, repo: 'http://insecure.dev' })).toThrow();
    expect(() => schema.parse({ ...valid, repo: 'mailto:me@example.dev' })).toThrow();
  });

  it('requires note to be a kebab-case slug', () => {
    expect(schema.parse({ ...valid, note: 'agentic-dev-setup' }).note).toBe('agentic-dev-setup');
    expect(() => schema.parse({ ...valid, note: '/notes/x/' })).toThrow();
    expect(() => schema.parse({ ...valid, note: 'Not Kebab' })).toThrow();
  });

  it('accepts one to four images, each a file name with localized alt and optional caption', () => {
    const one = { file: 'cover.jpg', alt: { es: 'Captura', en: 'Screenshot' } };
    expect(schema.parse({ ...valid, images: [one] }).images).toEqual([one]);
    const withCaption = { ...one, caption: { es: 'Inicio', en: 'Home' } };
    expect(schema.parse({ ...valid, images: [withCaption] }).images).toEqual([withCaption]);
    const four = ['a', 'b', 'c', 'd'].map((n) => ({ file: `${n}.jpg`, alt: 'x' }));
    expect(schema.parse({ ...valid, images: four }).images).toHaveLength(4);
  });

  it('rejects zero or five images, a path in the file, a missing or long alt and a long caption', () => {
    const one = { file: 'a.jpg', alt: 'x' };
    expect(() => schema.parse({ ...valid, images: [] })).toThrow();
    expect(() =>
      schema.parse({ ...valid, images: Array.from({ length: 5 }, () => one) }),
    ).toThrow();
    expect(() =>
      schema.parse({ ...valid, images: [{ file: '../secret.jpg', alt: 'x' }] }),
    ).toThrow();
    expect(() => schema.parse({ ...valid, images: [{ file: 'a.jpg' }] })).toThrow();
    expect(() => schema.parse({ ...valid, images: [{ ...one, alt: 'x'.repeat(141) }] })).toThrow();
    expect(() =>
      schema.parse({ ...valid, images: [{ ...one, caption: 'x'.repeat(121) }] }),
    ).toThrow();
  });

  it('no longer accepts the single `image` field', () => {
    expect(schema.parse({ ...valid, image: { file: 'a.jpg', alt: 'x' } })).not.toHaveProperty(
      'image',
    );
  });
});
