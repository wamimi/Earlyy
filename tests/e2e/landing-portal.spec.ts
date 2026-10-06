import { expect, test } from '@playwright/test';

test('image portal fills the viewport uniformly and reverses on scroll', async ({ page }, testInfo) => {
  await page.goto('/');
  const portal = page.getByTestId('image-portal');
  await expect(page.locator('.el-portal')).toHaveAttribute('data-motion', 'full');
  const initial = await portal.boundingBox();
  expect(initial).not.toBeNull();
  await page.screenshot({ path: `/tmp/early-hero-${testInfo.project.name}.png` });
  await page.evaluate(() => {
    const section = document.querySelector('.el-portal') as HTMLElement;
    window.scrollTo({ top: section.getBoundingClientRect().top + window.scrollY + (section.offsetHeight - window.innerHeight) * .98, behavior: 'instant' });
  });
  await expect(page.locator('.el-portal')).toHaveAttribute('data-phase', 'entered');
  await expect.poll(async () => Number(await page.locator('.el-portal-reveal').evaluate(el => getComputedStyle(el).opacity))).toBeGreaterThan(.9);
  await expect(page.locator('.el-mosaic-left')).toHaveCSS('opacity', '0');
  await expect(page.locator('.el-portal-scrim')).toHaveCSS('opacity', '0.8');
  const enlarged = await portal.boundingBox();
  const viewport = page.viewportSize()!;
  expect(enlarged!.width).toBeGreaterThanOrEqual(viewport.width);
  expect(enlarged!.height).toBeGreaterThanOrEqual(viewport.height);
  expect(enlarged!.width / enlarged!.height).toBeCloseTo(initial!.width / initial!.height, 2);
  await page.screenshot({ path: `/tmp/early-portal-${testInfo.project.name}.png` });
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
  await expect(page.locator('.el-portal')).toHaveAttribute('data-phase', 'opening');
  await expect.poll(async () => (await portal.boundingBox())!.width).toBeCloseTo(initial!.width, 0);
  await page.getByRole('button', { name: 'Create proof', exact: true }).click();
  await expect(page.getByLabel('X post URL')).toBeVisible();
});

test('reduced motion keeps the portal static and unpinned', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await expect(page.locator('.el-portal')).toHaveAttribute('data-motion', 'reduced');
  await expect(page.locator('.el-portal-stage')).toHaveCSS('position', 'relative');
  await expect(page.getByTestId('image-portal')).toHaveCSS('transform', 'none');
  await expect(page.getByRole('heading', { name: 'A moment becomes something you can keep.' })).toBeVisible();
});

test('valid X link is carried into the proof workspace', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Create proof', exact: true }).click();
  await page.getByLabel('X post URL').fill('https://x.com/openai/status/1234567890123456789');
  await page.getByRole('button', { name: 'Create an X proof' }).click();
  await expect(page).toHaveURL(/\/proof\?url=https%3A%2F%2Fx.com%2Fopenai%2Fstatus%2F1234567890123456789/);
});
