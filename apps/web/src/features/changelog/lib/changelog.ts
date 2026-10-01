import type { Locale } from '@/shared/i18n/index.ts';

export function sortChangelog<T extends { data: { date: Date } }>(entries: T[]): T[] {
  return [...entries].sort((a, b) => b.data.date.getTime() - a.data.date.getTime());
}

export function formatChangelogDate(date: Date, locale: Locale): string {
  return new Intl.DateTimeFormat(locale, {
    dateStyle: 'long',
    timeZone: 'UTC',
  }).format(date);
}
