export { default as CertificatesByYear } from './components/CertificatesByYear.astro';
export { default as EducationRecent } from './components/EducationRecent.astro';
export { groupCredentialsByYear } from './lib/credentials.ts';
export {
  EDUCATION_DEFAULT_SORT,
  type EducationSort,
  educationDateLabel,
  educationPath,
  educationSortParam,
  groupEducationByYear,
  offeredEducationSorts,
  paginateEducation,
  recentEducationRows,
  sortEducation,
} from './lib/education.ts';
export { loadEducationPages } from './lib/education-pages.ts';
export { type Credential, credentialSchema } from './schema.ts';
