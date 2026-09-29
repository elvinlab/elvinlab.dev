import { z } from 'zod';

import { CONTACT_POLICY } from './config.ts';
import type { ContactPorts } from './ports.ts';

// Server-only module: keep validation dependencies out of future client island imports.
const inputSchema = z.strictObject({
  name: z
    .string()
    .max(CONTACT_POLICY.nameMaxLength)
    .regex(/^[^\r\n]*$/)
    .trim()
    .min(1),
  email: z
    .string()
    .max(CONTACT_POLICY.emailMaxLength)
    .regex(/^[^\r\n]*$/)
    .trim()
    .pipe(z.email()),
  message: z.string().max(CONTACT_POLICY.messageMaxLength).trim().min(1),
  website: z.literal(''),
  startedAt: z.number().int().nonnegative(),
  token: z.string().min(1).max(CONTACT_POLICY.tokenMaxLength),
});
const ipSchema = z.union([z.ipv4(), z.ipv6()]);

export type ContactResult =
  | { ok: true }
  | { ok: false; error: 'Unable to send your message. Please try again later.' };

const REJECTED: ContactResult = {
  ok: false,
  error: 'Unable to send your message. Please try again later.',
};

/** Validates and gates all side effects; failures never expose provider details or retry sends. */
export async function submitContact(
  input: unknown,
  ip: string | undefined,
  ports: ContactPorts,
): Promise<ContactResult> {
  const parsed = inputSchema.safeParse(input);
  if (!parsed.success || !ipSchema.safeParse(ip).success || !ip) return REJECTED;

  try {
    const { name, email, message, startedAt, token } = parsed.data;
    // This client timestamp is only a spam heuristic, never proof of a human submission.
    const elapsed = ports.now() - startedAt;
    if (!Number.isFinite(elapsed) || elapsed < CONTACT_POLICY.minFillTimeMs) return REJECTED;
    if (!(await ports.limiter.allow(ip))) return REJECTED;
    if (!(await ports.verifier.verify(token, ip))) return REJECTED;
    await ports.mailSender.send({ name, email, message });
    return { ok: true };
  } catch {
    return REJECTED;
  }
}
