import { describe, expect, it } from 'vitest';

import { constantTimeEqual } from './constant-time.ts';

describe('constantTimeEqual', () => {
  it('accepts equal strings and rejects different ones of any length', async () => {
    await expect(constantTimeEqual('s3cret-value', 's3cret-value')).resolves.toBe(true);
    await expect(constantTimeEqual('s3cret-value', 's3cret-valuf')).resolves.toBe(false);
    await expect(constantTimeEqual('short', 'a-much-longer-value')).resolves.toBe(false);
    await expect(constantTimeEqual('', 'x')).resolves.toBe(false);
  });

  it('treats two empty strings as equal only at the helper level', async () => {
    await expect(constantTimeEqual('', '')).resolves.toBe(true);
  });
});
