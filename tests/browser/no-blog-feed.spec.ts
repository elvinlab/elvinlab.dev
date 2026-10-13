import { expect, test } from '@playwright/test';

import { has } from './helpers/features';

// Without the blog there is no `/rss.xml`: nothing may link to it or advertise it. With the blog on,
// the feed exists and is covered by the notes specs, so this file has nothing to say.
test.skip(has({ flags: ['blog'] }), 'the blog is on: the feed exists');

for (const path of ['/', '/en/', '/me/', '/en/me/']) {
  test(`${path} neither links to nor advertises a feed`, async ({ page }) => {
    await page.goto(path);
    await expect(page.locator('a[href$="/rss.xml"]')).toHaveCount(0);
    await expect(page.locator('link[type="application/rss+xml"]')).toHaveCount(0);
  });
}

test('the feed route does not exist', async ({ request }) => {
  expect((await request.get('/rss.xml')).status()).toBe(404);
});
