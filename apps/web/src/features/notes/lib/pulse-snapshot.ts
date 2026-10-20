import type { PulseSignals } from './pulse.ts';

/**
 * Interaction per note slug, frozen at build time so the block costs no request, no script and no
 * D1 read when a visitor opens the page. Empty on purpose: with no entries the "most active"
 * block renders nothing, not even its CSS, which is what a fork without analytics or marks gets.
 */
export const PULSE_SNAPSHOT: Readonly<Record<string, PulseSignals>> = {};
