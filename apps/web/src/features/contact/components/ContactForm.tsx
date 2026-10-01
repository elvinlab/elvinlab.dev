import { actions } from 'astro:actions';
import { useCallback, useEffect, useRef, useState } from 'preact/hooks';

import {
  buildPayload,
  type ContactFormStrings,
  type FormEvent,
  type FormState,
  formReducer,
  mapActionError,
  remainingFillDelay,
  validateContact,
} from '@/features/contact/client/form.ts';
import {
  createTurnstileLoader,
  type TurnstileApi,
  type TurnstileOptions,
} from '@/features/contact/client/turnstile.ts';
import { CONTACT_POLICY } from '@/features/contact/config.ts';

type Props = {
  siteKey: string | undefined;
  strings: ContactFormStrings;
};

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const turnstileLoader = createTurnstileLoader({
  inject: (src: string, onLoad: () => void, onError: (err: Error) => void) => {
    const script = document.createElement('script');
    script.src = src;
    script.async = true;
    script.onload = onLoad;
    script.onerror = () => onError(new Error('Failed to load Turnstile script'));
    document.head.appendChild(script);
  },
  getApi: () => (window as Window & { turnstile?: TurnstileApi }).turnstile,
});

function Field({
  id,
  label,
  type = 'text',
  value,
  onInput,
  placeholder,
  maxLength,
  autoComplete,
  error,
  errorMessages,
  disabled,
  rows,
  as = 'input',
}: {
  id: string;
  label: string;
  type?: string;
  value: string;
  onInput: (value: string) => void;
  placeholder: string;
  maxLength: number;
  autoComplete: string;
  error: string | undefined;
  errorMessages: Record<string, string>;
  disabled: boolean;
  rows?: number;
  as?: 'input' | 'textarea';
}) {
  const isTextarea = as === 'textarea';
  const Tag = isTextarea ? 'textarea' : 'input';
  const className = `w-full rounded-control border bg-card px-3 py-2 text-text placeholder:text-muted ${
    isTextarea ? 'min-h-[120px] resize-y' : 'h-11'
  } ${error ? 'border-danger' : 'border-divider'}`;

  return (
    <div>
      <label htmlFor={id} class="block text-sm font-medium text-text mb-1">
        {label}
      </label>
      <Tag
        id={id}
        type={isTextarea ? undefined : type}
        name={id}
        value={value}
        onInput={(e: Event) =>
          onInput((e.currentTarget as HTMLInputElement | HTMLTextAreaElement).value)
        }
        placeholder={placeholder}
        maxLength={maxLength}
        autoComplete={autoComplete}
        class={className}
        aria-invalid={error ? 'true' : 'false'}
        aria-describedby={error ? `${id}-error` : undefined}
        disabled={disabled}
        rows={rows}
      />
      {error && (
        <p id={`${id}-error`} class="mt-1 text-sm text-danger" role="alert">
          {errorMessages[error]}
        </p>
      )}
    </div>
  );
}

export function ContactForm({ siteKey, strings }: Props) {
  const [state, setState] = useState<FormState>({ status: 'idle' });
  const [values, setValues] = useState({ name: '', email: '', message: '' });
  const [errors, setErrors] = useState<ReturnType<typeof validateContact>>({});
  const [turnstileToken, setTurnstileToken] = useState<string>('');
  const [turnstileApi, setTurnstileApi] = useState<TurnstileApi | null>(null);
  const [widgetId, setWidgetId] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [turnstileLoadError, setTurnstileLoadError] = useState(false);
  const [ready, setReady] = useState(false);
  // A ref, not state: the widget callback is created once and would capture a stale value.
  const submitPendingRef = useRef(false);
  const startedAtRef = useRef<number>(Date.now());
  const widgetContainerRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const loaderInitialized = useRef(false);

  useEffect(() => {
    setReady(true);
    startedAtRef.current = Date.now();
  }, []);

  const dispatch = useCallback((event: FormEvent) => {
    setState((prev: FormState) => formReducer(prev, event));
  }, []);

  const loadTurnstile = useCallback(async () => {
    if (!siteKey || turnstileApi || loaderInitialized.current) return;
    loaderInitialized.current = true;

    try {
      const api = await turnstileLoader();
      setTurnstileApi(api);

      if (widgetContainerRef.current) {
        const options: TurnstileOptions = {
          sitekey: siteKey,
          action: CONTACT_POLICY.turnstileAction,
          theme: 'auto',
          size: 'flexible',
          callback: (token: string) => {
            setTurnstileToken(token);
            setVerifying(false);
            if (submitPendingRef.current) {
              submitPendingRef.current = false;
              formRef.current?.requestSubmit();
            }
          },
          'expired-callback': () => {
            setTurnstileToken('');
            setVerifying(false);
            submitPendingRef.current = false;
          },
          'error-callback': () => {
            setTurnstileToken('');
            setVerifying(false);
            submitPendingRef.current = false;
            setTurnstileLoadError(true);
          },
        };
        const id = api.render(widgetContainerRef.current, options);
        setWidgetId(id);
      }
    } catch {
      setTurnstileLoadError(true);
    }
  }, [siteKey, turnstileApi]);

  useEffect(() => {
    return () => {
      if (widgetId && turnstileApi) {
        turnstileApi.remove(widgetId);
      }
    };
  }, [widgetId, turnstileApi]);

  const handleFocusIn = useCallback(() => {
    loadTurnstile();
  }, [loadTurnstile]);

  const handleSubmit = async (event: Event) => {
    event.preventDefault();

    const fieldErrors = validateContact(values);
    setErrors(fieldErrors);

    if (Object.keys(fieldErrors).length > 0) {
      const firstInvalid = Object.keys(fieldErrors)[0] as keyof typeof values;
      const input = formRef.current?.elements.namedItem(firstInvalid) as
        | HTMLInputElement
        | HTMLTextAreaElement
        | null;
      input?.focus();
      return;
    }

    if (!turnstileToken) {
      setVerifying(true);
      submitPendingRef.current = true;
      return;
    }

    dispatch({ type: 'submit' });

    const delay = remainingFillDelay(startedAtRef.current, Date.now());
    if (delay > 0) {
      await sleep(delay);
    }

    const form = formRef.current;
    if (!form) return;
    const formData = new FormData(form);
    const website = (formData.get('website') as string) || '';

    try {
      const payload = buildPayload(values, startedAtRef.current, turnstileToken, website);
      const result = await actions.contact(payload);

      if (result.error) {
        const reason = mapActionError(result.error);
        dispatch({ type: 'failed', reason });
        if (widgetId && turnstileApi) {
          turnstileApi.reset(widgetId);
        }
        setTurnstileToken('');
      } else {
        dispatch({ type: 'succeeded' });
      }
    } catch {
      dispatch({ type: 'failed', reason: 'network' });
      if (widgetId && turnstileApi) {
        turnstileApi.reset(widgetId);
      }
      setTurnstileToken('');
    }
  };

  const handleChange = (field: keyof typeof values, value: string) => {
    setValues((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
    if (state.status === 'error') {
      dispatch({ type: 'edit' });
    }
  };

  const isSubmitting = state.status === 'submitting';
  const isError = state.status === 'error';
  const disabled = isSubmitting || !siteKey || turnstileLoadError || !ready;

  if (state.status === 'success') {
    return (
      <div role="status" class="space-y-2 text-center">
        <h3 class="text-lg font-semibold text-text">{strings.success.title}</h3>
        <p class="text-text-secondary">{strings.success.body}</p>
      </div>
    );
  }

  return (
    <form
      ref={formRef}
      onSubmit={handleSubmit}
      onFocusIn={handleFocusIn}
      class="space-y-4"
      noValidate
    >
      {!siteKey && (
        <p role="status" class="text-sm text-text-secondary">
          {strings.unavailable}
        </p>
      )}

      {turnstileLoadError && (
        <div
          class="rounded-control bg-danger/10 border border-danger/20 p-3 text-sm text-danger"
          role="alert"
        >
          {strings.error.unavailable}
        </div>
      )}

      <Field
        id="name"
        label={strings.labels.name}
        type="text"
        value={values.name}
        onInput={(v) => handleChange('name', v)}
        placeholder={strings.placeholders.name}
        maxLength={CONTACT_POLICY.nameMaxLength}
        autoComplete="name"
        error={errors.name}
        errorMessages={strings.errors.name}
        disabled={disabled}
      />

      <Field
        id="email"
        label={strings.labels.email}
        type="email"
        value={values.email}
        onInput={(v) => handleChange('email', v)}
        placeholder={strings.placeholders.email}
        maxLength={CONTACT_POLICY.emailMaxLength}
        autoComplete="email"
        error={errors.email}
        errorMessages={strings.errors.email}
        disabled={disabled}
      />

      <Field
        id="message"
        label={strings.labels.message}
        value={values.message}
        onInput={(v) => handleChange('message', v)}
        placeholder={strings.placeholders.message}
        maxLength={CONTACT_POLICY.messageMaxLength}
        autoComplete="off"
        error={errors.message}
        errorMessages={strings.errors.message}
        disabled={disabled}
        as="textarea"
        rows={5}
      />

      <div ref={widgetContainerRef} class="w-full" />

      {verifying && (
        <p class="text-sm text-text-secondary text-center" role="status" aria-live="polite">
          {strings.verifying}
        </p>
      )}

      {isError && (
        <div
          class="rounded-control bg-danger/10 border border-danger/20 p-3 text-sm text-danger"
          role="alert"
        >
          {strings.error[state.reason]}
        </div>
      )}

      <button
        type="submit"
        disabled={disabled}
        class={`w-full h-11 rounded-control bg-button text-white font-medium ${
          disabled ? 'cursor-not-allowed opacity-50' : 'hover:bg-button/90'
        }`}
        aria-disabled={disabled}
        aria-busy={isSubmitting}
      >
        {isSubmitting ? strings.sending : strings.submit}
      </button>

      <div class="absolute -left-[9999px]" aria-hidden="true">
        <input type="text" name="website" tabIndex={-1} autoComplete="off" />
      </div>
    </form>
  );
}
