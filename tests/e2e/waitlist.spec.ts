import { test, expect } from '@playwright/test';
test('waitlist preserves interest, confirms saved signup, and fits mobile', async ({page}, testInfo) => {
  await page.route('**/api/waitlist', async route => {expect(route.request().postDataJSON()).toMatchObject({email:'fan@example.com',interest:'brand',consent:true});await route.fulfill({json:{success:true}});});
  await page.goto('/waitlist?interest=brand');
  await expect(page.getByRole('combobox')).toHaveValue('brand');
  await expect(page.locator('.cp-footer-brand a')).toHaveCSS('color', 'rgb(255, 248, 238)');
  await page.getByLabel('Email address').fill('fan@example.com');
  await page.getByRole('checkbox').check();
  await page.getByRole('button', {name:'Join the waitlist'}).click();
  await expect(page.getByRole('heading', {name:'You’re on the list.'})).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.screenshot({path:`/tmp/early-waitlist-${testInfo.project.name}.png`,fullPage:true});
});
test('failed signup remains retryable without claiming success', async ({page}) => {
  await page.route('**/api/waitlist', route => route.fulfill({status:503,json:{error:'Signup is temporarily unavailable.'}}));
  await page.goto('/waitlist'); await page.getByLabel('Email address').fill('fan@example.com'); await page.getByRole('checkbox').check();
  await page.getByRole('button', {name:'Join the waitlist'}).click();
  await expect(page.getByRole('status')).toContainText('temporarily unavailable');
  await expect(page.getByRole('button', {name:'Join the waitlist'})).toBeEnabled();
});
