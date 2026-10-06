import { expect, test } from '@playwright/test';
const routes = ['/', '/proof', '/vault', '/campaigns', '/developers'];
test('public pages share the brand and do not advertise an unshipped integration', async ({ page }, testInfo) => {
  for (const route of routes) {
    await page.goto(route);
    await expect(page.getByRole('link', { name: 'Early home' })).toBeVisible();
    const body = await page.locator('main').innerText();
    expect(body).not.toMatch(/Live proof|Start with an X post|Base Sepolia \+ Zama Sepolia|first live provider/);
    const dimensions = await page.evaluate(() => ({ width: innerWidth, document: document.documentElement.scrollWidth }));
    expect(dimensions.document).toBeLessThanOrEqual(dimensions.width);
    const font = await page.locator('main').evaluate(el => getComputedStyle(el).fontFamily);
    expect(font).toContain('EarlyJakarta');
    if (testInfo.project.name === 'desktop' && ['/campaigns', '/developers'].includes(route)) await page.screenshot({ path: `/tmp/early${route.replace('/', '-')}.png` });
  }
});
test('landing explains recognition and launch status', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1, name: 'You helped it grow. You should be part of it.' })).toBeVisible();
  await page.getByText('Can I use Early today?', { exact: true }).click();
  await expect(page.getByText('Public verification and reward campaigns have not launched.', { exact: false })).toBeVisible();
  await expect(page.locator('#how article')).toHaveCount(3);
});
test('campaigns describe illustrative pilots rather than deploy live campaigns', async ({ page }) => {
  await page.goto('/campaigns');
  await expect(page.getByRole('heading', { name: 'Remember who helped you get here.' })).toBeVisible();
  await expect(page.getByText('Illustrative campaign · not currently available')).toHaveCount(3);
  await expect(page.getByRole('button', { name: /Deploy/ })).toHaveCount(0);
});
test('developer notes preserve the privacy trust boundary', async ({ page }) => {
  await page.goto('/developers');
  await expect(page.getByRole('heading', { name: 'Build for the people who show up.' })).toBeVisible();
  await expect(page.getByText('Early attestor sees verified plaintext', { exact: false })).toBeVisible();
});
test('mobile menu exposes campaigns and developers', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile', 'Mobile navigation only');
  await page.goto('/');
  await page.getByRole('button', { name: 'Open navigation' }).click();
  const nav = page.getByRole('navigation', { name: 'Main navigation' });
  await expect(nav.getByRole('link', { name: 'Campaigns' })).toBeVisible();
  await expect(nav.getByRole('link', { name: 'Developers' })).toBeVisible();
});
