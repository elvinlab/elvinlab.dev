/**
 * Writes the subscription emails with sample data into `.email-preview/` (git-ignored) so they can
 * be opened in a browser. Nothing is sent and nothing touches the network.
 *
 *   node --import ./apps/web/scripts/register-alias.mjs apps/web/scripts/preview-email.ts
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { renderConfirmationEmail, renderNoteEmail } from '@/features/subscribe/email-templates.ts';
import type { SubscribeLocale } from '@/features/subscribe/ports.ts';

const outDir = resolve(import.meta.dirname, '../../../.email-preview');
mkdirSync(outDir, { recursive: true });

const SITE = 'https://example.test';
for (const locale of ['es', 'en'] satisfies SubscribeLocale[]) {
  const prefix = locale === 'en' ? '/en' : '';
  const shared = {
    locale,
    siteUrl: SITE,
    siteName: 'elvinlab',
    ownerName: 'Ada Example',
    privacyUrl: `${SITE}${prefix}/privacy/`,
  };
  const mails = {
    confirmation: renderConfirmationEmail({
      ...shared,
      confirmUrl: `${SITE}${prefix}/subscribe/confirm/?token=EXAMPLE-TOKEN`,
    }),
    note: renderNoteEmail({
      ...shared,
      title: 'Escaping <script>alert(1)</script> & friends',
      summary: 'A short summary of the note, with an ampersand & a <b>tag</b> to prove escaping.',
      noteUrl: `${SITE}${prefix}/notes/example/`,
      unsubscribeUrl: `${SITE}${prefix}/subscribe/unsubscribe/?token=EXAMPLE.SIGNATURE`,
    }),
  };
  for (const [kind, mail] of Object.entries(mails)) {
    writeFileSync(resolve(outDir, `${kind}-${locale}.html`), mail.html);
    writeFileSync(
      resolve(outDir, `${kind}-${locale}.txt`),
      `Subject: ${mail.subject}\n\n${mail.text}\n`,
    );
  }
}
console.log(`Email previews written to ${outDir}`);
