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
    experiments: false,
    me: true,
    changelog: true,
    readingMode: true,
    marks: true,
  },
  // Public ids of third-party services. They ship in the HTML by design. An environment variable
  // with the same purpose overrides each one (PUBLIC_CF_ANALYTICS_TOKEN, PUBLIC_TURNSTILE_SITE_KEY).
  integrations: {
    cloudflareAnalyticsToken: '7ff2a02f466f4c1eb19b0bb6b4868ec3',
    turnstileSiteKey: '0x4AAAAAAFKtcGkx9Mt92EHt',
  },
  // "Last updated" dates of the legal pages: bump the one whose text you change (YYYY-MM-DD).
  legal: { privacyUpdated: '2026-10-05', termsUpdated: '2026-10-01' },
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
    status: { es: 'Trabajando en Buo · Abierto a charlar', en: 'Working at Buo · Open to chat' },
    lookingFor: { es: 'Actualmente en Buo', en: 'Currently at Buo' },
    cvUrl: {
      es: 'https://drive.google.com/file/d/1SZy6sPXxySHel7glTn1gBFwCUc6jytxS/view',
      en: 'https://drive.google.com/file/d/1eNpjsU4dRhvm6jLRINksr_w5ohcgVVTX/view',
    },
  },
  me: {
    timezone: 'UTC−6',
    workMode: { es: 'Remoto', en: 'Remote' },
    intro: {
      es: 'Ingeniero de software full-stack de Costa Rica, construyendo software desde 2020, con enfoque en frontend y experiencia en SaaS en producción. Conecto necesidades de producto con arquitectura mantenible, servicios backend e interfaces accesibles, e integro la IA en productos y procesos de ingeniería con validación explícita y revisión humana.',
      en: 'Full-stack software engineer from Costa Rica, building software since 2020, with a frontend focus and production SaaS experience. I connect product requirements with maintainable architecture, backend services and accessible interfaces, and integrate AI into products and engineering workflows with explicit validation and human review.',
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
        value: { es: 'ES · EN', en: 'ES · EN' },
        label: { es: 'español nativo, inglés B1', en: 'Spanish native, English B1' },
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
        items: ['JavaScript', 'Vue 2', 'Vuetify 2', 'Vuex', 'Axios'],
      },
      {
        label: { es: 'Backend y datos', en: 'Backend and data' },
        items: ['Java 21', 'Spring Boot', 'Spring Data JPA', 'MySQL', 'SQL'],
      },
      {
        label: { es: 'Calidad y arquitectura', en: 'Quality and architecture' },
        items: ['Jest', 'Vue Test Utils', 'JUnit', 'Clean/Hexagonal', 'ADRs'],
      },
      {
        label: { es: 'Cloud y entrega', en: 'Cloud and delivery' },
        items: ['AWS', 'Docker', 'GitHub Actions', 'CI/CD'],
      },
      { label: { es: 'IA', en: 'AI' }, items: ['LLM APIs', 'Claude Code', 'OpenCode'] },
      {
        label: { es: 'Proyectos personales', en: 'Personal projects' },
        items: ['TypeScript', 'Astro', 'React', 'Tailwind CSS', 'Cloudflare Workers'],
      },
    ],
  },
};
