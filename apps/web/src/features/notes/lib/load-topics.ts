import { getCollection } from 'astro:content';

import { site } from '@/shared/config/index.ts';

import { type ActiveTopic, activeTopics, assertTopics, topicTagMap } from './topics.ts';

/**
 * The topics that get a page and the raw-tag-to-slug map the chips use, from the `topics` and
 * `notes` collections. Runs the build guard first, so a bad `topics.json` fails every page that
 * reads it.
 */
export async function loadTopics(): Promise<{
  active: ActiveTopic[];
  tagMap: Map<string, string>;
}> {
  const [topicEntries, noteEntries] = await Promise.all([
    getCollection('topics'),
    getCollection('notes'),
  ]);
  const topics = topicEntries.map((entry) => ({ slug: entry.id, data: entry.data }));
  const notes = noteEntries.map((entry) => ({ slug: entry.id, data: entry.data }));
  const options = { minNotes: site.notes.topicMinNotes };
  assertTopics(topics, notes, options);
  const active = activeTopics(topics, notes, options.minNotes);
  return { active, tagMap: topicTagMap(active) };
}
