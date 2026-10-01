/**
 * Public API of the contact feature.
 * Client code (the island) must import only client/* and config.ts, never this barrel.
 */

export { default as ContactPage } from './components/ContactPage.astro';
export {
  buildContactContent,
  type ContactContent,
} from './content.ts';
export { submitConfiguredContact } from './runtime.ts';
