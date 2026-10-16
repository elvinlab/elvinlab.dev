import { expect, test } from '@playwright/test';

/**
 * Installability (owner-approved 2026-10-16): a web app manifest plus an `apple-touch-icon`,
 * without a service worker. The manifest answers as JSON with the fields Chrome requires for
 * installability, the PNG icons carry their exact dimensions, and every page declares both links.
 */

const MANIFEST_PATH = '/manifest.webmanifest';

/** PNG: 8-byte signature, then IHDR with width (bytes 16-19) and height (20-23), big-endian. */
function pngSize(body: Buffer): { width: number; height: number } {
  return { width: body.readUInt32BE(16), height: body.readUInt32BE(20) };
}

test.beforeEach(({ browserName: _browserName }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium-1280', 'the manifest does not depend on width');
});

test(`${MANIFEST_PATH} answers with valid installability JSON`, async ({ request }) => {
  const response = await request.get(MANIFEST_PATH);
  expect(response.status()).toBe(200);
  expect(response.headers()['content-type']).toMatch(/json/);

  const manifest = (await response.json()) as {
    name?: string;
    short_name?: string;
    start_url?: string;
    display?: string;
    theme_color?: string;
    background_color?: string;
    icons?: { src: string; sizes: string; type: string }[];
  };
  expect(manifest.name).toBeTruthy();
  expect(manifest.short_name).toBeTruthy();
  expect(manifest.start_url).toBe('/');
  expect(manifest.display).toBe('standalone');
  expect(manifest.theme_color).toMatch(/^#[0-9a-f]{6}$/i);
  expect(manifest.background_color).toMatch(/^#[0-9a-f]{6}$/i);
  expect(manifest.icons?.map((icon) => icon.sizes)).toEqual(
    expect.arrayContaining(['192x192', '512x512']),
  );
});

for (const { path, size } of [
  { path: '/apple-touch-icon.png', size: 180 },
  { path: '/icon-192.png', size: 192 },
  { path: '/icon-512.png', size: 512 },
] as const) {
  test(`${path} answers with a ${size}px PNG`, async ({ request }) => {
    const response = await request.get(path);
    expect(response.status()).toBe(200);
    expect(response.headers()['content-type']).toMatch(/image\/png/);

    const body = await response.body();
    expect([...body.subarray(0, 8)]).toEqual([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    expect(pngSize(body)).toEqual({ width: size, height: size });
  });
}

for (const path of ['/', '/en/', '/me/', '/notes/']) {
  test(`${path} declares the manifest and the apple-touch icon`, async ({ page }) => {
    await page.goto(path);
    await expect(
      page.locator('head link[rel="manifest"][href="/manifest.webmanifest"]'),
    ).toHaveCount(1);
    await expect(
      page.locator('head link[rel="apple-touch-icon"][href="/apple-touch-icon.png"]'),
    ).toHaveCount(1);
  });
}
