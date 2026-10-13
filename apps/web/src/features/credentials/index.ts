export { default as CertificatesByYear } from './components/CertificatesByYear.astro';
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
  sortEducation,
} from './lib/education.ts';
export { loadEducationPages } from './lib/education-pages.ts';
export { type Credential, credentialSchema } from './schema.ts';
