import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import { bindingsSchema } from '@/features/contact/bindings.ts';
import { subscribeBindingsSchema } from '@/features/subscribe/bindings.ts';

import { ENV_VARS } from './env-vars.ts';

const web = resolve(import.meta.dirname, '../../..');
// Built into Vite/Astro or the runtime; not settings of this site.
const BUILT_IN = new Set(['DEV', 'PROD', 'MODE', 'BASE_URL', 'SSR', 'SITE', 'ASSETS_PREFIX']);

function sources(directory: string): string[] {
  return readdirSync(directory).flatMap((entry) => {
    const path = join(directory, entry);
    if (entry === 'node_modules' || entry === 'dist' || entry === 'boundaries-mirror') return [];
    if (statSync(path).isDirectory()) return sources(path);
    return /\.(ts|tsx|astro)$/.test(entry) && !/\.test\.ts$/.test(entry) ? [path] : [];
  });
}

const names = (text: string): string[] => [
  ...[...text.matchAll(/import\.meta\.env\.([A-Z][A-Z0-9_]+)/g)].map((match) => match[1] ?? ''),
  ...[...text.matchAll(/process\.env\[['"]([A-Z][A-Z0-9_]+)['"]\]/g)].map(
    (match) => match[1] ?? '',
  ),
];

describe('ENV_VARS registry', () => {
  it('lists every environment variable the code reads', () => {
    const registered = new Set(ENV_VARS.map((variable) => variable.name));
    const unregistered = sources(web)
      .flatMap((file) =>
        names(readFileSync(file, 'utf8')).map((name) => `${name} (${file.replace(`${web}/`, '')})`),
      )
      .filter(
        (entry) =>
          !BUILT_IN.has(entry.split(' ')[0] ?? '') && !registered.has(entry.split(' ')[0] ?? ''),
      );
    expect(unregistered).toEqual([]);
  });

  it('has no duplicate names and describes every variable', () => {
    const all = ENV_VARS.map((variable) => variable.name);
    expect(new Set(all).size).toBe(all.length);
    for (const variable of ENV_VARS) expect(variable.description.length).toBeGreaterThan(20);
  });

  it('matches the Worker bindings the contact form and the subscription validate (secrets and settings)', () => {
    const registered = ENV_VARS.filter((variable) => variable.scope === 'worker').map(
      (variable) => variable.name,
    );
    const bound = new Set(
      [...Object.keys(bindingsSchema.shape), ...Object.keys(subscribeBindingsSchema.shape)].filter(
        (key) => !key.endsWith('_RATE_LIMITER') && key !== 'SITE_DB',
      ),
    );
    expect(registered.sort()).toEqual([...bound].sort());
  });

  it('never marks a public build variable as secret, nor a Worker secret as public', () => {
    for (const variable of ENV_VARS) {
      if (variable.name.startsWith('PUBLIC_')) expect(variable.secret).toBe(false);
      if (variable.name.endsWith('_KEY') && variable.scope === 'worker')
        expect(variable.secret).toBe(true);
    }
  });
});
