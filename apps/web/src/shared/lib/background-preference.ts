export type BackgroundChoice = 'galaxy' | 'cursor-waves' | 'off';

const CHOICES: readonly BackgroundChoice[] = ['galaxy', 'cursor-waves', 'off'];

/** localStorage key for the visitor's background choice; unprefixed, like `THEME_STORAGE_KEY`. */
export const BACKGROUND_STORAGE_KEY = 'background';

/** The owner's configured default, as a single choice (first effect enabled, else 'off'). */
export function ownerDefaultChoice(background: {
  galaxy: boolean;
  cursorWaves: boolean;
}): BackgroundChoice {
  if (background.galaxy) return 'galaxy';
  if (background.cursorWaves) return 'cursor-waves';
  return 'off';
}

/** A stored value if it's a real choice, otherwise the owner default (missing/corrupt storage). */
export function resolveBackgroundChoice(
  stored: string | null,
  ownerDefault: BackgroundChoice,
): BackgroundChoice {
  return (CHOICES as readonly string[]).includes(stored ?? '')
    ? (stored as BackgroundChoice)
    : ownerDefault;
}

/** Cycles galaxy -> cursor-waves -> off -> galaxy. */
export function nextBackgroundChoice(current: BackgroundChoice): BackgroundChoice {
  const index = CHOICES.indexOf(current);
  return CHOICES[(index + 1) % CHOICES.length] as BackgroundChoice;
}
