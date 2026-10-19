import type { SeoPage, SiteConfig } from '@/shared/config/schema.ts';

type Copy = { title: string; description?: string };

/**
 * Built-in search and share copy per page and locale. `{name}` and `{domain}` come from the site
 * config, so a fork gets its owner's name without editing this file; `seo.pages` in the config
 * overrides any entry. A title is a short phrase (the site name is appended); a description runs
 * 110 to 160 characters. Pages without a description here (privacy, terms, subscribe) bring their
 * own, which already lives next to their text.
 */
const DEFAULTS: Record<string, Record<SeoPage, Copy>> = {
  es: {
    notes: {
      title: 'Lab Notes: decisiones de ingeniería',
      description:
        'Lab Notes de {name}: decisiones de ingeniería full-stack y con agentes de IA, con el contexto, lo que elegí y lo que medí después.',
    },
    me: {
      title: '{name}: CV y trayectoria',
      description:
        'Currículum de {name}: experiencia, formación, proyectos y notas, en español e inglés y con CV descargable.',
    },
    contact: {
      title: 'Contacto con {name}',
      description:
        '¿Una idea, una colaboración o una pregunta? Escríbeme desde este formulario y te respondo por correo: {name}, {domain}.',
    },
    education: {
      title: 'Formación y certificados de {name}',
      description:
        'Mi formación en orden cronológico: títulos, certificados y cursos, qué estudié, dónde y cuándo, y lo que me llevé de cada uno.',
    },
    experiments: {
      title: 'Experimentos y proyectos de {name}',
      description:
        'Proyectos de {name}: qué problema resuelve cada uno, qué parte hice yo, qué decisiones tomé, con qué stack y qué aprendí.',
    },
    changelog: {
      title: 'Changelog: cambios visibles del sitio',
      description:
        'Todo lo que cambia en {domain}, agrupado por día de publicación: funciones nuevas, correcciones, rendimiento y documentación.',
    },
    subscribe: { title: 'Suscríbete a Lab Notes por correo' },
    privacy: { title: 'Privacidad: qué datos trato y por qué' },
    terms: { title: 'Términos de uso y licencias' },
  },
  en: {
    notes: {
      title: 'Lab Notes: engineering decisions',
      description:
        'Lab Notes by {name}: full-stack and AI-agent engineering decisions, with the context, what I chose and what I measured afterwards.',
    },
    me: {
      title: '{name}: CV and background',
      description:
        'Résumé of {name}: experience, education, projects and notes, in Spanish and English, with a downloadable CV.',
    },
    contact: {
      title: 'Contact {name}',
      description:
        "An idea, a collaboration or a question? Write to me from this form and I'll reply by email: {name}, {domain}.",
    },
    education: {
      title: '{name}: education and certificates',
      description:
        'My education in chronological order: degrees, certificates and courses, what I studied, where and when, and what I took from each.',
    },
    experiments: {
      title: 'Experiments and projects by {name}',
      description:
        'Projects by {name}: the problem each one solves, which part I built, the decisions I made, the stack and what I learned.',
    },
    changelog: {
      title: 'Changelog: visible changes to the site',
      description:
        'Everything that changes on {domain}, grouped by release day: new features, fixes, performance and documentation.',
    },
    subscribe: { title: 'Subscribe to Lab Notes by email' },
    privacy: { title: 'Privacy: what data I handle and why' },
    terms: { title: 'Terms of use and content licenses' },
  },
};

export type PageCopyInput = {
  page: SeoPage;
  locale: string;
  defaultLocale: string;
  name: string;
  /** Host of the site (`elvinlab.dev`). */
  domain: string;
  overrides: SiteConfig['seo']['pages'];
  /** Description of a page that brings its own, used when neither the config nor the built-in copy has one. */
  fallbackDescription?: string | undefined;
};

export type PageCopy = { title: string; description: string | undefined };

const fill = (template: string, values: Record<string, string>): string =>
  template.replace(/\{(\w+)\}/g, (match, key: string) => values[key] ?? match);

/**
 * The title and description of a page: the config override first, then the built-in copy in the
 * visitor's locale, then the default locale's.
 */
export function pageCopy(input: PageCopyInput): PageCopy {
  const { page, locale, defaultLocale, name, domain, overrides, fallbackDescription } = input;
  const values = { name, domain };
  const builtIn =
    DEFAULTS[locale]?.[page] ?? DEFAULTS[defaultLocale]?.[page] ?? DEFAULTS['en']?.[page];
  const override = overrides[page];
  const title =
    override?.title?.[locale] ?? override?.title?.[defaultLocale] ?? builtIn?.title ?? name;
  const description =
    override?.description?.[locale] ??
    override?.description?.[defaultLocale] ??
    (builtIn?.description !== undefined ? fill(builtIn.description, values) : fallbackDescription);
  return { title: fill(title, values), description };
}

const CASE_TITLES: Record<string, string> = {
  es: '{title}: caso de estudio',
  en: '{title}: case study',
};

/** Title of an experiment's case page: the project name says what it is, the suffix says what the page is. */
export function caseTitle(title: string, locale: string, defaultLocale: string): string {
  return fill(CASE_TITLES[locale] ?? CASE_TITLES[defaultLocale] ?? '{title}', { title });
}
