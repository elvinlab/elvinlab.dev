/**
 * Everything that makes this site Elvin's, and the only settings file: identity, languages,
 * features, public third-party ids and legal dates. To reuse the site, replace this file and the
 * content collections; the visual style lives in code. Validated at build time: an invalid config
 * fails it, listing every problem.
 *
 * Every field is documented in docs/CONFIGURATION.md (generated from the schema in
 * src/shared/config/schema.ts, so it cannot drift). Secrets and email addresses never go here:
 * they are Cloudflare secrets (see src/shared/config/env-vars.ts), and contact goes through /contact.
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
    avatar: 'avatar.png',
    photo: 'photo.jpg',
  },
  // Calm look: smaller type and fewer home sections. Use 'full' for the original look, and `home`
  // to switch single sections on or off (see docs/CONFIGURATION.md, "Appearance and home sections").
  appearance: 'full',
  // The Projects grid stays off the home for now (the home is Lighthouse-gated and unchanged by the
  // projects release); `/projects/` and `/me` show the projects.
  home: { experiments: false },
  // What the owner is focused on: the sidebar "Now" card of the home (one to three rows, dated).
  // Bump `updatedAt` (YYYY-MM-DD) when the rows change; remove the whole block to hide the card.
  now: {
    updatedAt: '2026-10-02',
    items: [
      {
        kind: 'focus',
        text: {
          es: 'Optimizar IA y proyectos personales',
          en: 'Optimizing AI and personal projects',
        },
      },
      {
        kind: 'learning',
        text: {
          es: 'Orquestación de contenedores, redes en AWS, observabilidad y arquitectura cloud',
          en: 'Container orchestration, AWS networking, observability and cloud architecture',
        },
      },
    ],
  },
  socials: [
    { label: 'GitHub', url: 'https://github.com/elvinlab', icon: 'github' },
    { label: 'LinkedIn', url: 'https://www.linkedin.com/in/elvinlab', icon: 'linkedin' },
  ],
  features: {
    blog: true,
    comments: true,
    contact: true,
    credentials: true,
    experiments: true,
    me: true,
    changelog: true,
    readingMode: true,
    marks: true,
    subscribe: true,
    backToTop: true,
    languageHint: true,
    themeToggle: true,
    backgroundPicker: true,
  },
  // Public ids of third-party services. They ship in the HTML by design. An environment variable
  // with the same purpose overrides each one (PUBLIC_CF_ANALYTICS_TOKEN, PUBLIC_TURNSTILE_SITE_KEY).
  integrations: {
    cloudflareAnalyticsToken: '7ff2a02f466f4c1eb19b0bb6b4868ec3',
    turnstileSiteKey: '0x4AAAAAAFKtcGkx9Mt92EHt',
  },
  // "Last updated" dates of the legal pages: bump the one whose text you change (YYYY-MM-DD).
  legal: { privacyUpdated: '2026-10-06', termsUpdated: '2026-10-01' },
  // Comments (https://giscus.app): GitHub Discussions of this repo, "Announcements" category.
  giscus: {
    repo: 'elvinlab/elvinlab.dev',
    repoId: 'R_kgDOUvCLAA',
    category: 'Announcements',
    categoryId: 'DIC_kwDOUvCLAM4DG1yT',
  },
  background: { galaxy: true, cursorWaves: false },
  // Footprint button on notes (animation, per-browser cap, counter threshold): docs/CONFIGURATION.md.
  marks: { animation: 'stamp', maxPerVisitor: 50, showCountFrom: 5 },
  recruiter: {
    available: true,
    openToWork: false,
    status: {
      es: 'Actualmente en Buo · Colaboraciones y proyectos',
      en: 'Currently at Buo · Collaborations and projects',
    },
    lookingFor: {
      es: 'Colaboraciones y proyectos. Actualmente en Buo.',
      en: 'Collaborations and projects. Currently at Buo.',
    },
    cvUrl: {
      es: 'https://drive.google.com/file/d/1SZy6sPXxySHel7glTn1gBFwCUc6jytxS/view',
      en: 'https://drive.google.com/file/d/1eNpjsU4dRhvm6jLRINksr_w5ohcgVVTX/view',
    },
  },
  me: {
    timezone: 'UTC−6',
    workMode: { es: 'Remoto', en: 'Remote' },
    languages: { es: 'Español nativo · Inglés B1', en: 'Spanish native · English B1' },
    headline: {
      es: 'Ingeniero de software full-stack, con enfoque en frontend.',
      en: 'Full-stack software engineer with a frontend focus.',
    },
    pitch: {
      es: 'Desarrollo interfaces, servicios y herramientas para productos web. Trabajo con SaaS en producción y uso agentes de IA para apoyar el desarrollo, con pruebas y revisión humana.',
      en: 'I build interfaces, backend services and tools for web products. I work on production SaaS and use AI agents to support development, with testing and human review.',
    },
    intro: {
      es: 'Tres formas en las que puedo ayudar a un equipo o a un proyecto.',
      en: 'Three ways I can help a team or a project.',
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
          es: 'Agentes, routing de modelos y skills reutilizables, con revisión humana explícita.',
          en: 'Agents, model routing and reusable skills, with explicit human review.',
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
      {
        label: { es: 'Frontend', en: 'Frontend' },
        icon: 'code',
        items: ['JavaScript', 'Vue 2', 'Vuetify 2', 'Vuex', 'Axios'],
        hint: {
          es: 'Lo que la gente ve y usa en pantalla: las interfaces de un producto.',
          en: 'What people see and use on screen: the interfaces of a product.',
        },
      },
      {
        label: { es: 'Backend y datos', en: 'Backend and data' },
        icon: 'server',
        items: ['Java 21', 'Spring Boot', 'Spring Data JPA', 'MySQL', 'SQL'],
        hint: {
          es: 'Los servicios y las bases de datos que hay detrás de un producto.',
          en: 'The services and databases behind a product.',
        },
      },
      {
        label: { es: 'Calidad y arquitectura', en: 'Quality and architecture' },
        icon: 'shield-check',
        items: ['Jest', 'Vue Test Utils', 'JUnit', 'Clean/Hexagonal', 'ADRs'],
        hint: {
          es: 'Las pruebas y las decisiones de diseño que mantienen el código fiable y fácil de cambiar.',
          en: 'The tests and design decisions that keep code reliable and easy to change.',
        },
      },
      {
        label: { es: 'Cloud y entrega', en: 'Cloud and delivery' },
        icon: 'cloud',
        items: ['AWS', 'Docker', 'GitHub Actions', 'CI/CD'],
        hint: {
          es: 'Dónde corre el software y cómo llega a producción de forma automática.',
          en: 'Where software runs and how it reaches production automatically.',
        },
      },
      {
        label: { es: 'IA', en: 'AI' },
        icon: 'bot',
        items: ['LLM APIs', 'Claude Code', 'OpenCode'],
        hint: {
          es: 'Modelos y agentes de IA que uso para apoyar el desarrollo.',
          en: 'AI models and agents I use to support development.',
        },
      },
      {
        label: { es: 'Proyectos personales', en: 'Personal projects' },
        icon: 'flask',
        items: ['TypeScript', 'Astro', 'React', 'Tailwind CSS', 'Cloudflare Workers'],
        hint: {
          es: 'Las herramientas con las que construyo mis propios proyectos, como este sitio.',
          en: 'The tools I use to build my own projects, such as this site.',
        },
      },
    ],
  },
};
