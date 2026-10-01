import type { ContactFormStrings } from './client/form.ts';

export type ContactContent = {
  pageTitle: string;
  pageDescription: string;
  intro: string;
  noscript: string;
  form: ContactFormStrings;
};

export function buildContactContent(): Record<'es' | 'en', ContactContent> {
  return {
    es: {
      pageTitle: 'Contacto',
      pageDescription: 'Escríbeme un mensaje y te respondo por correo.',
      intro: '¿Una idea, una oferta o una pregunta? Escríbeme y te respondo por correo.',
      noscript: 'Este formulario necesita JavaScript para funcionar.',
      form: {
        labels: {
          name: 'Nombre',
          email: 'Correo electrónico',
          message: 'Mensaje',
        },
        placeholders: {
          name: 'Tu nombre',
          email: 'nombre@ejemplo.com',
          message: 'Cuéntame en qué puedo ayudarte',
        },
        errors: {
          name: {
            required: 'Escribe tu nombre.',
            too_long: 'El nombre es demasiado largo.',
            invalid: 'El nombre no es válido.',
          },
          email: {
            required: 'Escribe tu correo.',
            too_long: 'El correo es demasiado largo.',
            invalid: 'Revisa el formato del correo.',
          },
          message: {
            required: 'Escribe un mensaje.',
            too_long: 'El mensaje es demasiado largo.',
          },
        },
        submit: 'Enviar mensaje',
        sending: 'Enviando…',
        success: {
          title: 'Mensaje enviado',
          body: 'Gracias por escribir. Te respondo por correo en cuanto pueda.',
        },
        error: {
          unavailable: 'El formulario no está disponible por ahora. Inténtalo más tarde.',
          forbidden:
            'No se pudo verificar el origen de la solicitud. Recarga la página e inténtalo de nuevo.',
          rejected:
            'No se pudo enviar tu mensaje. Revisa los datos e inténtalo de nuevo en un momento.',
          network: 'No hay conexión con el servidor. Inténtalo de nuevo.',
        },
        verifying: 'Verificando que eres una persona…',
        unavailable: 'El formulario aún no está disponible. Vuelve pronto.',
      },
    },
    en: {
      pageTitle: 'Contact',
      pageDescription: "Send me a message and I'll reply by email.",
      intro: "An idea, an offer or a question? Write to me and I'll reply by email.",
      noscript: 'This form needs JavaScript to work.',
      form: {
        labels: {
          name: 'Name',
          email: 'Email',
          message: 'Message',
        },
        placeholders: {
          name: 'Your name',
          email: 'name@example.com',
          message: 'Tell me how I can help',
        },
        errors: {
          name: {
            required: 'Enter your name.',
            too_long: 'The name is too long.',
            invalid: 'The name is not valid.',
          },
          email: {
            required: 'Enter your email.',
            too_long: 'The email is too long.',
            invalid: 'Check the email format.',
          },
          message: {
            required: 'Write a message.',
            too_long: 'The message is too long.',
          },
        },
        submit: 'Send message',
        sending: 'Sending…',
        success: {
          title: 'Message sent',
          body: "Thanks for writing. I'll reply by email as soon as I can.",
        },
        error: {
          unavailable: 'The form is not available right now. Please try again later.',
          forbidden: 'The request origin could not be verified. Reload the page and try again.',
          rejected: 'Your message could not be sent. Check the details and try again in a moment.',
          network: 'Could not reach the server. Please try again.',
        },
        verifying: 'Verifying that you are a person…',
        unavailable: 'The form is not available yet. Please check back soon.',
      },
    },
  };
}
