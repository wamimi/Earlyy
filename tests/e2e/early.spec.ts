import { expect, test } from '@playwright/test';
const routes = ['/', '/proof', '/vault', '/campaigns', '/developers'];
test('public pages share the brand and do not advertise an unshipped integration', async ({ page }, testInfo) => {
  for (const route of routes) {
    await page.goto(route);
    await expect(page.locator('.site-header').getByRole('link', { name: 'Early home' })).toBeVisible();
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
  await expect(page.getByRole('heading', { level: 1, name: 'Turn early support into rewards.' })).toBeVisible();
  await page.getByText('Can I use Early today?', { exact: true }).click();
  await expect(page.getByText('Public verification and reward campaigns have not launched.', { exact: false })).toBeVisible();
  await expect(page.locator('#how article')).toHaveCount(3);
});
test('campaigns present reward opportunities without deploying live campaigns', async ({ page }) => {
  await page.goto('/campaigns');
  await expect(page.getByRole('heading', { name: 'Your support opens doors.' })).toBeVisible();
  await expect(page.locator('.cp-opportunity')).toHaveCount(3);
  await expect(page.getByRole('button', { name: /Deploy/ })).toHaveCount(0);
});
test('developer notes preserve the privacy trust boundary', async ({ page }) => {
  await page.goto('/developers');
  await expect(page.getByRole('heading', { name: 'Put participation to work.' })).toBeVisible();
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

test('landing uses actual app imagery, working store links and campaign-defined perks', async ({page}) => {
  await page.goto('/');
  const text = await page.locator('main').innerText();
  expect(text).not.toMatch(/—|Illustrative|Examples only|Campaigns are in development|Our current private prototype|Built for early supporters|Support\. Recognition\. Opportunity\./);
  await expect(page.locator('.el-real-reclaim-phone img')).toHaveAttribute('src', /reclaim-app-store-reference/);
  await expect(page.getByRole('link', {name:'Download Reclaim Verifier on the App Store'})).toHaveAttribute('href','https://apps.apple.com/app/reclaim-verifier/id6503247508');
  await expect(page.getByRole('link', {name:'Get Reclaim Verifier on Google Play'})).toHaveAttribute('href','https://play.google.com/store/apps/details?id=org.reclaimprotocol.app');
  await expect(page.locator('.el-perk-options>div')).toHaveCount(4);
  const footer=page.locator('footer');
  await expect(footer.getByRole('navigation',{name:'Connect'})).toBeAttached();
  await expect(footer.getByRole('heading',{name:'Built with'})).toHaveCount(0);
});
