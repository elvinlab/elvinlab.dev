import type { Appearance } from '@/shared/config/appearance.ts';
import { appearance } from '@/shared/config/index.ts';

/** Where a note's secondary meta (language badge, author) goes: the header or the foot. */
export type SecondaryMetaPlacement = 'header' | 'foot';

/**
 * The calm preset keeps the note header to the date and the reading time and moves the language
 * badge (and, on the note page, the author) to the foot; `full` keeps today's header. This is the
 * one place that reads the preset for the note meta, so the components only ask where it goes.
 */
export function secondaryMetaPlacement(preset: Appearance): SecondaryMetaPlacement {
  return preset === 'minimal' ? 'foot' : 'header';
}

/** The placement of the configured preset. */
export const secondaryMetaSlot: SecondaryMetaPlacement = secondaryMetaPlacement(appearance);
