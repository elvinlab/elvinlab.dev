import type { Locale } from '@/shared/i18n/index.ts';

import type { NoteLike } from './notes.ts';

/** How many notes the "most active" block holds at most. */
export const PULSE_SIZE = 5;

export type PulseKind = 'comments' | 'marks' | 'reads';

/** Interaction counts of one note, from the build-time snapshot; a missing kind counts as 0. */
export type PulseSignals = Partial<Record<PulseKind, number>>;

/** A comment says more than a footprint, and a footprint more than a plain read. */
const WEIGHT: Record<PulseKind, number> = { comments: 5, marks: 3, reads: 1 };
const KINDS = Object.keys(WEIGHT) as PulseKind[];

export type PulseEntry<T extends NoteLike> = {
  note: T;
  /** The signal that weighs most for this note: the one the block names. */
  top: { kind: PulseKind; count: number };
};

/**
 * The notes of one language ordered by weighted interaction, newest first on a tie. Notes without
 * any interaction are left out, so an empty snapshot gives an empty list and the block does not render.
 */
export function rankPulse<T extends NoteLike>(
  notes: readonly T[],
  signals: Readonly<Record<string, PulseSignals>>,
  locale: Locale,
  limit: number = PULSE_SIZE,
): PulseEntry<T>[] {
  const scored: { entry: PulseEntry<T>; score: number }[] = [];
  for (const note of notes) {
    if (note.data.lang !== locale) continue;
    const own = signals[note.slug];
    if (!own) continue;
    let score = 0;
    let top: PulseEntry<T>['top'] | undefined;
    let topWeight = 0;
    for (const kind of KINDS) {
      const count = own[kind] ?? 0;
      const weighted = count * WEIGHT[kind];
      score += weighted;
      if (weighted > topWeight) {
        topWeight = weighted;
        top = { kind, count };
      }
    }
    if (top) scored.push({ entry: { note, top }, score });
  }
  return scored
    .sort((a, b) => b.score - a.score || b.entry.note.data.number - a.entry.note.data.number)
    .slice(0, limit)
    .map(({ entry }) => entry);
}
