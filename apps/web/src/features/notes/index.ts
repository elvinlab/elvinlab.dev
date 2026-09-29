// Presentation atoms other features (the home) may reuse.
export { default as DecisionRecord } from './components/DecisionRecord.astro';
export { default as LangBadge } from './components/LangBadge.astro';
export { default as NoteIndexRow } from './components/NoteIndexRow.astro';
// Page-level entry components — the only way pages reach the notes feature.
export { default as NotePage } from './components/NotePage.astro';
export { default as NotesIndex } from './components/NotesIndex.astro';
// Data helpers and types, part of the feature's public API.
export {
  adjacentNotes,
  filterByLang,
  formatDate,
  groupByYear,
  type NoteLike,
  noteNumber,
  readingMinutes,
  relatedNotes,
  sortNotes,
} from './lib/notes.ts';
export { buildRssFeed, escapeXml, type FeedNote } from './lib/rss.ts';
export { type NoteData, noteSchema } from './schema.ts';
