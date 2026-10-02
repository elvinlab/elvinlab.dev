import { describe, expect, it } from 'vitest';

import { type HomeConfig, resolveHome } from './appearance.ts';

const base = { features: { experiments: true } };
const resolve = (appearance: 'minimal' | 'full', home: HomeConfig = {}, experiments = true) =>
  resolveHome({ appearance, home, features: { experiments } });

describe('resolveHome', () => {
  it('minimal turns the hero pills and the pillars off and keeps the rest (the Now card stays on)', () => {
    expect(resolve('minimal')).toEqual({
      heroPills: false,
      authorCard: true,
      hiringCard: true,
      now: true,
      pillars: false,
      notebookIndex: true,
      experiments: true,
    });
  });

  it('full keeps every section on (exactly the home before the preset existed)', () => {
    expect(resolve('full')).toEqual({
      heroPills: true,
      authorCard: true,
      hiringCard: true,
      now: true,
      pillars: true,
      notebookIndex: true,
      experiments: true,
    });
  });

  it.each([
    'heroPills',
    'authorCard',
    'hiringCard',
    'now',
    'pillars',
    'notebookIndex',
    'experiments',
  ] as const)('an override of %s wins over the preset in both directions', (section) => {
    expect(resolve('minimal', { [section]: true })[section]).toBe(true);
    expect(resolve('minimal', { [section]: false })[section]).toBe(false);
    expect(resolve('full', { [section]: true })[section]).toBe(true);
    expect(resolve('full', { [section]: false })[section]).toBe(false);
  });

  it('has no labLog section any more: it was renamed to now', () => {
    expect(resolve('minimal')).not.toHaveProperty('labLog');
    expect(resolve('full')).not.toHaveProperty('labLog');
  });

  it('home.now false hides the Now card under both presets', () => {
    expect(resolve('minimal', { now: false }).now).toBe(false);
    expect(resolve('full', { now: false }).now).toBe(false);
  });

  it('an override only changes its own section', () => {
    expect(resolve('minimal', { pillars: true })).toEqual({ ...resolve('minimal'), pillars: true });
  });

  it('experiments also needs features.experiments, even when the home asks for them', () => {
    expect(resolve('full', {}, false).experiments).toBe(false);
    expect(resolve('minimal', { experiments: true }, false).experiments).toBe(false);
    expect(resolve('minimal', { experiments: true }, true).experiments).toBe(true);
  });

  it('reads only the config it is given', () => {
    expect(resolveHome({ appearance: 'full', home: {}, ...base }).heroPills).toBe(true);
  });
});
