import { describe, expect, it } from 'vitest';

import { buildContactContent, type ContactContent } from './content.ts';

const content = buildContactContent();

const flatten = (page: ContactContent): string =>
  [
    page.pageTitle,
    page.pageDescription,
    page.noscript,
    page.form.labels.name,
    page.form.labels.email,
    page.form.labels.message,
    page.form.placeholders.name,
    page.form.placeholders.email,
    page.form.placeholders.message,
    page.form.errors.name.required,
    page.form.errors.name.too_long,
    page.form.errors.name.invalid,
    page.form.errors.email.required,
    page.form.errors.email.too_long,
    page.form.errors.email.invalid,
    page.form.errors.message.required,
    page.form.errors.message.too_long,
    page.form.submit,
    page.form.sending,
    page.form.success.title,
    page.form.success.body,
    page.form.error.unavailable,
    page.form.error.forbidden,
    page.form.error.rejected,
    page.form.error.network,
    page.form.verifying,
    page.form.unavailable,
    page.linkedin,
  ].join('\n');

describe('buildContactContent', () => {
  it('returns both locales', () => {
    expect(content).toHaveProperty('es');
    expect(content).toHaveProperty('en');
  });

  it('every string is a non-empty string', () => {
    for (const locale of ['es', 'en'] as const) {
      const page = content[locale];
      const texts = flatten(page).split('\n');
      for (const text of texts) {
        expect(typeof text).toBe('string');
        expect(text.length).toBeGreaterThan(0);
      }
    }
  });

  it('says "reply by email" once on the page: no separate intro repeating the description', () => {
    for (const locale of ['es', 'en'] as const) {
      expect(content[locale]).not.toHaveProperty('intro');
    }
  });

  it('ES and EN have exactly the same key structure', () => {
    const esKeys = Object.keys(content.es).sort();
    const enKeys = Object.keys(content.en).sort();
    expect(esKeys).toEqual(enKeys);

    // Check form subkeys
    const esFormKeys = Object.keys(content.es.form).sort();
    const enFormKeys = Object.keys(content.en.form).sort();
    expect(esFormKeys).toEqual(enFormKeys);

    // Check form.labels
    expect(Object.keys(content.es.form.labels).sort()).toEqual(
      Object.keys(content.en.form.labels).sort(),
    );
    // Check form.placeholders
    expect(Object.keys(content.es.form.placeholders).sort()).toEqual(
      Object.keys(content.en.form.placeholders).sort(),
    );
    // Check form.errors
    expect(Object.keys(content.es.form.errors).sort()).toEqual(
      Object.keys(content.en.form.errors).sort(),
    );
    // Check form.errors.name
    expect(Object.keys(content.es.form.errors.name).sort()).toEqual(
      Object.keys(content.en.form.errors.name).sort(),
    );
    // Check form.errors.email
    expect(Object.keys(content.es.form.errors.email).sort()).toEqual(
      Object.keys(content.en.form.errors.email).sort(),
    );
    // Check form.errors.message
    expect(Object.keys(content.es.form.errors.message).sort()).toEqual(
      Object.keys(content.en.form.errors.message).sort(),
    );
    // Check form.success
    expect(Object.keys(content.es.form.success).sort()).toEqual(
      Object.keys(content.en.form.success).sort(),
    );
    // Check form.error (Record<ContactErrorReason, string>)
    expect(Object.keys(content.es.form.error).sort()).toEqual(
      Object.keys(content.en.form.error).sort(),
    );
  });

  it('no string contains an @ character except the placeholder', () => {
    // The placeholders are the only ones allowed to have @
    // We need to check that other strings don't have @
    const forbiddenStrings = [
      content.es.pageTitle,
      content.es.pageDescription,
      content.es.noscript,
      content.es.form.labels.name,
      content.es.form.labels.email,
      content.es.form.labels.message,
      content.es.form.errors.name.required,
      content.es.form.errors.name.too_long,
      content.es.form.errors.name.invalid,
      content.es.form.errors.email.required,
      content.es.form.errors.email.too_long,
      content.es.form.errors.email.invalid,
      content.es.form.errors.message.required,
      content.es.form.errors.message.too_long,
      content.es.form.submit,
      content.es.form.sending,
      content.es.form.success.title,
      content.es.form.success.body,
      content.es.form.error.unavailable,
      content.es.form.error.forbidden,
      content.es.form.error.rejected,
      content.es.form.error.network,
      content.es.form.verifying,
      content.es.form.unavailable,
      content.en.pageTitle,
      content.en.pageDescription,
      content.en.noscript,
      content.en.form.labels.name,
      content.en.form.labels.email,
      content.en.form.labels.message,
      content.en.form.errors.name.required,
      content.en.form.errors.name.too_long,
      content.en.form.errors.name.invalid,
      content.en.form.errors.email.required,
      content.en.form.errors.email.too_long,
      content.en.form.errors.email.invalid,
      content.en.form.errors.message.required,
      content.en.form.errors.message.too_long,
      content.en.form.submit,
      content.en.form.sending,
      content.en.form.success.title,
      content.en.form.success.body,
      content.en.form.error.unavailable,
      content.en.form.error.forbidden,
      content.en.form.error.rejected,
      content.en.form.error.network,
      content.en.form.verifying,
      content.en.form.unavailable,
    ];

    for (const str of forbiddenStrings) {
      expect(str).not.toContain('@');
    }
  });

  it('placeholders contain @ character', () => {
    expect(content.es.form.placeholders.email).toContain('@');
    expect(content.en.form.placeholders.email).toContain('@');
  });

  it('form.labels, errors, error cover every key of ContactFormStrings', () => {
    // The type system enforces this, plus a runtime parity check
    // Check labels
    expect(content.es.form.labels).toHaveProperty('name');
    expect(content.es.form.labels).toHaveProperty('email');
    expect(content.es.form.labels).toHaveProperty('message');

    // Check placeholders
    expect(content.es.form.placeholders).toHaveProperty('name');
    expect(content.es.form.placeholders).toHaveProperty('email');
    expect(content.es.form.placeholders).toHaveProperty('message');

    // Check errors.name
    expect(content.es.form.errors.name).toHaveProperty('required');
    expect(content.es.form.errors.name).toHaveProperty('too_long');
    expect(content.es.form.errors.name).toHaveProperty('invalid');

    // Check errors.email
    expect(content.es.form.errors.email).toHaveProperty('required');
    expect(content.es.form.errors.email).toHaveProperty('too_long');
    expect(content.es.form.errors.email).toHaveProperty('invalid');

    // Check errors.message
    expect(content.es.form.errors.message).toHaveProperty('required');
    expect(content.es.form.errors.message).toHaveProperty('too_long');

    // Check success
    expect(content.es.form.success).toHaveProperty('title');
    expect(content.es.form.success).toHaveProperty('body');

    // Check error (ContactErrorReason)
    expect(content.es.form.error).toHaveProperty('unavailable');
    expect(content.es.form.error).toHaveProperty('forbidden');
    expect(content.es.form.error).toHaveProperty('rejected');
    expect(content.es.form.error).toHaveProperty('network');

    // Check other required strings
    expect(content.es.form).toHaveProperty('submit');
    expect(content.es.form).toHaveProperty('sending');
    expect(content.es.form).toHaveProperty('verifying');
    expect(content.es.form).toHaveProperty('unavailable');

    // Same for EN
    expect(content.en.form.labels).toHaveProperty('name');
    expect(content.en.form.labels).toHaveProperty('email');
    expect(content.en.form.labels).toHaveProperty('message');

    expect(content.en.form.placeholders).toHaveProperty('name');
    expect(content.en.form.placeholders).toHaveProperty('email');
    expect(content.en.form.placeholders).toHaveProperty('message');

    expect(content.en.form.errors.name).toHaveProperty('required');
    expect(content.en.form.errors.name).toHaveProperty('too_long');
    expect(content.en.form.errors.name).toHaveProperty('invalid');

    expect(content.en.form.errors.email).toHaveProperty('required');
    expect(content.en.form.errors.email).toHaveProperty('too_long');
    expect(content.en.form.errors.email).toHaveProperty('invalid');

    expect(content.en.form.errors.message).toHaveProperty('required');
    expect(content.en.form.errors.message).toHaveProperty('too_long');

    expect(content.en.form.success).toHaveProperty('title');
    expect(content.en.form.success).toHaveProperty('body');

    expect(content.en.form.error).toHaveProperty('unavailable');
    expect(content.en.form.error).toHaveProperty('forbidden');
    expect(content.en.form.error).toHaveProperty('rejected');
    expect(content.en.form.error).toHaveProperty('network');

    expect(content.en.form).toHaveProperty('submit');
    expect(content.en.form).toHaveProperty('sending');
    expect(content.en.form).toHaveProperty('verifying');
    expect(content.en.form).toHaveProperty('unavailable');
  });

  it('ES copy matches the exact specification', () => {
    expect(content.es.pageTitle).toBe('Contacto');
    expect(content.es.pageDescription).toBe(
      '¿Una idea, una oferta o una pregunta? Escríbeme y te respondo por correo.',
    );
    expect(content.es.noscript).toBe('Este formulario necesita JavaScript para funcionar.');
    expect(content.es.form.labels.name).toBe('Nombre');
    expect(content.es.form.labels.email).toBe('Correo electrónico');
    expect(content.es.form.labels.message).toBe('Mensaje');
    expect(content.es.form.placeholders.name).toBe('Tu nombre');
    expect(content.es.form.placeholders.email).toBe('nombre@ejemplo.com');
    expect(content.es.form.placeholders.message).toBe('Cuéntame en qué puedo ayudarte');
    expect(content.es.form.errors.name.required).toBe('Escribe tu nombre.');
    expect(content.es.form.errors.name.too_long).toBe('El nombre es demasiado largo.');
    expect(content.es.form.errors.name.invalid).toBe('El nombre no es válido.');
    expect(content.es.form.errors.email.required).toBe('Escribe tu correo.');
    expect(content.es.form.errors.email.too_long).toBe('El correo es demasiado largo.');
    expect(content.es.form.errors.email.invalid).toBe('Revisa el formato del correo.');
    expect(content.es.form.errors.message.required).toBe('Escribe un mensaje.');
    expect(content.es.form.errors.message.too_long).toBe('El mensaje es demasiado largo.');
    expect(content.es.form.submit).toBe('Enviar mensaje');
    expect(content.es.form.sending).toBe('Enviando…');
    expect(content.es.form.success.title).toBe('Mensaje enviado');
    expect(content.es.form.success.body).toBe(
      'Gracias por escribir. Te respondo por correo en cuanto pueda.',
    );
    expect(content.es.form.error.unavailable).toBe(
      'El formulario no está disponible por ahora. Inténtalo más tarde.',
    );
    expect(content.es.form.error.forbidden).toBe(
      'No se pudo verificar el origen de la solicitud. Recarga la página e inténtalo de nuevo.',
    );
    expect(content.es.form.error.rejected).toBe(
      'No se pudo enviar tu mensaje. Revisa los datos e inténtalo de nuevo en un momento.',
    );
    expect(content.es.form.error.network).toBe(
      'No hay conexión con el servidor. Inténtalo de nuevo.',
    );
    expect(content.es.form.verifying).toBe('Verificando que eres una persona…');
    expect(content.es.form.unavailable).toBe(
      'El formulario aún no está disponible. Vuelve pronto.',
    );
  });

  it('EN copy matches the exact specification', () => {
    expect(content.en.pageTitle).toBe('Contact');
    expect(content.en.pageDescription).toBe(
      "An idea, an offer or a question? Write to me and I'll reply by email.",
    );
    expect(content.en.noscript).toBe('This form needs JavaScript to work.');
    expect(content.en.form.labels.name).toBe('Name');
    expect(content.en.form.labels.email).toBe('Email');
    expect(content.en.form.labels.message).toBe('Message');
    expect(content.en.form.placeholders.name).toBe('Your name');
    expect(content.en.form.placeholders.email).toBe('name@example.com');
    expect(content.en.form.placeholders.message).toBe('Tell me how I can help');
    expect(content.en.form.errors.name.required).toBe('Enter your name.');
    expect(content.en.form.errors.name.too_long).toBe('The name is too long.');
    expect(content.en.form.errors.name.invalid).toBe('The name is not valid.');
    expect(content.en.form.errors.email.required).toBe('Enter your email.');
    expect(content.en.form.errors.email.too_long).toBe('The email is too long.');
    expect(content.en.form.errors.email.invalid).toBe('Check the email format.');
    expect(content.en.form.errors.message.required).toBe('Write a message.');
    expect(content.en.form.errors.message.too_long).toBe('The message is too long.');
    expect(content.en.form.submit).toBe('Send message');
    expect(content.en.form.sending).toBe('Sending…');
    expect(content.en.form.success.title).toBe('Message sent');
    expect(content.en.form.success.body).toBe(
      "Thanks for writing. I'll reply by email as soon as I can.",
    );
    expect(content.en.form.error.unavailable).toBe(
      'The form is not available right now. Please try again later.',
    );
    expect(content.en.form.error.forbidden).toBe(
      'The request origin could not be verified. Reload the page and try again.',
    );
    expect(content.en.form.error.rejected).toBe(
      'Your message could not be sent. Check the details and try again in a moment.',
    );
    expect(content.en.form.error.network).toBe('Could not reach the server. Please try again.');
    expect(content.en.form.verifying).toBe('Verifying that you are a person…');
    expect(content.en.form.unavailable).toBe(
      'The form is not available yet. Please check back soon.',
    );
  });

  it('has a LinkedIn invitation in both locales, without an email address', () => {
    expect(content.es.linkedin).toBe('¿Prefieres LinkedIn? Búscame allí.');
    expect(content.en.linkedin).toBe('Prefer LinkedIn? Find me there.');
    expect(content.es.linkedin).not.toContain('@');
    expect(content.en.linkedin).not.toContain('@');
  });
});
