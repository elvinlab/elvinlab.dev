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
};

const LAST_UPDATED = '2026-09-30';

const CLOUDFLARE_FAQ = 'https://developers.cloudflare.com/web-analytics/faq/';
const CLOUDFLARE_DATA = 'https://developers.cloudflare.com/web-analytics/data-metrics/';
const TURNSTILE_PRIVACY = 'https://www.cloudflare.com/turnstile-privacy-policy/';

const external = (href: string, label: string): string =>
  `<a href="${href}" target="_blank" rel="noopener">${label}</a>`;

export function buildPrivacyContent({
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
          body: '<p>Solo se guardan en <code>localStorage</code> la preferencia de tema y el descarte del aviso de idioma. No se usan para identificarte ni para seguimiento.</p>',
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
          body: '<p>Only the theme choice and the language-hint dismissal are stored in <code>localStorage</code>. They are not used to identify you or for tracking.</p>',
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
