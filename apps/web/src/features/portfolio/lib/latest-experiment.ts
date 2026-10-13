import { sortExperimentList } from './pagination.ts';

type Candidate = Parameters<typeof sortExperimentList>[0][number] & {
  status: 'running' | 'shipped' | 'archived';
};

/**
 * The newest experiment that is not archived, by publication date (`publishedAt`, else 1 January
 * of its `year`). It ignores `featured` and `order` on purpose: a visitor asking "what is new?"
 * wants the latest piece, not the biggest one.
 */
export function latestExperiment<T extends Candidate>(
  entries: readonly T[],
  locale: string,
): T | undefined {
  return sortExperimentList(
    entries.filter((entry) => entry.status !== 'archived'),
    'newest',
    locale,
  )[0];
}
