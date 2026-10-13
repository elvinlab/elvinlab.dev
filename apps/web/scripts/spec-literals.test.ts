import { readdirSync, readFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import { DICTIONARIES } from '@/shared/i18n/index.ts';
import { siteConfig } from '@/site.config.ts';

/**
 * The browser specs must not copy what the site says about itself. An adopter changes the owner's
 * name, domain and bio first and then edits interface texts; a spec that has them written out would
 * turn the CI red for a reason that is not a defect. Specs read them from `helpers/site.ts`
 * (`site`, `text`, `identityIn`, `themes`), which reads the same files the site is built from.
 */
const root = resolve(import.meta.dirname, '../../..');
const specDir = join(root, 'tests/browser');
const HELPER = join(specDir, 'helpers/site.ts');

function files(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory()
      ? files(join(dir, entry.name))
      : entry.name.endsWith('.ts')
        ? [join(dir, entry.name)]
        : [],
  );
}

/** Values the specs may not write out, with where each one lives. */
function forbidden(): Map<string, string> {
  const values = new Map<string, string>();
  const add = (origin: string, value: unknown, minimum: number) => {
    if (typeof value === 'string' && value.trim().length >= minimum) {
      values.set(value.trim(), origin);
    }
  };
  const each = (origin: string, record: Record<string, string> | undefined, minimum: number) => {
    for (const value of Object.values(record ?? {})) add(origin, value, minimum);
  };
  const config = siteConfig;
  add('site.config url', config.url, 5);
  add('site.config title', config.title, 5);
  add('site.config identity.name', config.identity.name, 5);
  add('site.config identity.handle', config.identity.handle, 5);
  add('site.config identity.location', config.identity.location, 5);
  each('site.config identity.role', config.identity.role, 5);
  each('site.config identity.bio', config.identity.bio, 5);
  each('site.config description', config.description, 5);
  for (const social of config.socials) {
    add('site.config socials.url', social.url, 5);
    add('site.config socials.label', social.label, 5);
  }
  for (const item of config.now?.items ?? []) each('site.config now.text', item.text, 5);
  each('site.config recruiter.status', config.recruiter?.status, 5);
  each('site.config recruiter.lookingFor', config.recruiter?.lookingFor, 5);
  each('site.config me.pitch', config.me?.pitch, 5);
  each('site.config me.headline', config.me?.headline, 5);
  each('site.config me.intro', config.me?.intro, 5);
  const tokens = JSON.parse(
    readFileSync(join(root, 'packages/core/src/tokens/tokens.json'), 'utf8'),
  ) as { themes: Record<string, unknown> };
  for (const theme of Object.keys(tokens.themes)) add('tokens.json theme id', theme, 5);
  // Interface texts: the static parts around `{placeholders}`, long enough to be unambiguous.
  for (const dictionary of Object.values(DICTIONARIES)) {
    for (const [key, text] of Object.entries(dictionary)) {
      for (const chunk of String(text).split(/\{\w+\}/)) add(`i18n ${key}`, chunk, 10);
    }
  }
  return values;
}

describe('browser specs and the site they test', () => {
  it('do not copy the owner, the domain, the themes or the interface texts', () => {
    const values = forbidden();
    const found: string[] = [];
    for (const file of files(specDir)) {
      if (file === HELPER) continue;
      readFileSync(file, 'utf8')
        .split('\n')
        .forEach((rawLine, index) => {
          const trimmed = rawLine.trim();
          if (trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*'))
            return;
          const line = rawLine.replace(/\\(['"`])/g, '$1');
          for (const [value, origin] of values) {
            if (line.includes(value)) {
              found.push(`${relative(root, file)}:${index + 1} "${value}" (${origin})`);
            }
          }
        });
    }
    expect(found, `read these from tests/browser/helpers/site.ts:\n${found.join('\n')}`).toEqual(
      [],
    );
  });
});
