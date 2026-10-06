/**
 * Privacy page content: long-form, locale-specific, typed.
 * This is NOT the UI dictionary; long text lives here, not in shared/i18n.
 * Owner, domain and contact paths come from the caller (site config) so the page stays white-label.
 */
import type { Locale } from '@/shared/i18n/index.ts';
import { externalAnchorHtml } from '@/shared/lib/external-anchor.ts';

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
  /** Paths of the contact page; omit when `features.contact` is off (no link, no contact form section). */
  contact?: { es: string; en: string };
  /** "Last updated" date (YYYY-MM-DD), from `legal` in the site config. */
  updated: string;
  /** Present only when giscus comments are configured; the section is omitted otherwise. */
  comments?: { repo: string };
  /** True when the reading mode feature is on, which stores one more preference in the browser. */
  readingMode?: boolean;
  /** True when the footprint button is on: adds the marks section and one more local storage note. */
  marks?: boolean;
  /** True when the email subscription is on: adds the subscribe section. */
  subscribe?: boolean;
};

const CLOUDFLARE_FAQ = 'https://developers.cloudflare.com/web-analytics/faq/';
const CLOUDFLARE_DATA = 'https://developers.cloudflare.com/web-analytics/data-metrics/';
const CLOUDFLARE_COLLECTION =
  'https://developers.cloudflare.com/web-analytics/data-metrics/data-origin-and-collection/';
const TURNSTILE_PRIVACY = 'https://www.cloudflare.com/turnstile-privacy-policy/';
const GISCUS_PRIVACY = 'https://github.com/giscus/giscus/blob/main/PRIVACY-POLICY.md';
const GITHUB_PRIVACY =
  'https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement';

const commentsSection = (repo: string): Record<'es' | 'en', PrivacySection> => {
  const discussions = (locale: Locale) =>
    externalAnchorHtml(locale, `https://github.com/${repo}/discussions`, 'GitHub Discussions');
  const giscus = (locale: Locale) => externalAnchorHtml(locale, 'https://giscus.app', 'giscus');
  return {
    es: {
      id: 'comments',
      title: 'Comentarios (giscus)',
      body: `<p>Los comentarios y reacciones de las notas los provee ${giscus('es')}: al llegar a esa sección, tu navegador se conecta a giscus.app para cargarla. Se guardan como ${discussions('es')} del repositorio público, por lo que son visibles para cualquiera.</p><p>Para comentar o reaccionar debes autorizar la aplicación giscus con el flujo OAuth de GitHub. Según su ${externalAnchorHtml('es', GISCUS_PRIVACY, 'política de privacidad')}, giscus guarda en el <code>localStorage</code> de tu navegador un token cifrado por su servidor para mantener tu sesión, y no recoge datos por su cuenta. El tratamiento por parte de GitHub se rige por su ${externalAnchorHtml('es', GITHUB_PRIVACY, 'declaración de privacidad')}.</p>`,
    },
    en: {
      id: 'comments',
      title: 'Comments (giscus)',
      body: `<p>Comments and reactions on notes are provided by ${giscus('en')}: when you scroll to that section, your browser connects to giscus.app to load it. They are stored as ${discussions('en')} in the public repository, so anyone can see them.</p><p>To comment or react you must authorize the giscus app through GitHub's OAuth flow. According to its ${externalAnchorHtml('en', GISCUS_PRIVACY, 'privacy policy')}, giscus keeps a server-encrypted token in your browser's <code>localStorage</code> to keep you signed in, and does not collect data on its own. GitHub's handling is covered by its ${externalAnchorHtml('en', GITHUB_PRIVACY, 'privacy statement')}.</p>`,
    },
  };
};

const marksSection: Record<'es' | 'en', PrivacySection> = {
  es: {
    id: 'marks',
    title: 'Huellas en las notas',
    body: '<p>Cada nota y la página de inicio tienen un botón para dejar una huella (un «estuve aquí» anónimo). Al pulsarlo, tu navegador envía a este sitio el identificador de la nota (o de la página de inicio) y cuántas huellas dejaste. Ese número se suma a un contador por nota y por página guardado en una base de datos <strong>D1</strong> de Cloudflare, el mismo proveedor que aloja el sitio. El contador no guarda quién lo sumó: no se guarda tu dirección IP ni ningún otro dato tuyo.</p><p>Para frenar el abuso, este sitio usa el limitador de peticiones de Cloudflare, que cuenta las peticiones por dirección IP en el momento de cada petición; la IP se usa solo para ese límite y este sitio no la almacena.</p><p>En tu navegador se guarda, en <code>localStorage</code> y con la clave <code>marks:&lt;nota&gt;</code>, cuántas huellas dejaste en cada nota y en la página de inicio; sirve para respetar el tope por persona y no se envía como identificador.</p>',
  },
  en: {
    id: 'marks',
    title: 'Footprints on notes',
    body: '<p>Each note and the home page have a button to leave a footprint (an anonymous “I was here”). When you press it, your browser sends this site the note identifier (or the home page one) and how many footprints you left. That number is added to a per-note and per-page counter kept in a Cloudflare <strong>D1</strong> database, the same provider that hosts the site. The counter does not record who added to it: your IP address and any other personal data are not stored.</p><p>To limit abuse, this site uses Cloudflare’s request rate limiter, which counts requests per IP address at the time of each request; the IP address is used only for that limit and this site does not store it.</p><p>Your browser keeps, in <code>localStorage</code> under the key <code>marks:&lt;note&gt;</code>, how many footprints you left on each note and on the home page; it is used to respect the per-person cap and is not sent as an identifier.</p>',
  },
};

type ContactPaths = { es: string; en: string } | undefined;

/** Where to reach the owner: the contact page when it exists, the published channels otherwise. */
const reach = (contact: ContactPaths, locale: 'es' | 'en', preposition: string): string => {
  if (contact) {
    return locale === 'es'
      ? `${preposition} la página de <a href="${contact.es}">contacto</a>`
      : `${preposition} the <a href="${contact.en}">contact</a> page`;
  }
  return locale === 'es'
    ? `${preposition} los canales publicados en este sitio`
    : `${preposition} the channels published on this site`;
};

const subscribeSection = (contact: ContactPaths): Record<'es' | 'en', PrivacySection> => ({
  es: {
    id: 'subscribe',
    title: 'Suscripción por correo',
    body: `<p>Si te suscribes, guardo tu correo para enviarte las notas nuevas y, de vez en cuando, un aviso de algún proyecto mío. Nada más: nunca lo comparto ni lo vendo.</p><p><strong>Qué guardo.</strong> Tu correo, el idioma de la página donde te suscribiste, si confirmaste o te diste de baja, y las fechas de esos pasos. También guardo qué notas ya te envié, solo para no mandarte la misma dos veces. Mientras no confirmes, lo guardo con una huella del enlace de confirmación, y lo borro a los 7 días.</p><p><strong>Cómo funciona.</strong> Te escribo primero para que confirmes: así nadie puede apuntar tu correo sin que lo sepas. Cada correo trae un enlace para darte de baja con un clic, sin cuenta y sin preguntas.</p><p><strong>Quién interviene.</strong> Cloudflare guarda la lista y Resend entrega los correos, ambos solo como apoyo técnico. Turnstile comprueba que eres una persona; no guardo tu IP.</p><p><strong>Si te das de baja</strong> dejo tu correo marcado como “dado de baja” para no volver a escribirte por error. Si prefieres que lo borre por completo, pídelo ${reach(contact, 'es', 'desde')} y lo elimino.</p>`,
  },
  en: {
    id: 'subscribe',
    title: 'Email subscription',
    body: `<p>If you subscribe, I keep your email to send you new notes and, now and then, a heads-up about one of my projects. Nothing else: I never share or sell it.</p><p><strong>What I keep.</strong> Your email, the language of the page where you signed up, whether you confirmed or unsubscribed, and the dates of those steps. I also keep which notes I already sent you, only so I never send you the same one twice. Until you confirm, it is stored with a fingerprint of the confirmation link, and I delete it after 7 days.</p><p><strong>How it works.</strong> I write to you first so you can confirm: this way nobody can sign your address up without you knowing. Every email carries a one-click unsubscribe link, with no account and no questions.</p><p><strong>Who is involved.</strong> Cloudflare stores the list and Resend delivers the emails, both only as technical support. Turnstile checks that you are a person; I do not store your IP.</p><p><strong>If you unsubscribe,</strong> I keep your address marked as “unsubscribed” so I never email you by mistake. If you would rather have it deleted completely, ask ${reach(contact, 'en', 'through')} and I will remove it.</p>`,
  },
});

export function buildPrivacyContent(input: PrivacyInput): Record<'es' | 'en', PrivacyContent> {
  const content = buildBaseContent(input);
  const comments = input.comments ? commentsSection(input.comments.repo) : null;
  const extra = (locale: 'es' | 'en'): PrivacySection[] => [
    ...(comments ? [comments[locale]] : []),
    ...(input.marks ? [marksSection[locale]] : []),
    ...(input.subscribe ? [subscribeSection(input.contact)[locale]] : []),
  ];
  const withSections = (locale: 'es' | 'en'): PrivacyContent => {
    // Without a contact page there is no contact form to disclose; the extra sections then follow
    // the analytics one.
    const sections = content[locale].sections.filter(
      (item) => input.contact !== undefined || item.id !== 'contact-form',
    );
    const at =
      sections.findIndex((item) => item.id === (input.contact ? 'contact-form' : 'analytics')) + 1;
    return {
      ...content[locale],
      sections: [...sections.slice(0, at), ...extra(locale), ...sections.slice(at)],
    };
  };
  return { es: withSections('es'), en: withSections('en') };
}

function buildBaseContent({
  owner,
  domain,
  contact,
  updated,
  readingMode = false,
  marks = false,
}: PrivacyInput): Record<'es' | 'en', PrivacyContent> {
  return {
    es: {
      pageTitle: 'Privacidad',
      pageDescription: `Cómo se tratan tus datos en ${domain}: analítica, formulario de contacto, alojamiento, almacenamiento local y tus derechos.`,
      lastUpdatedLabel: 'Última actualización',
      lastUpdated: updated,
      sections: [
        {
          id: 'controller',
          title: 'Responsable y contacto',
          body: `<p>El responsable del tratamiento es ${owner}. Puedes ejercer tus derechos y escribir ${reach(contact, 'es', 'a través de')}.</p>`,
        },
        {
          id: 'analytics',
          title: 'Cloudflare Web Analytics',
          body: `<p>Este sitio puede usar ${externalAnchorHtml('es', 'https://www.cloudflare.com/web-analytics/', 'Cloudflare Web Analytics')} para medir el tráfico de forma agregada: vistas de página, tiempos de carga y Core Web Vitals. Los parámetros de consulta (query strings) no se registran ${externalAnchorHtml('es', CLOUDFLARE_FAQ, '[fuente]')}. El detalle de los datos que Cloudflare recoge está en su ${externalAnchorHtml('es', CLOUDFLARE_DATA, 'documentación')}. Cloudflare indica que no rastrea a usuarios individuales entre las propiedades de sus clientes ${externalAnchorHtml('es', CLOUDFLARE_COLLECTION, '[fuente]')}. El tratamiento se basa en el interés legítimo de entender el uso del sitio.</p>`,
        },
        {
          id: 'contact-form',
          title: 'Formulario de contacto',
          body: `<p>Al enviar el formulario se transmiten tu nombre, tu correo electrónico, el mensaje y la hora de envío. El único propósito es poder responderte. Intervienen estos proveedores:</p><ul><li><strong>Resend</strong>: entrega del correo de notificación.</li><li><strong>Cloudflare Turnstile</strong>: verificación anti-bot (${externalAnchorHtml('es', TURNSTILE_PRIVACY, 'política de privacidad')}).</li><li>Limitador de tasa de Cloudflare, que usa la IP del visitante para prevenir abusos.</li></ul><p>Los mensajes se conservan solo el tiempo necesario para responderlos; no se definen plazos fijos.</p>`,
        },
        {
          id: 'hosting-logs',
          title: 'Alojamiento y registros',
          body: '<p>El sitio se ejecuta en <strong>Cloudflare Workers</strong> con registro de peticiones habilitado para observabilidad (latencia, errores y códigos de estado).</p>',
        },
        {
          id: 'local-storage',
          title: 'Almacenamiento local',
          body: `<p>Este sitio solo guarda en <code>localStorage</code> ${readingMode ? 'cinco' : 'cuatro'} preferencias de interfaz: el tema, el efecto de fondo que elijas, si el banner está expandido, ${readingMode ? 'el descarte del aviso de idioma y si activaste el modo lectura' : 'y el descarte del aviso de idioma'}. No se usan para identificarte ni para seguimiento.${marks ? ' Si dejas huellas en una nota, también se guarda en <code>localStorage</code> cuántas dejaste en esa nota (<code>marks:&lt;nota&gt;</code>), solo para respetar el tope por persona.' : ''}</p>`,
        },
        {
          id: 'cookies',
          title: 'Cookies',
          body: '<p>El código de este sitio no establece cookies propias. Los servicios de terceros que se cargan en algunas páginas (los de las secciones de analítica, formulario de contacto y comentarios) tienen sus propias políticas, enlazadas arriba, y son ellas las que determinan si usan cookies u otro almacenamiento.</p>',
        },
        {
          id: 'rights',
          title: 'Tus derechos',
          body: `<p>Puedes ejercer los derechos de <strong>acceso, rectificación, supresión y oposición</strong> ${reach(contact, 'es', 'a través de')}. Se responderá en los plazos que marque la normativa aplicable.</p>`,
        },
      ],
    },
    en: {
      pageTitle: 'Privacy',
      pageDescription: `How your data is handled on ${domain}: analytics, contact form, hosting, local storage, and your rights.`,
      lastUpdatedLabel: 'Last updated',
      lastUpdated: updated,
      sections: [
        {
          id: 'controller',
          title: 'Controller and contact',
          body: `<p>The data controller is ${owner}. You can exercise your rights and get in touch ${reach(contact, 'en', 'through')}.</p>`,
        },
        {
          id: 'analytics',
          title: 'Cloudflare Web Analytics',
          body: `<p>This site may use ${externalAnchorHtml('en', 'https://www.cloudflare.com/web-analytics/', 'Cloudflare Web Analytics')} to measure traffic in aggregate: page views, load times and Core Web Vitals. Query strings are not logged ${externalAnchorHtml('en', CLOUDFLARE_FAQ, '[source]')}. The details of the data Cloudflare collects are in its ${externalAnchorHtml('en', CLOUDFLARE_DATA, 'documentation')}. Cloudflare states that it does not track individual end users across its customers' Internet properties ${externalAnchorHtml('en', CLOUDFLARE_COLLECTION, '[source]')}. Processing relies on the legitimate interest of understanding site usage.</p>`,
        },
        {
          id: 'contact-form',
          title: 'Contact form',
          body: `<p>Submitting the form sends your name, email address, message and submission time. The only purpose is to be able to reply to you. These providers are involved:</p><ul><li><strong>Resend</strong>: delivery of the notification email.</li><li><strong>Cloudflare Turnstile</strong>: bot check (${externalAnchorHtml('en', TURNSTILE_PRIVACY, 'privacy policy')}).</li><li>Cloudflare rate limiter, which uses the visitor IP to prevent abuse.</li></ul><p>Messages are kept only as long as needed to answer them; no fixed retention periods are defined.</p>`,
        },
        {
          id: 'hosting-logs',
          title: 'Hosting and logs',
          body: '<p>The site runs on <strong>Cloudflare Workers</strong> with request logging enabled for observability (latency, errors and status codes).</p>',
        },
        {
          id: 'local-storage',
          title: 'Local storage',
          body: `<p>This site only keeps ${readingMode ? 'five' : 'four'} interface preferences in <code>localStorage</code>: the theme, the background effect you pick, whether the banner is expanded, ${readingMode ? 'the language hint dismissal, and whether you turned on reading mode' : 'and the language hint dismissal'}. They are not used to identify you or for tracking.${marks ? ' If you leave footprints on a note, <code>localStorage</code> also keeps how many you left on that note (<code>marks:&lt;note&gt;</code>), only to respect the per-person cap.' : ''}</p>`,
        },
        {
          id: 'cookies',
          title: 'Cookies',
          body: "<p>This site's own code does not set cookies. The third-party services loaded on some pages (those in the analytics, contact form and comments sections) have their own policies, linked above, and those policies determine whether they use cookies or other storage.</p>",
        },
        {
          id: 'rights',
          title: 'Your rights',
          body: `<p>You can exercise your rights of <strong>access, rectification, erasure and objection</strong> ${reach(contact, 'en', 'through')}. Requests are answered within the timeframes required by applicable law.</p>`,
        },
      ],
    },
  };
}
