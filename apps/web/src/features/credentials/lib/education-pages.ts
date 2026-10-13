import { getCollection } from 'astro:content';

import { site } from '@/shared/config/index.ts';

import {
  EDUCATION_DEFAULT_SORT,
  type EducationSort,
  offeredEducationSorts,
  paginateEducation,
} from './education.ts';

/**
 * The education entries of one sort, already paged: the data every page of `/education/` renders
 * from and every `getStaticPaths` counts with. Without `sort` it is the default order (the base
 * URLs). A sort that is not offered (the list is below `education.sortFrom`, or it is the default
 * one asked for by name) fails the build instead of rendering a page that should not exist.
 */
export async function loadEducationPages(sort?: EducationSort) {
  const entries = await getCollection('credentials');
  const { perPage, sortFrom } = site.education;
  const offered = offeredEducationSorts(entries.length, sortFrom);
  const active = sort ?? EDUCATION_DEFAULT_SORT;
  if (sort !== undefined && (sort === EDUCATION_DEFAULT_SORT || !offered.includes(sort))) {
    throw new Error(`/education/ does not offer the sort "${sort}"`);
  }
  const pages = paginateEducation(entries, { perPage, sort: active });
  return { entries, pages, sort: active, defaultSort: EDUCATION_DEFAULT_SORT, offered };
}
