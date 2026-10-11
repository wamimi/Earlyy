import { test, expect } from '@playwright/test';

test('old waitlist links open the app without collecting a signup', async ({page}) => {
  await page.goto('/waitlist?interest=brand');
  await expect(page).toHaveURL('/dashboard');
  await expect(page.getByRole('heading', {name:'Find your first campaign.'})).toBeVisible();
  await expect(page.getByRole('button', {name:'Join the waitlist'})).toHaveCount(0);
});

test('old developer waitlist links open the available docs', async ({page}) => {
  await page.goto('/waitlist?interest=developer');
  await expect(page).toHaveURL('/developers/docs');
  await expect(page.getByRole('heading', {name:'Build with verified support.'})).toBeVisible();
});
