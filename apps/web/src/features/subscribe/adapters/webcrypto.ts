import type { TokenService } from '@/features/subscribe/ports.ts';

const encoder = new TextEncoder();

const toBase64Url = (bytes: Uint8Array): string => {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '');
};

const fromBase64Url = (value: string): Uint8Array<ArrayBuffer> | null => {
  if (!/^[A-Za-z0-9_-]+$/.test(value)) return null;
  try {
    const padded = value.replaceAll('-', '+').replaceAll('_', '/');
    const binary = atob(padded.padEnd(Math.ceil(padded.length / 4) * 4, '='));
    return Uint8Array.from(binary, (char) => char.charCodeAt(0));
  } catch {
    return null;
  }
};

const toHex = (bytes: Uint8Array): string =>
  [...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join('');

/** WebCrypto implementation (Workers and Node): 32-byte tokens, SHA-256 hashes, HMAC-SHA-256 signatures. */
export function createWebCryptoTokens(secret: string): TokenService {
  const key = crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify'],
  );
  return {
    randomToken: () => toBase64Url(crypto.getRandomValues(new Uint8Array(32))),
    randomId: () => toHex(crypto.getRandomValues(new Uint8Array(16))),
    async hash(value) {
      return toHex(new Uint8Array(await crypto.subtle.digest('SHA-256', encoder.encode(value))));
    },
    async sign(value) {
      return toBase64Url(
        new Uint8Array(await crypto.subtle.sign('HMAC', await key, encoder.encode(value))),
      );
    },
    async verify(value, signature) {
      const bytes = fromBase64Url(signature);
      if (!bytes) return false;
      // `subtle.verify` compares in constant time.
      return crypto.subtle.verify('HMAC', await key, bytes, encoder.encode(value));
    },
  };
}
