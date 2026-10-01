import { z } from 'zod';

import { CONTACT_POLICY } from '@/features/contact/config.ts';
import type { ContactReport, MailSender } from '@/features/contact/ports.ts';

import { readProviderJson } from './response.ts';

export type ResendConfig = { apiKey: string; from: string; to: string };
const replyToSchema = z
  .string()
  .max(CONTACT_POLICY.emailMaxLength)
  .regex(/^[^\r\n]*$/)
  .pipe(z.email());
const sentSchema = z.object({ id: z.uuid() });

/** Uses private fixed addresses; no SDK, HTML rendering, logging, redirects or send retries. */
export function createResendSender(
  config: ResendConfig,
  request: typeof fetch = fetch,
  report: ContactReport = () => {},
): MailSender {
  return {
    async send(message) {
      try {
        const replyTo = replyToSchema.parse(message.email);
        const signal = AbortSignal.timeout(CONTACT_POLICY.providerTimeoutMs);
        const response = await request('https://api.resend.com/emails', {
          method: 'POST',
          redirect: 'error',
          headers: { Authorization: `Bearer ${config.apiKey}`, 'Content-Type': 'application/json' },
          signal,
          body: JSON.stringify({
            from: config.from,
            to: [config.to],
            reply_to: replyTo,
            subject: CONTACT_POLICY.mailSubject,
            text: `From: ${message.name}\n\n${message.message}`,
          }),
        });
        if (!response.ok) report(`resend http ${response.status}`);
        sentSchema.parse(await readProviderJson(response, signal));
      } catch {
        throw new Error('Unable to send message.');
      }
    },
  };
}
