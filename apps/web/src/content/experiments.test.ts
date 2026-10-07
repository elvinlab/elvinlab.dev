import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { experimentSchema } from '@/features/portfolio/schema.ts';

const read = (path: string) => fileURLToPath(new URL(path, import.meta.url));
const projects = JSON.parse(readFileSync(read('./experiments.json'), 'utf8')) as Record<
  string,
  unknown
>;

describe('content/experiments.json', () => {
  it('parses against the schema', () => {
    for (const [id, project] of Object.entries(projects)) {
      expect(experimentSchema().safeParse(project).success, id).toBe(true);
    }
  });

  it('only points at published notes, so no case link can be dead', () => {
    for (const [id, project] of Object.entries(experimentSchemaParsed())) {
      if (project.note === undefined) continue;
      expect(existsSync(read(`./notes/${project.note}/index.mdx`)), id).toBe(true);
    }
  });

  it('only points at images that exist in assets/experiments/<id>/', () => {
    for (const [id, project] of Object.entries(experimentSchemaParsed())) {
      for (const image of project.images ?? []) {
        expect(existsSync(read(`../assets/experiments/${id}/${image.file}`)), id).toBe(true);
      }
    }
  });

  it('gives every image a non-empty alt text in both locales', () => {
    for (const [id, project] of Object.entries(experimentSchemaParsed())) {
      for (const image of project.images ?? []) {
        for (const locale of ['es', 'en'] as const) {
          const alt = typeof image.alt === 'string' ? image.alt : image.alt[locale];
          expect(alt?.length ?? 0, `${id} ${image.file} ${locale}`).toBeGreaterThan(0);
        }
      }
    }
  });
});

function experimentSchemaParsed() {
  return Object.fromEntries(
    Object.entries(projects).map(([id, project]) => [id, experimentSchema().parse(project)]),
  );
}
