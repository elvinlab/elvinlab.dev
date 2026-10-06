export type SubscriberStatus = 'pending' | 'confirmed' | 'unsubscribed';
export type SubscribeLocale = 'es' | 'en';

export type Subscriber = {
  id: string;
  email: string;
  status: SubscriberStatus;
  locale: SubscribeLocale;
  /** When the last confirmation email went out; null when none was sent (or the send failed). */
  confirmSentAt: number | null;
  /** Slug of the last note sent to this subscriber. */
  lastNote: string | null;
};

export type NewPendingSubscriber = {
  id: string;
  email: string;
  locale: SubscribeLocale;
  /** SHA-256 hex of the confirmation token; the token itself is never stored. */
  confirmHash: string;
  confirmExpires: number;
  confirmSentAt: number;
  createdAt: number;
};

export type ConfirmationRenewal = Pick<
  NewPendingSubscriber,
  'locale' | 'confirmHash' | 'confirmExpires' | 'confirmSentAt'
>;

/** The list. D1 in production; every method takes plain data and never leaks provider types. */
export interface SubscriberRepository {
  findByEmail(email: string): Promise<Subscriber | null>;
  findById(id: string): Promise<Subscriber | null>;
  /** Inserts a pending row; false when the address already exists (a concurrent request won). */
  insertPending(row: NewPendingSubscriber): Promise<boolean>;
  /** Puts a pending or unsubscribed row back to `pending` with a fresh confirmation. */
  renewConfirmation(id: string, renewal: ConfirmationRenewal): Promise<void>;
  /** Forgets that a confirmation went out, so the cooldown never blocks a retry after a failed send. */
  clearConfirmationSent(id: string): Promise<void>;
  /**
   * Atomic and single use: confirms only a `pending` row whose hash matches and has not expired,
   * and clears the hash in the same step. Returns false for unknown, used and expired alike.
   */
  confirmByHash(confirmHash: string, now: number): Promise<boolean>;
  /** Idempotent: an already unsubscribed row stays as it is. */
  markUnsubscribed(id: string, now: number): Promise<void>;
  /** Confirmed subscribers whose `lastNote` differs from the slug, ordered by id. */
  listUnnotified(slug: string, limit: number): Promise<Subscriber[]>;
  countUnnotified(slug: string): Promise<number>;
  markNotified(ids: readonly string[], slug: string): Promise<void>;
  /** Deletes pending rows created before the cutoff; returns how many. */
  purgePendingBefore(cutoff: number): Promise<number>;
}

export type ConfirmationMail = {
  to: string;
  locale: SubscribeLocale;
  /** Full link; the plain token appears only inside it. */
  confirmUrl: string;
};

export type NoteMail = {
  to: string;
  locale: SubscribeLocale;
  title: string;
  summary?: string;
  url: string;
  /** The human page, linked in the email body and in the `List-Unsubscribe` header. */
  unsubscribeUrl: string;
};

/** Sends the two kinds of email. A failure throws; the domain never inspects the provider. */
export interface SubscriptionMailer {
  sendConfirmation(mail: ConfirmationMail): Promise<void>;
  /** At most `SUBSCRIBE_POLICY.batchSize` messages; the key makes a retried call idempotent. */
  sendNote(messages: readonly NoteMail[], idempotencyKey: string): Promise<void>;
}

export interface SubscribeVerifier {
  verify(token: string, ip: string): Promise<boolean>;
}

export interface SubscribeLimiter {
  allow(ip: string): Promise<boolean>;
}

/** Randomness and cryptography, injectable so tests are deterministic. */
export interface TokenService {
  /** An unguessable confirmation token (URL-safe). */
  randomToken(): string;
  /** An opaque subscriber id: lowercase hex, no dots. */
  randomId(): string;
  /** SHA-256 as lowercase hex. */
  hash(value: string): Promise<string>;
  /** HMAC-SHA-256 of the value with the server secret, base64url. */
  sign(value: string): Promise<string>;
  /** Constant-time check of a signature produced by `sign`. */
  verify(value: string, signature: string): Promise<boolean>;
}

/** Builds the links the emails carry; the pages behind them are a delivery concern. */
export interface SubscribeLinks {
  confirm(token: string, locale: SubscribeLocale): string;
  unsubscribe(token: string, locale: SubscribeLocale): string;
}

/** Diagnostic sink: receives codes and names only, never addresses, secrets or tokens. */
export type SubscribeReport = (detail: string) => void;

export type SubscribePorts = {
  repository: SubscriberRepository;
  mailer: SubscriptionMailer;
  verifier: SubscribeVerifier;
  limiter: SubscribeLimiter;
  tokens: TokenService;
  links: SubscribeLinks;
  now: () => number;
  report?: SubscribeReport;
};
