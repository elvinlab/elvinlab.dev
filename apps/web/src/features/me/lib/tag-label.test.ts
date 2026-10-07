import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { tagLabel } from './tag-label.ts';

const experienceFile = fileURLToPath(new URL('../../../content/experience.json', import.meta.url));
const experience = JSON.parse(readFileSync(experienceFile, 'utf8')) as Record<
  string,
  { tags: string[] }
>;
const tagIds = [...new Set(Object.values(experience).flatMap((entry) => entry.tags))];

describe('tagLabel', () => {
  it('turns known ids into display names', () => {
    expect(tagLabel('dotnet')).toBe('.NET');
    expect(tagLabel('reactjs')).toBe('React');
    expect(tagLabel('spring-boot')).toBe('Spring Boot');
    expect(tagLabel('sql-server')).toBe('SQL Server');
  });

  it('returns an unknown id unchanged', () => {
    expect(tagLabel('some-new-tool')).toBe('some-new-tool');
  });

  it('gives every tag used in experience.json a label that is not the raw id', () => {
    const rawLooking = tagIds.filter((id) => {
      const label = tagLabel(id);
      return label === id && (id.includes('-') || id === id.toLowerCase());
    });
    expect(rawLooking).toEqual([]);
  });
});
