/**
 * The two subscription emails as pure functions: HTML (table layout, inline CSS, system fonts) plus
 * a plain-text twin. No framework or provider imports; the caller passes every owner-specific value.
 * Email clients cannot load web fonts, so the page's Press Start 2P and Space Grotesk do not appear.
 */
import type { SubscribeLocale } from './ports.ts';

export type EmailSiteInput = {
  locale: SubscribeLocale;
  /** Origin of the site; the logo lives at `<siteUrl>/email/logo.png`. */
  siteUrl: string;
  siteName: string;
  ownerName: string;
  privacyUrl: string;
};

export type ConfirmationEmailInput = EmailSiteInput & { confirmUrl: string };
export type NoteEmailInput = EmailSiteInput & {
  title: string;
  summary?: string | undefined;
  noteUrl: string;
  unsubscribeUrl: string;
};
export type RenderedEmail = { subject: string; html: string; text: string };

const COLOR = {
  violet: '#7c3aed',
  pink: '#ec4899',
  page: '#eef0ff',
  card: '#ffffff',
  border: '#d4d7ee',
  text: '#1c1f33',
  muted: '#5b6075',
} as const;
const SANS = "-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";
const MONO = "'SFMono-Regular',Menlo,Consolas,'Courier New',monospace";

const COPY = {
  es: {
    confirmSubject: 'Confirma tu suscripción a Lab Notes',
    confirmPreheader: 'Un clic para confirmar tu suscripción a Lab Notes.',
    confirmTitle: 'Confirma tu suscripción',
    confirmIntro:
      'Alguien (esperamos que tú) pidió recibir por correo las notas nuevas de Lab Notes y, de vez en cuando, un aviso de algún proyecto de su autor. Para confirmarlo, pulsa el botón.',
    confirmIntroText:
      'Alguien (esperamos que tú) pidió recibir por correo las notas nuevas de Lab Notes y, de vez en cuando, un aviso de algún proyecto de su autor. Para confirmarlo, abre este enlace:',
    confirmButton: 'Confirmar suscripción',
    copyLink: 'O copia este enlace en tu navegador:',
    expiry: 'El enlace vence en 48 horas.',
    confirmFooter: (domain: string) =>
      `Recibes este correo porque alguien pidió suscribirse en ${domain}. Si no fuiste tú, ignora este mensaje: no se enviará nada más.`,
    noteSubject: (title: string) => `Nueva nota: ${title}`,
    notePreheader: 'Hay una nota nueva en Lab Notes.',
    noteButton: 'Leer la nota',
    noSpam: 'Sin spam: solo notas nuevas y avisos ocasionales de proyectos.',
    noteFooter: (domain: string) =>
      `Recibes este correo porque te suscribiste en ${domain} (notas nuevas y avisos de proyectos).`,
    unsubscribe: 'Cancelar suscripción',
    unsubscribeLead: 'Para dejar de recibirlo:',
    privacy: 'Política de privacidad',
    sentBy: 'Enviado por',
    greeting: 'Hola,',
    readIt: 'Léela aquí:',
  },
  en: {
    confirmSubject: 'Confirm your subscription to Lab Notes',
    confirmPreheader: 'One click to confirm your subscription to Lab Notes.',
    confirmTitle: 'Confirm your subscription',
    confirmIntro:
      "Someone (we hope you) asked to get new Lab Notes posts by email and, now and then, an announcement of one of the author's projects. To confirm, press the button.",
    confirmIntroText:
      "Someone (we hope you) asked to get new Lab Notes posts by email and, now and then, an announcement of one of the author's projects. To confirm, open this link:",
    confirmButton: 'Confirm subscription',
    copyLink: 'Or copy this link into your browser:',
    expiry: 'The link expires in 48 hours.',
    confirmFooter: (domain: string) =>
      `You receive this because someone asked to subscribe on ${domain}. If it was not you, ignore this message: nothing else will be sent.`,
    noteSubject: (title: string) => `New note: ${title}`,
    notePreheader: 'There is a new note on Lab Notes.',
    noteButton: 'Read the note',
    noSpam: 'No spam: only new notes and the occasional project announcement.',
    noteFooter: (domain: string) =>
      `You receive this because you subscribed on ${domain} (new notes and project announcements).`,
    unsubscribe: 'Unsubscribe',
    unsubscribeLead: 'To stop receiving it:',
    privacy: 'Privacy policy',
    sentBy: 'Sent by',
    greeting: 'Hello,',
    readIt: 'Read it here:',
  },
} satisfies Record<SubscribeLocale, unknown>;

const ESCAPES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};
const escapeHtml = (value: string): string =>
  value.replace(/[&<>"']/g, (char) => ESCAPES[char] ?? char);
const oneLine = (value: string): string => value.replace(/[\r\n]+/g, ' ').trim();
const domainOf = (siteUrl: string): string => {
  try {
    return new URL(siteUrl).hostname;
  } catch {
    return siteUrl;
  }
};
const originOf = (siteUrl: string): string => siteUrl.replace(/\/+$/, '');

const DARK_CSS = `
@media (max-width:620px){.em-wrap{padding:12px 8px !important}.em-pad{padding:24px 18px !important}}
@media (prefers-color-scheme: dark){
.em-page{background:#0b0b16 !important;background-color:#0b0b16 !important}
.em-card{background:#14142a !important;background-color:#14142a !important;border-color:#2a2a48 !important}
.em-text{color:#e6e8f5 !important}
.em-muted{color:#a3a8c3 !important}
.em-rule{border-color:#2a2a48 !important}
.em-link{color:#a78bfa !important}
}`;

type Layout = {
  locale: SubscribeLocale;
  subject: string;
  preheader: string;
  siteUrl: string;
  siteName: string;
  /** Pre-escaped HTML for the body cell. */
  body: string;
  /** Pre-escaped HTML paragraphs for the footer. */
  footer: string;
};

function button(url: string, label: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:24px 0 8px"><tr><td bgcolor="${COLOR.violet}" style="background-color:${COLOR.violet};border-radius:8px"><a href="${escapeHtml(url)}" style="display:inline-block;padding:12px 24px;font-family:${SANS};font-size:16px;font-weight:700;line-height:20px;color:#ffffff;text-decoration:none;border-radius:8px">${escapeHtml(label)}</a></td></tr></table>`;
}

function link(url: string, label: string): string {
  return `<a class="em-link" href="${escapeHtml(url)}" style="color:${COLOR.violet};text-decoration:underline">${escapeHtml(label)}</a>`;
}

function paragraph(html: string, extra = ''): string {
  return `<p class="em-text" style="margin:0 0 16px;font-family:${SANS};font-size:16px;line-height:24px;color:${COLOR.text};${extra}">${html}</p>`;
}

function layout(input: Layout): string {
  const logo = `${originOf(input.siteUrl)}/email/logo.png`;
  const hidden =
    'display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all;font-size:1px;line-height:1px;color:#eef0ff';
  return `<!doctype html>
<html lang="${input.locale}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light dark">
<meta name="supported-color-schemes" content="light dark">
<title>${escapeHtml(input.subject)}</title>
<style>${DARK_CSS}</style>
</head>
<body class="em-page" style="margin:0;padding:0;background-color:${COLOR.page}">
<div style="${hidden}">${escapeHtml(input.preheader)}</div>
<table role="presentation" class="em-page" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${COLOR.page}" style="background-color:${COLOR.page}"><tr><td class="em-wrap" align="center" style="padding:24px 12px">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px">
<tr><td height="3" bgcolor="${COLOR.pink}" style="height:3px;font-size:0;line-height:0;background-color:${COLOR.pink};border-radius:8px 8px 0 0">&nbsp;</td></tr>
<tr><td class="em-card em-pad" bgcolor="${COLOR.card}" style="padding:28px 32px;background-color:${COLOR.card};border:1px dashed ${COLOR.border};border-top:0;border-radius:0 0 8px 8px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
<td width="32" valign="middle" style="width:32px;padding-right:10px"><img src="${escapeHtml(logo)}" alt="elvinlab" width="32" height="32" style="display:block;border:0;width:32px;height:32px"></td>
<td valign="middle" class="em-text" style="font-family:${MONO};font-size:18px;font-weight:700;color:${COLOR.text}">${escapeHtml(input.siteName)}</td>
</tr></table>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td class="em-rule" height="1" style="height:1px;font-size:0;line-height:0;border-bottom:1px dashed ${COLOR.border};padding-top:16px">&nbsp;</td></tr></table>
<div style="padding-top:24px">${input.body}</div>
</td></tr>
<tr><td style="padding:20px 8px 0">${input.footer}</td></tr>
</table>
</td></tr></table>
</body>
</html>
`;
}

function footerParagraph(html: string): string {
  return `<p class="em-muted" style="margin:0 0 8px;font-family:${SANS};font-size:12px;line-height:18px;color:${COLOR.muted}">${html}</p>`;
}

export function renderConfirmationEmail(input: ConfirmationEmailInput): RenderedEmail {
  const copy = COPY[input.locale];
  const domain = domainOf(input.siteUrl);
  const body = [
    `<h1 class="em-text" style="margin:0 0 16px;font-family:${SANS};font-size:20px;line-height:28px;font-weight:700;color:${COLOR.text}">${escapeHtml(copy.confirmTitle)}</h1>`,
    paragraph(escapeHtml(copy.confirmIntro)),
    button(input.confirmUrl, copy.confirmButton),
    paragraph(escapeHtml(copy.expiry), 'margin-top:16px'),
    `<p class="em-muted" style="margin:0 0 4px;font-family:${SANS};font-size:13px;line-height:20px;color:${COLOR.muted}">${escapeHtml(copy.copyLink)}</p>`,
    `<p class="em-muted" style="margin:0;font-family:${MONO};font-size:12px;line-height:18px;color:${COLOR.muted};word-break:break-all">${escapeHtml(input.confirmUrl)}</p>`,
  ].join('\n');
  const footer = [
    footerParagraph(escapeHtml(copy.confirmFooter(domain))),
    footerParagraph(
      `${link(input.privacyUrl, copy.privacy)} &middot; ${escapeHtml(copy.sentBy)} ${escapeHtml(input.ownerName)}`,
    ),
  ].join('\n');
  const text = [
    copy.greeting,
    '',
    copy.confirmIntroText,
    '',
    input.confirmUrl,
    '',
    copy.expiry,
    '',
    '--',
    copy.confirmFooter(domain),
    `${copy.privacy}: ${input.privacyUrl}`,
    `${copy.sentBy} ${input.ownerName}`,
  ].join('\n');
  return {
    subject: copy.confirmSubject,
    html: layout({
      locale: input.locale,
      subject: copy.confirmSubject,
      preheader: copy.confirmPreheader,
      siteUrl: input.siteUrl,
      siteName: input.siteName,
      body,
      footer,
    }),
    text,
  };
}

export function renderNoteEmail(input: NoteEmailInput): RenderedEmail {
  const copy = COPY[input.locale];
  const domain = domainOf(input.siteUrl);
  const title = oneLine(input.title);
  const subject = oneLine(copy.noteSubject(title));
  const summary = input.summary?.trim();
  const body = [
    `<h1 class="em-text" style="margin:0 0 16px;font-family:${SANS};font-size:20px;line-height:28px;font-weight:700;color:${COLOR.text}">${escapeHtml(title)}</h1>`,
    summary ? paragraph(escapeHtml(summary)) : '',
    button(input.noteUrl, copy.noteButton),
    `<p class="em-muted" style="margin:16px 0 0;font-family:${SANS};font-size:13px;line-height:20px;color:${COLOR.muted}">${escapeHtml(copy.noSpam)}</p>`,
  ]
    .filter(Boolean)
    .join('\n');
  const footer = [
    footerParagraph(escapeHtml(copy.noteFooter(domain))),
    footerParagraph(
      `${link(input.unsubscribeUrl, copy.unsubscribe)} &middot; ${link(input.privacyUrl, copy.privacy)} &middot; ${escapeHtml(copy.sentBy)} ${escapeHtml(input.ownerName)}`,
    ),
  ].join('\n');
  const text = [
    title,
    '',
    ...(summary ? [summary, ''] : []),
    copy.readIt,
    input.noteUrl,
    '',
    '--',
    copy.noteFooter(domain),
    copy.unsubscribeLead,
    input.unsubscribeUrl,
    `${copy.privacy}: ${input.privacyUrl}`,
    `${copy.sentBy} ${input.ownerName}`,
  ].join('\n');
  return {
    subject,
    html: layout({
      locale: input.locale,
      subject,
      preheader: summary ? oneLine(summary).slice(0, 110) : copy.notePreheader,
      siteUrl: input.siteUrl,
      siteName: input.siteName,
      body,
      footer,
    }),
    text,
  };
}
