/** Display names for the technology ids used in `content/experience.json`. */
const TAG_LABELS: Readonly<Record<string, string>> = {
  angularjs: 'AngularJS',
  aws: 'AWS',
  dotnet: '.NET',
  express: 'Express',
  firebase: 'Firebase',
  java: 'Java',
  mongodb: 'MongoDB',
  mysql: 'MySQL',
  node: 'Node.js',
  react: 'React',
  reactjs: 'React',
  'spring-boot': 'Spring Boot',
  'sql-server': 'SQL Server',
  vue: 'Vue',
  vuetify: 'Vuetify',
};

/** Human-readable name of an experience tag; an unknown id is returned unchanged. */
export const tagLabel = (id: string): string => TAG_LABELS[id] ?? id;
