import type { ChangelogEntry } from '@/features/changelog/schema.ts';
import type { Locale } from '@/shared/i18n/index.ts';
import { listingPath } from '@/shared/lib/listing.ts';

/** Kinds in the order a release shows them (stored values stay Keep-a-Changelog). */
export const KIND_ORDER = [
  'added',
  'changed',
  'fixed',
  'removed',
  'security',
  'deprecated',
] as const satisfies readonly ChangelogEntry['category'][];

export type ChangelogKind = (typeof KIND_ORDER)[number];

export type ReleaseItem = { id: string; title: string; description?: string };
export type KindGroup = { kind: ChangelogKind; entries: ReleaseItem[] };

/** One production day. `date` is `YYYY-MM-DD`; `title` comes from `releases.json` when set. */
export type Release = {
  date: string;
  title?: string;
  total: number;
  groups: KindGroup[];
};

type SourceEntry = { id: string; data: ChangelogEntry };

/**
 * Groups entries into releases (a release is a production day, newest first) and each release into
 * kind groups in `KIND_ORDER`; kinds without entries are omitted. Inside a kind, entries sort by
 * title (ascending, then id), so the order never depends on the source order of the JSON file.
 */
export function groupReleases(
  entries: readonly SourceEntry[],
  titles: Readonly<Record<string, { title?: string | undefined }>>,
): Release[] {
  const byDay = new Map<string, SourceEntry[]>();
  for (const entry of entries) {
    const day = entry.data.date.toISOString().slice(0, 10);
    byDay.set(day, [...(byDay.get(day) ?? []), entry]);
  }
  return [...byDay.keys()]
    .sort((a, b) => b.localeCompare(a))
    .map((date): Release => {
      const dayEntries = byDay.get(date) ?? [];
      const groups = KIND_ORDER.flatMap((kind): KindGroup[] => {
        const items = dayEntries
          .filter((entry) => entry.data.category === kind)
          .sort(
            (a, b) =>
              a.data.title.localeCompare(b.data.title, 'en') || a.id.localeCompare(b.id, 'en'),
          )
          .map(
            ({ id, data }): ReleaseItem => ({
              id,
              title: data.title,
              ...(data.description !== undefined && { description: data.description }),
            }),
          );
        return items.length > 0 ? [{ kind, entries: items }] : [];
      });
      const title = titles[date]?.title;
      return { date, ...(title !== undefined && { title }), total: dayEntries.length, groups };
    });
}

/** "Oct 7, 2026" in English, "7 de octubre de 2026" in Spanish (UTC: the date is a calendar day). */
export function formatReleaseDate(date: Date, locale: Locale): string {
  return new Intl.DateTimeFormat(locale, {
    ...(locale === 'es' ? { dateStyle: 'long' as const } : { dateStyle: 'medium' as const }),
    timeZone: 'UTC',
  }).format(date);
}

/** Path of a changelog page without locale prefix: `/changelog/`, `/changelog/page/2/`. */
export function changelogHref(page: number): string {
  return listingPath({ base: 'changelog', defaultSort: 'newest', page });
}
