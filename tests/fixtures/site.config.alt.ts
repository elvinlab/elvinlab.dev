/** Alternative-identity config for the white-label build check: swaps every owner string. */
export const siteConfig = {
  url: 'https://janedoe.dev',
  title: 'janedoe.dev',
  description: { es: 'Portafolio de Jane Doe.', en: "Jane Doe's portfolio." },
  locales: { default: 'es', supported: ['es', 'en'] },
  identity: {
    name: 'Jane Doe',
    handle: 'janedoe',
    role: { es: 'Ingeniera full-stack.', en: 'Full-stack engineer.' },
    bio: { es: 'Ingeniera de software.', en: 'Software engineer.' },
    location: 'Lisboa',
    startedYear: 2019,
  },
  socials: [{ label: 'GitHub', url: 'https://github.com/janedoe', icon: 'github' }],
  features: { blog: true, comments: true, contact: true, credentials: true, experiments: true },
  background: { galaxy: true, cursorWaves: false },
  recruiter: {
    available: true,
    status: { es: 'Disponible', en: 'Available' },
    lookingFor: { es: 'Full-stack', en: 'Full-stack' },
  },
};
