/**
 * Public API of the subscribe feature (server side). Client code must not import this barrel.
 */

export { isSubscribeActive } from './availability.ts';
export { default as SubscribeResultPage } from './components/SubscribeResultPage.astro';
export { SUBSCRIBE_PATHS, SUBSCRIBE_POLICY } from './config.ts';
export {
  confirmConfiguredSubscription,
  sendNoteConfigured,
  submitConfiguredSubscribe,
  unsubscribeConfigured,
} from './runtime.ts';
export type {
  ConfirmResult,
  NoteToSend,
  SendNoteResult,
  SubscribeResult,
  UnsubscribeResult,
} from './subscribe.ts';
