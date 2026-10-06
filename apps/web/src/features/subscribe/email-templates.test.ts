import { describe, expect, it } from 'vitest';

import {
  type ConfirmationEmailInput,
  type NoteEmailInput,
  renderConfirmationEmail,
  renderNoteEmail,
} from './email-templates.ts';
import type { SubscribeLocale } from './ports.ts';

const base = (locale: SubscribeLocale) => ({
  locale,
  siteUrl: 'https://example.test',
  siteName: 'elvinlab',
  ownerName: 'Ada Example',
  privacyUrl: `https://example.test/${locale === 'en' ? 'en/' : ''}privacy/`,
});
const confirmation = (locale: SubscribeLocale): ConfirmationEmailInput => ({
  ...base(locale),
  confirmUrl: 'https://example.test/subscribe/confirm/?token=a%2Bb&x=1',
});
const note = (locale: SubscribeLocale, change: Partial<NoteEmailInput> = {}): NoteEmailInput => ({
  ...base(locale),
  title: 'Tags <script>alert(1)</script> & "quotes"',
  summary: 'Fish & chips <b>bold</b>',
  noteUrl: 'https://example.test/notes/tags/?a=1&b=2',
  unsubscribeUrl: 'https://example.test/subscribe/unsubscribe/?token=abc.def',
  ...change,
});
const escapeAttr = (url: string) => url.replace(/&/g, '&amp;');
const count = (haystack: string, needle: string) => haystack.split(needle).length - 1;
const locales: SubscribeLocale[] = ['es', 'en'];

describe.each(locales)('emails in %s', (locale) => {
  const mails = {
    confirmation: renderConfirmationEmail(confirmation(locale)),
    note: renderNoteEmail(note(locale)),
  };

  it.each(Object.entries(mails))('%s has subject, html and text', (_name, mail) => {
    expect(mail.subject.length).toBeGreaterThan(5);
    expect(mail.html).toContain('<!doctype html>');
    expect(mail.text.length).toBeGreaterThan(40);
    expect(mail.subject).not.toMatch(/[\r\n]/);
  });

  it.each(Object.entries(mails))('%s sets the language, color scheme and preheader', (_n, mail) => {
    expect(mail.html).toContain(`<html lang="${locale}"`);
    expect(mail.html).toContain('<meta name="color-scheme" content="light dark">');
    expect(mail.html).toContain('<meta name="supported-color-schemes" content="light dark">');
    expect(mail.html).toContain('@media (prefers-color-scheme: dark)');
    expect(mail.html).toMatch(/<div style="display:none;[^"]*">[^<]{10,}<\/div>/);
    expect(mail.html).toContain('<h1 ');
    expect(mail.html).toContain('role="presentation"');
  });

  it.each(Object.entries(mails))('%s ships nothing remote or active', (_n, mail) => {
    expect(mail.html).not.toContain('<script');
    expect(mail.html).not.toContain('http://');
    expect(mail.html).not.toMatch(/<link\b/i);
    expect(mail.html).not.toMatch(/@import|@font-face|url\(/i);
    const images = mail.html.match(/<img\b[^>]*>/g) ?? [];
    expect(images).toHaveLength(1);
    for (const image of images) {
      expect(image).toMatch(/\balt="[^"]+"/);
      expect(image).toMatch(/\bwidth="\d+"/);
      expect(image).toMatch(/\bheight="\d+"/);
    }
    expect(mail.html).toContain('src="https://example.test/email/logo.png"');
  });

  it('links the confirmation once and shows the raw URL as text; no unsubscribe link', () => {
    const { html, text } = mails.confirmation;
    const url = escapeAttr(confirmation(locale).confirmUrl);
    expect(count(html, `href="${url}"`)).toBe(1);
    expect(count(html, `>${url}</p>`)).toBe(1);
    expect(count(html, `href="${base(locale).privacyUrl}"`)).toBe(1);
    expect(text).toContain(`\n${confirmation(locale).confirmUrl}\n`);
    expect(html).not.toContain('unsubscribe');
    expect(text).not.toContain('unsubscribe');
    expect(`${html}${text}`).toMatch(/48/);
    expect(html).toContain('Ada Example');
  });

  it('links the note, the unsubscribe and the privacy page once each', () => {
    const { html, text } = mails.note;
    const input = note(locale);
    expect(count(html, `href="${escapeAttr(input.noteUrl)}"`)).toBe(1);
    expect(count(html, `href="${input.unsubscribeUrl}"`)).toBe(1);
    expect(count(html, `href="${base(locale).privacyUrl}"`)).toBe(1);
    expect(text).toContain(`\n${input.noteUrl}\n`);
    expect(text).toContain(`\n${input.unsubscribeUrl}\n`);
    expect(html).toContain('Ada Example');
  });

  it('escapes dynamic values in html and keeps them literal in text', () => {
    const { html, subject, text } = mails.note;
    expect(html).not.toContain('<b>bold</b>');
    expect(html).toContain('Tags &lt;script&gt;alert(1)&lt;/script&gt; &amp; &quot;quotes&quot;');
    expect(html).toContain('Fish &amp; chips &lt;b&gt;bold&lt;/b&gt;');
    expect(subject).toContain('<script>');
    expect(text).toContain('Tags <script>alert(1)</script> & "quotes"');
  });

  it('escapes hostile names and URLs in attributes', () => {
    const html = renderNoteEmail(
      note(locale, {
        ownerName: '<i>Eve</i>',
        noteUrl: 'https://example.test/"><script>x</script>',
      }),
    ).html;
    expect(html).not.toContain('<script');
    expect(html).not.toContain('<i>Eve</i>');
    expect(html).toContain('&lt;i&gt;Eve&lt;/i&gt;');
  });
});

describe('note email details', () => {
  it('omits the summary block when there is none and keeps a one-line subject', () => {
    const mail = renderNoteEmail(note('en', { summary: undefined, title: 'a\r\nBcc: x' }));
    expect(mail.subject).toBe('New note: a Bcc: x');
    expect(mail.text).not.toContain('Fish');
  });

  it('uses the summary as preheader and a generic one otherwise', () => {
    expect(renderNoteEmail(note('es', { summary: 'Resumen corto' })).html).toContain(
      'color:#eef0ff">Resumen corto</div>',
    );
    expect(renderNoteEmail(note('es', { summary: undefined })).html).toContain(
      'Hay una nota nueva',
    );
  });

  it('keeps the wording of the consent and the validity note', () => {
    const es = renderConfirmationEmail(confirmation('es')).text;
    const en = renderConfirmationEmail(confirmation('en')).text;
    expect(es).toContain('aviso de algún proyecto');
    expect(es).toContain('vence en 48 horas');
    expect(en).toContain('announcement of one of the author');
    expect(en).toContain('expires in 48 hours');
    expect(renderConfirmationEmail(confirmation('es')).subject).toContain('Confirma');
    expect(renderNoteEmail(note('es')).subject).toMatch(/^Nueva nota: /);
  });

  it('builds the logo URL from the site input, never a fixed domain', () => {
    const html = renderNoteEmail({ ...note('en'), siteUrl: 'https://other.test/' }).html;
    expect(html).toContain('src="https://other.test/email/logo.png"');
    expect(html).not.toContain('elvinlab.dev');
  });
});
