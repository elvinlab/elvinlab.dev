export type ContactMessage = {
  name: string;
  email: string;
  message: string;
};

/** Sends plain text to a fixed private recipient; email is only the validated Reply-To. */
export interface MailSender {
  send(message: ContactMessage): Promise<void>;
}

export interface ContactVerifier {
  verify(token: string, ip: string): Promise<boolean>;
}

export interface ContactLimiter {
  allow(ip: string): Promise<boolean>;
}

export type ContactPorts = {
  mailSender: MailSender;
  verifier: ContactVerifier;
  limiter: ContactLimiter;
  now: () => number;
};
