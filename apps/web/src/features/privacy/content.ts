/**
 * Privacy page content: long-form, locale-specific, typed.
 * This is NOT the UI dictionary; long text lives here, not in shared/i18n.
 * Owner, domain and contact paths come from the caller (site config) so the page stays white-label.
 */

export type PrivacySection = {
  id: string;
  title: string;
  body: string;
};

export type PrivacyContent = {
  pageTitle: string;
  pageDescription: string;
  lastUpdatedLabel: string;
  lastUpdated: string;
  sections: PrivacySection[];
};

export type PrivacyInput = {
  owner: string;
  domain: string;
  contact: { es: string; en: string };
  /** Present only when giscus comments are configured; the section is omitted otherwise. */
  comments?: { repo: string };
};

const LAST_UPDATED = '2026-10-01';

const CLOUDFLARE_FAQ = 'https://developers.cloudflare.com/web-analytics/faq/';
const CLOUDFLARE_DATA = 'https://developers.cloudflare.com/web-analytics/data-metrics/';
const TURNSTILE_PRIVACY = 'https://www.cloudflare.com/turnstile-privacy-policy/';
const GISCUS_PRIVACY = 'https://github.com/giscus/giscus/blob/main/PRIVACY-POLICY.md';
const GITHUB_PRIVACY =
  'https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement';

const external = (href: string, label: string): string =>
  `<a href="${href}" target="_blank" rel="noopener">${label}</a>`;

const commentsSection = (repo: string): Record<'es' | 'en', PrivacySection> => {
  const discussions = external(`https://github.com/${repo}/discussions`, 'GitHub Discussions');
  const giscus = external('https://giscus.app', 'giscus');
  return {
    es: {
      id: 'comments',
      title: 'Comentarios (giscus)',
      body: `<p>Los comentarios y reacciones de las notas los provee ${giscus}: al llegar a esa sección, tu navegador se conecta a giscus.app para cargarla. Se guardan como ${discussions} del repositorio público, por lo que son visibles para cualquiera.</p><p>Para comentar o reaccionar debes autorizar la aplicación giscus con el flujo OAuth de GitHub. Según su ${external(GISCUS_PRIVACY, 'política de privacidad')}, giscus guarda en el <code>localStorage</code> de tu navegador un token cifrado por su servidor para mantener tu sesión, y no recoge datos por su cuenta. El tratamiento por parte de GitHub se rige por su ${external(GITHUB_PRIVACY, 'declaración de privacidad')}.</p>`,
    },
    en: {
      id: 'comments',
      title: 'Comments (giscus)',
      body: `<p>Comments and reactions on notes are provided by ${giscus}: when you scroll to that section, your browser connects to giscus.app to load it. They are stored as ${discussions} in the public repository, so anyone can see them.</p><p>To comment or react you must authorize the giscus app through GitHub's OAuth flow. According to its ${external(GISCUS_PRIVACY, 'privacy policy')}, giscus keeps a server-encrypted token in your browser's <code>localStorage</code> to keep you signed in, and does not collect data on its own. GitHub's handling is covered by its ${external(GITHUB_PRIVACY, 'privacy statement')}.</p>`,
    },
  };
};

export function buildPrivacyContent(input: PrivacyInput): Record<'es' | 'en', PrivacyContent> {
  const content = buildBaseContent(input);
  if (!input.comments) return content;
  const section = commentsSection(input.comments.repo);
  const withSection = (locale: 'es' | 'en'): PrivacyContent => {
    const { sections } = content[locale];
    const at = sections.findIndex((item) => item.id === 'contact-form') + 1;
    return {
      ...content[locale],
      sections: [...sections.slice(0, at), section[locale], ...sections.slice(at)],
    };
  };
  return { es: withSection('es'), en: withSection('en') };
}

function buildBaseContent({
  owner,
  domain,
  contact,
}: PrivacyInput): Record<'es' | 'en', PrivacyContent> {
  return {
    es: {
      pageTitle: 'Privacidad',
      pageDescription: `Cómo se tratan tus datos en ${domain}: analítica, formulario de contacto, alojamiento, almacenamiento local y tus derechos.`,
      lastUpdatedLabel: 'Última actualización',
      lastUpdated: LAST_UPDATED,
      sections: [
        {
          id: 'controller',
          title: 'Responsable y contacto',
          body: `<p>El responsable del tratamiento es ${owner}. Puedes ejercer tus derechos y escribir a través de la página de <a href="${contact.es}">contacto</a>.</p>`,
        },
        {
          id: 'analytics',
          title: 'Cloudflare Web Analytics',
          body: `<p>Este sitio puede usar ${external('https://www.cloudflare.com/web-analytics/', 'Cloudflare Web Analytics')} para medir el tráfico de forma agregada: vistas de página, tiempos de carga y Core Web Vitals. Los parámetros de consulta (query strings) no se registran ${external(CLOUDFLARE_FAQ, '[fuente]')}. El detalle de los datos que Cloudflare recoge está en su ${external(CLOUDFLARE_DATA, 'documentación')}. El tratamiento se basa en el interés legítimo de entender el uso del sitio.</p>`,
        },
        {
          id: 'contact-form',
          title: 'Formulario de contacto',
          body: `<p>Al enviar el formulario se transmiten tu nombre, tu correo electrónico, el mensaje y la hora de envío. El único propósito es poder responderte. Intervienen estos proveedores:</p><ul><li><strong>Resend</strong>: entrega del correo de notificación.</li><li><strong>Cloudflare Turnstile</strong>: verificación anti-bot (${external(TURNSTILE_PRIVACY, 'política de privacidad')}).</li><li>Limitador de tasa de Cloudflare, que usa la IP del visitante para prevenir abusos.</li></ul><p>Los mensajes se conservan solo el tiempo necesario para responderlos; no se definen plazos fijos.</p>`,
        },
        {
          id: 'hosting-logs',
          title: 'Alojamiento y registros',
          body: '<p>El sitio se ejecuta en <strong>Cloudflare Workers</strong> con registro de peticiones habilitado para observabilidad (latencia, errores y códigos de estado).</p>',
        },
        {
          id: 'local-storage',
          title: 'Almacenamiento local',
          body: '<p>Este sitio solo guarda en <code>localStorage</code> cuatro preferencias de interfaz: el tema, el efecto de fondo que elijas, si el banner está expandido y el descarte del aviso de idioma. No se usan para identificarte ni para seguimiento.</p>',
        },
        {
          id: 'rights',
          title: 'Tus derechos',
          body: `<p>Puedes ejercer los derechos de <strong>acceso, rectificación, supresión y oposición</strong> a través de la página de <a href="${contact.es}">contacto</a>. Se responderá en los plazos que marque la normativa aplicable.</p>`,
        },
      ],
    },
    en: {
      pageTitle: 'Privacy',
      pageDescription: `How your data is handled on ${domain}: analytics, contact form, hosting, local storage, and your rights.`,
      lastUpdatedLabel: 'Last updated',
      lastUpdated: LAST_UPDATED,
      sections: [
        {
          id: 'controller',
          title: 'Controller and contact',
          body: `<p>The data controller is ${owner}. You can exercise your rights and get in touch through the <a href="${contact.en}">contact</a> page.</p>`,
        },
        {
          id: 'analytics',
          title: 'Cloudflare Web Analytics',
          body: `<p>This site may use ${external('https://www.cloudflare.com/web-analytics/', 'Cloudflare Web Analytics')} to measure traffic in aggregate: page views, load times and Core Web Vitals. Query strings are not logged ${external(CLOUDFLARE_FAQ, '[source]')}. The details of the data Cloudflare collects are in its ${external(CLOUDFLARE_DATA, 'documentation')}. Processing relies on the legitimate interest of understanding site usage.</p>`,
        },
        {
          id: 'contact-form',
          title: 'Contact form',
          body: `<p>Submitting the form sends your name, email address, message and submission time. The only purpose is to be able to reply to you. These providers are involved:</p><ul><li><strong>Resend</strong>: delivery of the notification email.</li><li><strong>Cloudflare Turnstile</strong>: bot check (${external(TURNSTILE_PRIVACY, 'privacy policy')}).</li><li>Cloudflare rate limiter, which uses the visitor IP to prevent abuse.</li></ul><p>Messages are kept only as long as needed to answer them; no fixed retention periods are defined.</p>`,
        },
        {
          id: 'hosting-logs',
          title: 'Hosting and logs',
          body: '<p>The site runs on <strong>Cloudflare Workers</strong> with request logging enabled for observability (latency, errors and status codes).</p>',
        },
        {
          id: 'local-storage',
          title: 'Local storage',
          body: '<p>This site only keeps four interface preferences in <code>localStorage</code>: the theme, the background effect you pick, whether the banner is expanded, and the language hint dismissal. They are not used to identify you or for tracking.</p>',
        },
        {
          id: 'rights',
          title: 'Your rights',
          body: `<p>You can exercise your rights of <strong>access, rectification, erasure and objection</strong> through the <a href="${contact.en}">contact</a> page. Requests are answered within the timeframes required by applicable law.</p>`,
        },
      ],
    },
  };
}
