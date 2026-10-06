/**
 * Public API of the subscribe feature (server side). Client code must not import this barrel.
 */

export { isSubscribeActive } from './availability.ts';
export { default as SubscribeLanding } from './components/SubscribeLanding.astro';
export { default as SubscribeResultPage } from './components/SubscribeResultPage.astro';
export { SUBSCRIBE_PATHS, SUBSCRIBE_POLICY } from './config.ts';
export { noteToSend } from './note-to-send.ts';
export type { NotifyRequest, NotifyResponse } from './notify.ts';
export type { EmailSite } from './ports.ts';
export {
  confirmConfiguredSubscription,
  notifyConfigured,
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
