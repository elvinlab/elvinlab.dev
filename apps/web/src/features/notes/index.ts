// Page-level entry components — the only way pages reach the notes feature.
export { default as NotePage } from './components/NotePage.astro';
export { default as NotesIndex } from './components/NotesIndex.astro';
export { type NoteData, noteSchema } from './schema.ts';
