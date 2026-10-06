import { z } from 'zod';

import { SUBSCRIBE_POLICY } from '@/features/subscribe/config.ts';
import type {
  ConfirmationMail,
  NoteMail,
  SubscribeLocale,
  SubscribeReport,
  SubscriptionMailer,
} from '@/features/subscribe/ports.ts';
import { readProviderJson } from '@/shared/lib/provider-json.ts';

export type ResendMailerConfig = { apiKey: string; from: string };

const SEND_URL = 'https://api.resend.com/emails';
const BATCH_URL = 'https://api.resend.com/emails/batch';
const sentSchema = z.object({ id: z.string().min(1) });
const batchSchema = z.object({ data: z.array(sentSchema) });
const oneLine = (value: string): string => value.replace(/[\r\n]+/g, ' ').trim();

const COPY = {
  es: {
    confirmSubject: 'Confirma tu suscripción a Lab Notes',
    confirmBody: (url: string) =>
      `Hola,\n\nAlguien (esperamos que tú) pidió recibir un aviso por correo con cada nueva nota de Lab Notes. Para confirmarlo, abre este enlace:\n\n${url}\n\nEl enlace vence en 48 horas. Si no fuiste tú, ignora este mensaje y no recibirás nada más.`,
    noteSubject: (title: string) => `Nueva nota: ${title}`,
    noteBody: (mail: NoteMail) =>
      `${mail.title}\n\n${mail.summary ? `${mail.summary}\n\n` : ''}Léela aquí: ${mail.url}\n\n--\nRecibes este correo porque te suscribiste a Lab Notes. Para dejar de recibirlo: ${mail.unsubscribeUrl}`,
  },
  en: {
    confirmSubject: 'Confirm your subscription to Lab Notes',
    confirmBody: (url: string) =>
      `Hello,\n\nSomeone (we hope you) asked to get an email about each new Lab Notes post. To confirm, open this link:\n\n${url}\n\nThe link expires in 48 hours. If it was not you, ignore this message and you will receive nothing else.`,
    noteSubject: (title: string) => `New note: ${title}`,
    noteBody: (mail: NoteMail) =>
      `${mail.title}\n\n${mail.summary ? `${mail.summary}\n\n` : ''}Read it here: ${mail.url}\n\n--\nYou get this email because you subscribed to Lab Notes. To stop receiving it: ${mail.unsubscribeUrl}`,
  },
} satisfies Record<SubscribeLocale, unknown>;

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

  return {
    async sendConfirmation(mail: ConfirmationMail) {
      const copy = COPY[mail.locale];
      try {
        sentSchema.parse(
          await post(SEND_URL, {
            from: config.from,
            to: [mail.to],
            subject: copy.confirmSubject,
            text: copy.confirmBody(mail.confirmUrl),
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
          const copy = COPY[mail.locale];
          return {
            from: config.from,
            to: [mail.to],
            subject: oneLine(copy.noteSubject(mail.title)),
            text: copy.noteBody({ ...mail, title: oneLine(mail.title) }),
            headers: {
              'List-Unsubscribe': `<${mail.unsubscribeUrl}>`,
              'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
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
