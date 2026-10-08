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
  // experiments release); `/experiments/` and `/me` show the experiments.
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
  // The experiments list (`/experiments/`) and the rows on `/me`: docs/PORTFOLIO.md. `intro` and
  // `words` (the decorative `// build` stack by the title, per locale) are optional and fall back to
  // the interface defaults, for example: intro: { es: '...', en: '...' }, words: { es: ['construir'], en: ['build'] }.
  experiments: { perPage: 12, maxFeatured: 3, meRows: 3 },
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
      es: 'Colaboraciones y proyectos',
      en: 'Collaborations and projects',
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
      es: 'Del dato a la pantalla.',
      en: 'From data to screen.',
    },
    pitch: {
      es: 'Ingeniero full-stack: bases de datos, servicios backend, interfaces y despliegue, con IA integrada en el producto y en el flujo de desarrollo. Trabajo con SaaS en producción, con pruebas y revisión humana.',
      en: 'Full-stack engineer: databases, backend services, interfaces and delivery, with AI built into the product and the development workflow. I work on production SaaS, with testing and human review.',
    },
    intro: {
      es: 'Tres formas en las que puedo ayudar a un equipo o a un proyecto.',
      en: 'Three ways I can help a team or a project.',
    },
    facts: [
      {
        value: { es: 'Full stack', en: 'Full stack' },
        label: { es: 'datos, backend, frontend y cloud', en: 'data, backend, frontend and cloud' },
      },
      {
        value: { es: 'IA', en: 'AI' },
        label: {
          es: 'en el producto y en mi flujo de trabajo',
          en: 'in the product and in my workflow',
        },
      },
    ],
    strengths: [
      {
        icon: 'layers',
        title: { es: 'Del dato a la pantalla', en: 'From data to screen' },
        body: {
          es: 'Modelado SQL, servicios Java/Spring y pipelines ETL en producción, con límites que mantienen el código fácil de cambiar.',
          en: 'SQL modeling, Java/Spring services and ETL pipelines in production, with boundaries that keep code easy to change.',
        },
      },
      {
        icon: 'bot',
        title: { es: 'IA en producto y en el flujo', en: 'AI in product and workflow' },
        body: {
          es: 'IA integrada en un SaaS, más agentes, routing de modelos y skills reutilizables, con revisión humana explícita.',
          en: 'AI integrated into a SaaS, plus agents, model routing and reusable skills, with explicit human review.',
        },
      },
      {
        icon: 'gauge',
        title: { es: 'Rápido y medido', en: 'Fast and measured' },
        body: {
          es: 'Presupuestos de performance en el frontend y datos bien modelados por detrás. Números, no promesas.',
          en: 'Performance budgets on the frontend and well-modeled data behind it. Numbers, not promises.',
        },
      },
    ],
    stack: [
      {
        label: { es: 'Datos', en: 'Data' },
        icon: 'database',
        layer: true,
        items: ['SQL', 'MySQL', 'SQL Server', 'MongoDB', 'ETL', 'Cloudflare D1'],
        hint: {
          es: 'Cómo modelo, guardo y muevo los datos. D1 es lo que uso en este sitio mientras lo aprendo.',
          en: 'How I model, store and move data. D1 is what I use on this site while I learn it.',
        },
      },
      {
        label: { es: 'Backend', en: 'Backend' },
        icon: 'server',
        layer: true,
        items: ['Java 21', 'Spring Boot', 'Spring Data JPA', '.NET', 'Node.js', 'APIs REST'],
        hint: {
          es: 'Los servicios que hay detrás de un producto: reglas de negocio, permisos e integraciones.',
          en: 'The services behind a product: business rules, permissions and integrations.',
        },
      },
      {
        label: { es: 'Frontend', en: 'Frontend' },
        icon: 'code',
        layer: true,
        items: ['JavaScript', 'Vue 2', 'Vuetify 2', 'Vuex', 'React', 'Axios'],
        hint: {
          es: 'Lo que la gente ve y usa en pantalla: las interfaces de un producto.',
          en: 'What people see and use on screen: the interfaces of a product.',
        },
      },
      {
        label: { es: 'Cloud y entrega', en: 'Cloud and delivery' },
        icon: 'cloud',
        layer: true,
        items: ['AWS', 'Docker', 'GitHub Actions', 'CI/CD', 'Cloudflare Workers'],
        hint: {
          es: 'Dónde corre el software y cómo llega a producción de forma automática. Cloudflare Workers es lo que estoy aprendiendo en este sitio.',
          en: 'Where software runs and how it reaches production automatically. Cloudflare Workers is what I am learning on this site.',
        },
      },
      {
        label: { es: 'IA', en: 'AI' },
        icon: 'bot',
        items: ['LLM APIs', 'Claude Code', 'OpenCode'],
        hint: {
          es: 'Modelos y agentes de IA, en el producto y para apoyar el desarrollo. Cruzan todas las capas.',
          en: 'AI models and agents, in the product and to support development. They cut across every layer.',
        },
      },
      {
        label: { es: 'Calidad y arquitectura', en: 'Quality and architecture' },
        icon: 'shield-check',
        folded: true,
        items: ['Jest', 'Vue Test Utils', 'JUnit', 'Clean/Hexagonal', 'ADRs'],
        hint: {
          es: 'Las pruebas y las decisiones de diseño que mantienen el código fiable y fácil de cambiar.',
          en: 'The tests and design decisions that keep code reliable and easy to change.',
        },
      },
      {
        label: { es: 'Proyectos personales', en: 'Personal projects' },
        icon: 'flask',
        folded: true,
        items: ['TypeScript', 'Astro', 'React', 'Tailwind CSS'],
        hint: {
          es: 'Las herramientas con las que construyo mis propios proyectos, como este sitio.',
          en: 'The tools I use to build my own projects, such as this site.',
        },
      },
    ],
  },
};
