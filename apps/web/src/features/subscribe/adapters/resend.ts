import { z } from 'zod';

import { SUBSCRIBE_PATHS, SUBSCRIBE_POLICY } from '@/features/subscribe/config.ts';
import { renderConfirmationEmail, renderNoteEmail } from '@/features/subscribe/email-templates.ts';
import type {
  ConfirmationMail,
  SubscribeLocale,
  SubscribeReport,
  SubscriptionMailer,
} from '@/features/subscribe/ports.ts';
import { readProviderJson } from '@/shared/lib/provider-json.ts';

export type ResendMailerConfig = {
  apiKey: string;
  from: string;
  /** Origin of the site: the emails link back to it and host their logo there. */
  siteUrl: string;
  siteName: string;
  ownerName: string;
};

const SEND_URL = 'https://api.resend.com/emails';
const BATCH_URL = 'https://api.resend.com/emails/batch';
const sentSchema = z.object({ id: z.string().min(1) });
const batchSchema = z.object({ data: z.array(sentSchema) });

/** Resend over `fetch`: no SDK, no redirects, no retries; errors are generic and never carry a body or an address. */
export function createResendMailer(
  config: ResendMailerConfig,
  request: typeof fetch = fetch,
  report: SubscribeReport = () => {},
): SubscriptionMailer {
  async function post(url: string, body: unknown, headers: Record<string, string> = {}) {
    const signal = AbortSignal.timeout(SUBSCRIBE_POLICY.providerTimeoutMs);
    const response = await request(url, {
      method: 'POST',
      redirect: 'manual', // Workers has no 'error'; a 3xx is not ok, so it is rejected below
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
        ...headers,
      },
      signal,
      body: JSON.stringify(body),
    });
    if (!response.ok) report(`resend http ${response.status}`);
    return readProviderJson(response, signal);
  }

  const origin = config.siteUrl.replace(/\/+$/, '');
  const site = (locale: SubscribeLocale) => ({
    locale,
    siteUrl: origin,
    siteName: config.siteName,
    ownerName: config.ownerName,
    privacyUrl: `${origin}${locale === 'en' ? '/en' : ''}${SUBSCRIBE_PATHS.privacy}`,
  });

  return {
    async sendConfirmation(mail: ConfirmationMail) {
      try {
        const email = renderConfirmationEmail({
          ...site(mail.locale),
          confirmUrl: mail.confirmUrl,
        });
        sentSchema.parse(
          await post(SEND_URL, {
            from: config.from,
            to: [mail.to],
            subject: email.subject,
            html: email.html,
            text: email.text,
          }),
        );
      } catch {
        throw new Error('Unable to send confirmation.');
      }
    },
    async sendNote(messages, idempotencyKey) {
      try {
        if (messages.length === 0 || messages.length > SUBSCRIBE_POLICY.batchSize)
          throw new Error('Invalid batch size.');
        const payload = messages.map((mail) => {
          const email = renderNoteEmail({
            ...site(mail.locale),
            title: mail.title,
            summary: mail.summary,
            noteUrl: mail.url,
            unsubscribeUrl: mail.unsubscribeUrl,
          });
          return {
            from: config.from,
            to: [mail.to],
            subject: email.subject,
            html: email.html,
            text: email.text,
            headers: {
              'List-Unsubscribe': `<${mail.unsubscribeUrl}>`,
            },
          };
        });
        const result = batchSchema.parse(
          await post(BATCH_URL, payload, { 'Idempotency-Key': idempotencyKey }),
        );
        // A partial batch must not be marked as sent: the retry shares the idempotency key.
        if (result.data.length !== messages.length) throw new Error('Incomplete batch.');
      } catch {
        throw new Error('Unable to send note.');
      }
    },
  };
}
