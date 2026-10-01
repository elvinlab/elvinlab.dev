import { CONTACT_POLICY } from '@/features/contact/config.ts';

export type FieldError = 'required' | 'too_long' | 'invalid';
export type FieldErrors = Partial<Record<'name' | 'email' | 'message', FieldError>>;

export type ContactErrorReason = 'unavailable' | 'forbidden' | 'rejected' | 'network';

export function validateContact(
  values: { name: string; email: string; message: string },
  limits: typeof CONTACT_POLICY = CONTACT_POLICY,
): FieldErrors {
  const nameRaw = values.name;
  const emailRaw = values.email;
  const messageRaw = values.message;

  const name = nameRaw.trim();
  const email = emailRaw.trim();
  const message = messageRaw.trim();
  const errors: FieldErrors = {};

  if (!name) {
    errors.name = 'required';
  } else if (name.length > limits.nameMaxLength) {
    errors.name = 'too_long';
  } else if (/[\r\n]/.test(nameRaw)) {
    errors.name = 'invalid';
  }

  if (!email) {
    errors.email = 'required';
  } else if (email.length > limits.emailMaxLength) {
    errors.email = 'too_long';
  } else if (/[\r\n]/.test(emailRaw)) {
    errors.email = 'invalid';
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.email = 'invalid';
  }

  if (!message) {
    errors.message = 'required';
  } else if (message.length > limits.messageMaxLength) {
    errors.message = 'too_long';
  }

  return errors;
}

export function remainingFillDelay(
  startedAt: number,
  now: number,
  minMs: number = CONTACT_POLICY.minFillTimeMs,
): number {
  if (now <= startedAt) return 0;
  const elapsed = now - startedAt;
  const remaining = minMs - elapsed;
  return remaining > 0 ? remaining : 0;
}

export function buildPayload(
  values: { name: string; email: string; message: string },
  startedAt: number,
  token: string,
  website: string,
): {
  name: string;
  email: string;
  message: string;
  website: string;
  startedAt: number;
  token: string;
} {
  return {
    name: values.name.trim(),
    email: values.email.trim(),
    message: values.message.trim(),
    website,
    startedAt,
    token,
  };
}

export function mapActionError(error: { code?: string } | undefined): ContactErrorReason {
  if (!error?.code) return 'network';
  switch (error.code) {
    case 'SERVICE_UNAVAILABLE':
      return 'unavailable';
    case 'FORBIDDEN':
      return 'forbidden';
    case 'BAD_REQUEST':
      return 'rejected';
    default:
      return 'network';
  }
}

export type FormState =
  | { status: 'idle' }
  | { status: 'submitting' }
  | { status: 'success' }
  | { status: 'error'; reason: ContactErrorReason };

export type FormEvent =
  | { type: 'submit' }
  | { type: 'succeeded' }
  | { type: 'failed'; reason: ContactErrorReason }
  | { type: 'edit' };

export function formReducer(state: FormState, event: FormEvent): FormState {
  switch (event.type) {
    case 'submit': {
      if (state.status === 'idle' || state.status === 'error') {
        return { status: 'submitting' };
      }
      return state;
    }
    case 'succeeded': {
      if (state.status === 'submitting') {
        return { status: 'success' };
      }
      return state;
    }
    case 'failed': {
      if (state.status === 'submitting') {
        return { status: 'error', reason: event.reason };
      }
      return state;
    }
    case 'edit': {
      if (state.status === 'error') {
        return { status: 'idle' };
      }
      return state;
    }
  }
}

export type ContactFormStrings = {
  labels: { name: string; email: string; message: string };
  placeholders: { name: string; email: string; message: string };
  errors: {
    name: { required: string; too_long: string; invalid: string };
    email: { required: string; too_long: string; invalid: string };
    message: { required: string; too_long: string };
  };
  submit: string;
  sending: string;
  success: { title: string; body: string };
  error: Record<ContactErrorReason, string>;
  verifying: string;
  unavailable: string;
};
