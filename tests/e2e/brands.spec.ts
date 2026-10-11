import { test, expect } from '@playwright/test';

test('brand campaign preview links to the available workspace', async ({ page }, testInfo) => {
  await page.goto('/brands');
  await expect(page.getByRole('heading', {name:'Reward the people behind your growth.'})).toBeVisible();
  await expect(page.locator('.br-reward-descriptions h3')).toHaveCount(4);
  await page.getByRole('radio', {name:'Stream or listen'}).check();
  await page.getByLabel('Support before').fill('2026-11-01');
  await page.getByRole('radio', {name:'Products', exact:true}).check();
  await expect(page.getByRole('radio', {name:'Ship a product'})).toBeChecked();
  await expect(page.getByRole('link', {name:'Open campaign workspace'})).toHaveAttribute('href', '/rewards');
  await expect(page.getByRole('link', {name:'Campaign workspace'}).first()).toHaveAttribute('href', '/rewards');
  await page.getByRole('radio', {name:'Cash rewards', exact:true}).check();
  await expect(page.getByRole('radio', {name:'Send a payout'})).toBeChecked();
  await page.getByRole('radio', {name:'Tickets', exact:true}).check();
  await page.getByRole('radio', {name:'Make a purchase'}).check();
  await page.getByLabel('Support before').fill('');
  await page.evaluate(async () => { const images = Array.from(document.images).filter(image => image.getClientRects().length > 0); images.forEach(image => { image.loading = "eager"; }); await Promise.all(images.map(image => image.decode().catch(() => {}))); });
  expect(await page.locator('.br-hero-image').evaluate((image:HTMLImageElement) => image.naturalWidth)).toBeGreaterThan(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(await page.locator('main').innerText()).not.toContain('—');
  await page.evaluate(() => (document.activeElement as HTMLElement)?.blur());
  await page.addStyleTag({content:'nextjs-portal {display:none!important}'});
  await page.screenshot({path:`/tmp/early-brands-${testInfo.project.name}-full.png`, fullPage:true});
  await page.setViewportSize({width:820,height:1180});
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
