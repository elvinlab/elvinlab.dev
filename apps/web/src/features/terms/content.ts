/**
 * Terms of use: long-form, locale-specific, typed (like the privacy content, not the UI dictionary).
 * Owner, domain and page paths come from the caller so the page stays white-label. It states only
 * what is true of this site; it makes no legal-compliance claim and is not legal advice.
 */

export type TermsSection = { id: string; title: string; body: string };

export type TermsContent = {
  pageTitle: string;
  pageDescription: string;
  lastUpdatedLabel: string;
  lastUpdated: string;
  sections: TermsSection[];
};

export type TermsInput = {
  owner: string;
  domain: string;
  contact: { es: string; en: string };
  /** "Last updated" date (YYYY-MM-DD), from `legal` in the site config. */
  updated: string;
  privacy: { es: string; en: string };
  /** True when giscus comments are configured. */
  comments?: boolean;
  /** True when the `/me` page (professional information) is on. */
  me?: boolean;
};

const CC_ES = 'https://creativecommons.org/licenses/by-nc-sa/4.0/deed.es';
const CC_EN = 'https://creativecommons.org/licenses/by-nc-sa/4.0/';
const GITHUB_TERMS = 'https://docs.github.com/en/site-policy/github-terms/github-terms-of-service';

const external = (href: string, label: string): string =>
  `<a href="${href}" target="_blank" rel="noopener">${label}</a>`;

export function buildTermsContent({
  owner,
  domain,
  contact,
  updated,
  privacy,
  comments = false,
  me = false,
}: TermsInput): Record<'es' | 'en', TermsContent> {
  return {
    es: {
      pageTitle: 'Términos de uso',
      pageDescription: `Condiciones de uso de ${domain}: contenido y licencias, comentarios, enlaces y responsabilidad.`,
      lastUpdatedLabel: 'Última actualización',
      lastUpdated: updated,
      sections: [
        {
          id: 'owner',
          title: 'Quién publica este sitio',
          body: `<p>${domain} lo publica ${owner}. Para cualquier consulta sobre estos términos o sobre el contenido, escribe desde la página de <a href="${contact.es}">contacto</a>.</p>`,
        },
        {
          id: 'content',
          title: 'Contenido y licencias',
          body: `<p>Las notas se publican bajo la licencia ${external(CC_ES, 'CC BY-NC-SA 4.0')}, que también se indica en cada nota: puedes compartirlas y adaptarlas citando la autoría, sin uso comercial y manteniendo la misma licencia.</p><p>Salvo que se indique lo contrario, el resto del contenido del sitio (diseño, imágenes y textos que no sean notas) no se ofrece para reutilización. Si quieres usarlo, escríbeme.</p>`,
        },
        {
          id: 'use',
          title: 'Uso del sitio',
          body: '<p>El sitio es un portafolio personal y un blog técnico con fines informativos. Lo publicado refleja decisiones y experiencias propias en un momento dado y puede quedar desactualizado; no constituye asesoría profesional. Se ofrece «tal cual», sin garantías de disponibilidad ni de exactitud.</p>',
        },
        ...(comments
          ? [
              {
                id: 'comments',
                title: 'Comentarios',
                body: `<p>Los comentarios de las notas los provee ${external('https://giscus.app', 'giscus')} y se publican en GitHub Discussions, por lo que además se rigen por los ${external(GITHUB_TERMS, 'términos de GitHub')}. Participa con respeto: me reservo la posibilidad de editar u ocultar comentarios que sean spam, ofensivos o ilegales.</p>`,
              },
            ]
          : []),
        {
          id: 'links',
          title: 'Enlaces externos',
          body: '<p>El sitio enlaza a páginas de terceros (como GitHub o LinkedIn). No controlo su contenido ni sus políticas y no me hago responsable de ellos.</p>',
        },
        ...(me
          ? [
              {
                id: 'professional',
                title: 'Información profesional',
                body: '<p>La información de la página de perfil (experiencia, disponibilidad y datos de contacto profesional) es informativa, puede cambiar sin aviso y no constituye una oferta ni un compromiso.</p>',
              },
            ]
          : []),
        {
          id: 'privacy',
          title: 'Privacidad',
          body: `<p>Cómo se tratan tus datos está explicado en la página de <a href="${privacy.es}">privacidad</a>.</p>`,
        },
        {
          id: 'changes',
          title: 'Cambios',
          body: '<p>Estos términos pueden actualizarse; la fecha de la última actualización aparece al final de la página.</p>',
        },
      ],
    },
    en: {
      pageTitle: 'Terms of use',
      pageDescription: `Terms of use for ${domain}: content and licenses, comments, links and liability.`,
      lastUpdatedLabel: 'Last updated',
      lastUpdated: updated,
      sections: [
        {
          id: 'owner',
          title: 'Who publishes this site',
          body: `<p>${domain} is published by ${owner}. For any question about these terms or the content, write from the <a href="${contact.en}">contact</a> page.</p>`,
        },
        {
          id: 'content',
          title: 'Content and licenses',
          body: `<p>Notes are published under the ${external(CC_EN, 'CC BY-NC-SA 4.0')} license, which is also shown on every note: you may share and adapt them giving credit, for non-commercial purposes and under the same license.</p><p>Unless stated otherwise, the rest of the site's content (design, images and text that are not notes) is not offered for reuse. If you want to use it, write to me.</p>`,
        },
        {
          id: 'use',
          title: 'Use of the site',
          body: '<p>This site is a personal portfolio and a technical blog for informational purposes. What is published reflects my own decisions and experience at a given moment and may become outdated; it is not professional advice. It is provided "as is", with no guarantee of availability or accuracy.</p>',
        },
        ...(comments
          ? [
              {
                id: 'comments',
                title: 'Comments',
                body: `<p>Comments on notes are provided by ${external('https://giscus.app', 'giscus')} and posted in GitHub Discussions, so they are also governed by the ${external(GITHUB_TERMS, 'GitHub terms')}. Please be respectful: I reserve the option to edit or hide comments that are spam, offensive or illegal.</p>`,
              },
            ]
          : []),
        {
          id: 'links',
          title: 'External links',
          body: '<p>The site links to third-party pages (such as GitHub or LinkedIn). I do not control their content or policies and I am not responsible for them.</p>',
        },
        ...(me
          ? [
              {
                id: 'professional',
                title: 'Professional information',
                body: '<p>The information on the profile page (experience, availability and professional contact details) is informational, may change without notice and is not an offer or a commitment.</p>',
              },
            ]
          : []),
        {
          id: 'privacy',
          title: 'Privacy',
          body: `<p>How your data is handled is explained on the <a href="${privacy.en}">privacy</a> page.</p>`,
        },
        {
          id: 'changes',
          title: 'Changes',
          body: '<p>These terms may be updated; the date of the last update appears at the end of the page.</p>',
        },
      ],
    },
  };
}
