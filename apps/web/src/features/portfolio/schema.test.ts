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
});
