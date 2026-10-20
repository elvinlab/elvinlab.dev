/**
 * Config of the generic demo site (`pnpm demo:deploy`): a fictional author, English by default,
 * and only the features that need no secrets or database, so anyone can see the theme working.
 */
export const siteConfig = {
  url: 'https://example.com',
  title: 'Lab Notes',
  description: { es: 'Portafolio de Jane Doe.', en: "Jane Doe's portfolio." },
  locales: { default: 'en', supported: ['es', 'en'] },
  identity: {
    name: 'Jane Doe',
    handle: 'janedoe',
    role: { es: 'Ingeniera full-stack.', en: 'Full-stack engineer.' },
    bio: {
      es: 'Ingeniera full-stack. Escribo sobre las decisiones detrás del software que construyo.',
      en: 'Full-stack engineer. I write about the decisions behind the software I build.',
    },
    location: 'Lisboa',
    startedYear: 2019,
  },
  socials: [{ label: 'GitHub', url: 'https://github.com/janedoe', icon: 'github' }],
  features: {
    blog: true,
    comments: false,
    contact: false,
    credentials: true,
    education: true,
    experiments: true,
    me: true,
    changelog: true,
    readingMode: true,
    readingProgress: true,
    marks: false,
    subscribe: false,
    backToTop: true,
    languageHint: true,
    themeToggle: true,
    backgroundPicker: true,
    experimentNudge: false,
  },
  legal: { privacyUpdated: '2026-01-01', termsUpdated: '2026-01-01' },
  background: { galaxy: true, cursorWaves: false },
  recruiter: {
    available: true,
    status: { es: 'Disponible', en: 'Available' },
    lookingFor: { es: 'Full-stack', en: 'Full-stack' },
  },
  me: {
    timezone: 'UTC+0',
    workMode: { es: 'Remoto', en: 'Remote' },
    intro: {
      es: 'Ingeniera full-stack construyendo software desde 2019.',
      en: 'Full-stack engineer building software since 2019.',
    },
    facts: [
      {
        value: { es: 'Full stack', en: 'Full stack' },
        label: { es: 'frontend y backend', en: 'frontend and backend' },
      },
    ],
    strengths: [
      {
        icon: 'layers',
        title: { es: 'Arquitectura clara', en: 'Clear architecture' },
        body: {
          es: 'Límites que mantienen el código fácil de cambiar.',
          en: 'Boundaries that keep code easy to change.',
        },
      },
    ],
    stack: [{ label: { es: 'Lenguajes', en: 'Languages' }, items: ['TypeScript'] }],
  },
};
