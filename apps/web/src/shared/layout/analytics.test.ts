import { describe, expect, it, vi } from 'vitest';

import { getBeaconToken, shouldRenderBeacon } from './analytics.ts';

describe('analytics beacon helpers', () => {
  it('shouldRenderBeacon returns false when env var is not set', () => {
    vi.stubEnv('PUBLIC_CF_ANALYTICS_TOKEN', '');
    expect(shouldRenderBeacon()).toBe(false);
  });

  it('shouldRenderBeacon returns false when env var is empty string', () => {
    vi.stubEnv('PUBLIC_CF_ANALYTICS_TOKEN', '');
    expect(shouldRenderBeacon()).toBe(false);
  });

  it('shouldRenderBeacon returns true when env var is a non-empty string', () => {
    vi.stubEnv('PUBLIC_CF_ANALYTICS_TOKEN', 'test-token-123');
    expect(shouldRenderBeacon()).toBe(true);
  });

  it('getBeaconToken returns undefined when env var is not set', () => {
    vi.stubEnv('PUBLIC_CF_ANALYTICS_TOKEN', '');
    expect(getBeaconToken()).toBeUndefined();
  });

  it('getBeaconToken returns the token when env var is a non-empty string', () => {
    vi.stubEnv('PUBLIC_CF_ANALYTICS_TOKEN', 'test-token-123');
    expect(getBeaconToken()).toBe('test-token-123');
  });
});
