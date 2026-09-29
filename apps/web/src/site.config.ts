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
  background: { galaxy: true, cursorWaves: false },
  recruiter: {
    available: true,
    status: { es: 'Abierto a oportunidades', en: 'Open to opportunities' },
    lookingFor: { es: 'Full-stack senior · Agentes de IA', en: 'Senior full-stack · AI agents' },
  },
  me: {
    timezone: 'UTC−6',
    workMode: { es: 'Remoto / Híbrido', en: 'Remote / Hybrid' },
    intro: {
      es: 'Ingeniero full-stack de Costa Rica, construyendo software desde 2020. Me importan la arquitectura clara, los sistemas rápidos y usar agentes de IA como parte real de cómo trabajo.',
      en: 'Full-stack engineer from Costa Rica, building software since 2020. I care about clear architecture, fast systems and using AI agents as a real part of how I work.',
    },
    facts: [
      {
        value: { es: 'Full stack', en: 'Full stack' },
        label: { es: 'frontend, backend y cloud', en: 'frontend, backend and cloud' },
      },
      {
        value: { es: 'Agentes de IA', en: 'AI agents' },
        label: { es: 'parte de mi día a día', en: 'part of my daily workflow' },
      },
      {
        value: { es: 'EN / ES', en: 'EN / ES' },
        label: { es: 'idiomas de trabajo', en: 'working languages' },
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
      {
        icon: 'bot',
        title: { es: 'IA en el flujo', en: 'AI in the workflow' },
        body: {
          es: 'Agentes, routing de modelos y memoria en el trabajo real.',
          en: 'Agents, model routing and memory in real daily work.',
        },
      },
      {
        icon: 'gauge',
        title: { es: 'Rápido por defecto', en: 'Fast by default' },
        body: {
          es: 'Presupuestos de performance, no promesas.',
          en: 'Performance budgets instead of performance hopes.',
        },
      },
    ],
    stack: [
      { label: { es: 'Lenguajes', en: 'Languages' }, items: ['TypeScript', 'JavaScript'] },
      { label: { es: 'Frontend', en: 'Frontend' }, items: ['Astro', 'React', 'Tailwind CSS'] },
      {
        label: { es: 'Backend y cloud', en: 'Backend and cloud' },
        items: ['Node.js', 'Cloudflare'],
      },
      { label: { es: 'IA', en: 'AI' }, items: ['Agentes', 'Routing de modelos'] },
    ],
  },
};
