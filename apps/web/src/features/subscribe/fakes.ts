import type {
  ConfirmationMail,
  NewPendingSubscriber,
  NoteMail,
  SubscribePorts,
  Subscriber,
  SubscriberRepository,
  SubscriptionMailer,
  TokenService,
} from './ports.ts';

// Test doubles shared by the domain tests. Nothing in production imports this file.

type Row = Subscriber & {
  confirmHash: string | null;
  confirmExpires: number | null;
  createdAt: number;
};

/** In-memory list that follows the contract documented on `SubscriberRepository`. */
export function createFakeRepository() {
  const rows = new Map<string, Row>();
  const publicView = ({ id, email, status, locale, confirmSentAt, lastNote }: Row): Subscriber => ({
    id,
    email,
    status,
    locale,
    confirmSentAt,
    lastNote,
  });
  const repository: SubscriberRepository = {
    async findByEmail(email) {
      const row = [...rows.values()].find((candidate) => candidate.email === email);
      return row ? publicView(row) : null;
    },
    async findById(id) {
      const row = rows.get(id);
      return row ? publicView(row) : null;
    },
    async insertPending(row: NewPendingSubscriber) {
      if ([...rows.values()].some((candidate) => candidate.email === row.email)) return false;
      rows.set(row.id, { ...row, status: 'pending', lastNote: null });
      return true;
    },
    async renewConfirmation(id, renewal) {
      const row = rows.get(id);
      if (row) Object.assign(row, renewal, { status: 'pending' });
    },
    async clearConfirmationSent(id) {
      const row = rows.get(id);
      if (row) row.confirmSentAt = null;
    },
    async confirmByHash(confirmHash, now) {
      const row = [...rows.values()].find((candidate) => candidate.confirmHash === confirmHash);
      if (row?.status !== 'pending') return false;
      if (row.confirmExpires === null || row.confirmExpires <= now) return false;
      Object.assign(row, { status: 'confirmed', confirmHash: null, confirmExpires: null });
      return true;
    },
    async markUnsubscribed(id) {
      const row = rows.get(id);
      if (row)
        Object.assign(row, { status: 'unsubscribed', confirmHash: null, confirmExpires: null });
    },
    async listUnnotified(slug, limit) {
      return [...rows.values()]
        .filter((row) => row.status === 'confirmed' && row.lastNote !== slug)
        .sort((a, b) => a.id.localeCompare(b.id))
        .slice(0, limit)
        .map(publicView);
    },
    async countUnnotified(slug) {
      return [...rows.values()].filter((row) => row.status === 'confirmed' && row.lastNote !== slug)
        .length;
    },
    async markNotified(ids, slug) {
      for (const id of ids) {
        const row = rows.get(id);
        if (row) row.lastNote = slug;
      }
    },
    async purgePendingBefore(cutoff) {
      let removed = 0;
      for (const [id, row] of rows) {
        if (row.status === 'pending' && row.createdAt < cutoff) {
          rows.delete(id);
          removed += 1;
        }
      }
      return removed;
    },
  };
  return { repository, rows };
}

/** Records what it was asked to send; can be told to fail. */
export function createFakeMailer() {
  const confirmations: ConfirmationMail[] = [];
  const batches: { messages: NoteMail[]; key: string }[] = [];
  const state = { failNext: false };
  const mailer: SubscriptionMailer = {
    async sendConfirmation(mail) {
      if (state.failNext) {
        state.failNext = false;
        throw new Error('fake mail failure');
      }
      confirmations.push(mail);
    },
    async sendNote(messages, key) {
      if (state.failNext) {
        state.failNext = false;
        throw new Error('fake mail failure');
      }
      batches.push({ messages: [...messages], key });
    },
  };
  return { mailer, confirmations, batches, state };
}

/**
 * A second, differently built mailer: one flat outbox of strings, no per-kind arrays. Used to show
 * that the domain only depends on the port.
 */
export function createOutboxMailer() {
  const outbox: string[] = [];
  const mailer: SubscriptionMailer = {
    async sendConfirmation({ to, confirmUrl }) {
      outbox.push(`confirm|${to}|${confirmUrl}`);
    },
    async sendNote(messages, key) {
      for (const message of messages)
        outbox.push(`note|${message.to}|${message.unsubscribeUrl}|${key}`);
    },
  };
  return { mailer, outbox };
}

/** Deterministic tokens: readable values, no real cryptography. */
export function createFakeTokens(): TokenService {
  let tokenCount = 0;
  let idCount = 0;
  return {
    randomToken: () => `token${++tokenCount}`,
    randomId: () => `${(++idCount).toString(16).padStart(32, '0')}`,
    hash: async (value) => `hash:${value}`,
    sign: async (value) => `sig-${value}`,
    verify: async (value, signature) => signature === `sig-${value}`,
  };
}

export const FAKE_CLOCK = { time: 1_000_000_000 };

export function createFakePorts(overrides: Partial<SubscribePorts> = {}) {
  const repo = createFakeRepository();
  const mail = createFakeMailer();
  const reports: string[] = [];
  const ports: SubscribePorts = {
    repository: repo.repository,
    mailer: mail.mailer,
    verifier: { verify: async () => true },
    limiter: { allow: async () => true },
    tokens: createFakeTokens(),
    links: {
      confirm: (token, locale) => `https://site.test/${locale}/confirm/?token=${token}`,
      unsubscribe: (token, locale) => `https://site.test/${locale}/unsubscribe/?token=${token}`,
    },
    now: () => FAKE_CLOCK.time,
    report: (detail) => reports.push(detail),
    ...overrides,
  };
  return { ports, rows: repo.rows, reports, ...mail };
}
