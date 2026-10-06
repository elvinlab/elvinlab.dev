import { describe, expect, it } from 'vitest';

import { createWebCryptoTokens } from './webcrypto.ts';

const SECRET = 'a-test-secret-with-at-least-32-characters';

describe('WebCrypto tokens', () => {
  const tokens = createWebCryptoTokens(SECRET);

  it('makes unguessable URL-safe tokens and hex ids', () => {
    const token = tokens.randomToken();
    expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(tokens.randomToken()).not.toBe(token);
    expect(tokens.randomId()).toMatch(/^[0-9a-f]{32}$/);
  });

  it('hashes with SHA-256 hex', async () => {
    await expect(tokens.hash('abc')).resolves.toBe(
      'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
    );
  });

  it('verifies its own signature and rejects forged, truncated and malformed ones', async () => {
    const signature = await tokens.sign('subscriber-id');
    await expect(tokens.verify('subscriber-id', signature)).resolves.toBe(true);
    await expect(tokens.verify('other-id', signature)).resolves.toBe(false);
    await expect(tokens.verify('subscriber-id', signature.slice(0, -2))).resolves.toBe(false);
    await expect(tokens.verify('subscriber-id', 'not base64 !!')).resolves.toBe(false);
    await expect(tokens.verify('subscriber-id', '')).resolves.toBe(false);
  });

  it('does not verify a signature made with another secret', async () => {
    const other = createWebCryptoTokens('another-secret-with-at-least-32-chars!!');
    await expect(tokens.verify('id', await other.sign('id'))).resolves.toBe(false);
  });
});
