/**
 * Everything that makes this site Elvin's. To reuse the site, replace this file and the content
 * collections; the visual style lives in code. Validated at build time: an invalid config fails it.
 * Never put an email address here: contact goes through /contact.
 */
export const siteConfig = {
  url: 'https://elvinlab.dev',
  title: 'elvinlab.dev',
  description: {
    es: 'Portafolio y Lab Notes de Elvin González: decisiones de ingeniería full-stack y agentes de IA, documentadas.',
    en: "Elvin González's portfolio and Lab Notes: full-stack engineering and AI agent decisions, documented.",
  },
  locales: { default: 'es', supported: ['es', 'en'] },
  identity: {
    name: 'Elvin González',
    handle: 'elvinlab',
    role: {
      es: 'Full-stack engineer building with AI agents.',
      en: 'Full-stack engineer building with AI agents.',
    },
    bio: {
      es: 'Ingeniero full-stack que construye con agentes de IA.',
      en: 'Full-stack engineer building with AI agents.',
    },
    location: 'Costa Rica',
    startedYear: 2020,
  },
  socials: [
    { label: 'GitHub', url: 'https://github.com/elvinlab', icon: 'github' },
    { label: 'LinkedIn', url: 'https://www.linkedin.com/in/elvinlab', icon: 'linkedin' },
  ],
  features: { blog: true, comments: true, contact: true, credentials: true, experiments: true },
  background: 'galaxy',
  recruiter: {
    available: true,
    status: { es: 'Abierto a oportunidades', en: 'Open to opportunities' },
    lookingFor: { es: 'Full-stack senior · Agentes de IA', en: 'Senior full-stack · AI agents' },
  },
};
