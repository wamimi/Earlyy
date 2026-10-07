import { expect, test, type Page } from '@playwright/test';

async function progress(page: Page, id: string, value: number) {
  await page.evaluate(({id, value}) => {
    const section = document.getElementById(id)!;
    window.scrollTo({ top: section.offsetTop + (section.offsetHeight - innerHeight) * value, behavior: 'instant' });
  }, { id, value });
}

test('music portal expands uniformly, returns, and chapters advance and reverse', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'Mobile uses readable vertical chapters');
  await page.goto('/');
  await expect(page.locator('#culture')).toHaveAttribute('data-motion', 'full');
  await progress(page, 'culture', 0);
  const portal = page.getByTestId('image-portal');
  const initial = (await portal.boundingBox())!;
  await page.screenshot({ path: '/tmp/early-music-desktop.png' });
  await progress(page, 'culture', .16);
  await expect.poll(async () => (await portal.boundingBox())!.width).toBeGreaterThan(1440);
  const full = (await portal.boundingBox())!;
  expect(full.height).toBeGreaterThanOrEqual(1000);
  expect(full.width / full.height).toBeCloseTo(initial.width / initial.height, 2);
  expect(full.x).toBeLessThanOrEqual(0);
  expect(full.y).toBeLessThanOrEqual(0);
  expect(full.x + full.width).toBeGreaterThanOrEqual(1440);
  expect(full.y + full.height).toBeGreaterThanOrEqual(1000);
  await page.screenshot({ path: '/tmp/early-portal-desktop.png' });
  for (const [index, p] of [[1,.52],[2,.73],[3,.94]]) {
    await progress(page, 'culture', p);
    await expect(page.locator('#culture')).toHaveAttribute('data-active', String(index));
    const box = (await page.locator(`#culture-${index}`).boundingBox())!;
    expect(Math.abs(box.x + box.width / 2 - 720)).toBeLessThan(3);
    await expect(page.locator(`#culture-${index}`)).not.toHaveAttribute('inert', '');
  }
  await progress(page, 'culture', 0);
  await expect(page.locator('#culture')).toHaveAttribute('data-active', '0');
  await expect.poll(async () => (await portal.boundingBox())!.width).toBeCloseTo(initial.width, 0);
});

test('how it works centres each step and releases vertical scrolling', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'Mobile uses vertical steps');
  await page.goto('/');
  await expect(page.locator('#how')).toHaveAttribute('data-motion', 'full');
  for (const [index,p] of [[0,.06],[1,.5],[2,.94]]) {
    await progress(page,'how',p);
    await expect(page.locator('#how')).toHaveAttribute('data-active',String(index));
    await expect.poll(async () => {
      const box = (await page.locator(`#how-${index}`).boundingBox())!;
      return Math.abs(box.x + box.width / 2 - 720);
    }).toBeLessThan(3);
    if (index === 0) await expect.poll(() => page.locator('.el-real-reclaim-phone img').evaluate((el: HTMLImageElement) => el.complete && el.naturalWidth > 0), { timeout: 15000 }).toBeTruthy();
    await page.screenshot({ path: `/tmp/early-how-${index}-desktop.png` });
  }
  await page.locator('#privacy').scrollIntoViewIfNeeded();
  await expect(page.getByRole('heading',{name:'Your proof. Your privacy.'})).toBeVisible();
});

test('reduced motion removes pinning and preserves every chapter and step', async ({ page }) => {
  const hydrationErrors: string[] = [];
  page.on('console', message => { if (message.type() === 'error' && /hydration|hydrated/i.test(message.text())) hydrationErrors.push(message.text()); });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  for (const id of ['culture','how']) {
    await expect(page.locator(`#${id}`)).toHaveAttribute('data-motion','reduced');
    await expect(page.locator(`#${id} .el-scroll-stage`)).toHaveCSS('position','relative');
    await expect(page.locator(`#${id} .el-scroll-panel[inert]`)).toHaveCount(0);
  }
  await expect(page.getByTestId('image-portal')).toHaveCSS('transform','none');
  await page.getByRole('heading',{name:'First customers. Lasting loyalty.'}).scrollIntoViewIfNeeded();
  await expect(page.getByRole('heading',{name:'First customers. Lasting loyalty.'})).toBeVisible();
  expect(hydrationErrors).toEqual([]);
});

test('mobile chapters remain readable and all images load', async ({ page }, testInfo) => {
  await page.goto('/');
  await expect.poll(() => page.locator('.el-atmosphere').evaluate((el: HTMLImageElement) => el.complete && el.naturalWidth > 0)).toBeTruthy();
  await page.screenshot({path:`/tmp/early-hero-${testInfo.project.name}.png`});
  if (testInfo.project.name === 'mobile') {
    await expect(page.locator('#culture')).toHaveAttribute('data-motion','reduced');
    await expect(page.locator('#how')).toHaveAttribute('data-motion','reduced');
    await page.getByRole('heading',{name:'Your day-one support. Your backstage moment.'}).scrollIntoViewIfNeeded();
    await page.screenshot({path:'/tmp/early-music-mobile.png'});
  }
  await page.locator('.el-closing').scrollIntoViewIfNeeded();
  await expect.poll(() => page.locator('.el-closing img').evaluate((el: HTMLImageElement) => el.complete && el.naturalWidth > 0)).toBeTruthy();
  await page.screenshot({path:`/tmp/early-closing-${testInfo.project.name}.png`});
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
});

 test('panel centring survives a tablet-sized desktop resize', async ({page}, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'Desktop responsive geometry');
  await page.setViewportSize({width:900,height:900});
  await page.goto('/');
  await expect(page.locator('#culture')).toHaveAttribute('data-motion','full');
  await progress(page,'culture',.94);
  await expect.poll(async () => { const box=(await page.locator('#culture-3').boundingBox())!; return Math.abs(box.x + box.width/2 - 450); }).toBeLessThan(3);
});
