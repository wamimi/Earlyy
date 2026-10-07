import {test, expect} from '@playwright/test';

test('developer flow, use cases, documentation and privacy work', async ({page, context}, testInfo) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto('/developers');
  await expect(page.getByRole('heading', {name:'Put participation to work.'})).toBeVisible();
  await page.getByRole('button', {name:'Copy flow blueprint'}).click();
  await expect(page.getByRole('status')).toHaveText('Flow blueprint copied.');
  const clipboard = await page.evaluate(() => navigator.clipboard.readText());
  expect(JSON.parse(clipboard)).toEqual({source:'activity',verify:'proof',check:'eligibility',grant:'access'});
  const ticket = page.getByRole('button', {name:/Ticket access Reward real participation/});
  await ticket.click();
  await expect(ticket).toHaveAttribute('aria-expanded','true');
  await expect(page.locator('#usecase-0')).toContainText('organiser sets availability');
  const loyalty = page.getByRole('button', {name:/Customer loyalty Turn meaningful/});
  await loyalty.click();
  await expect(loyalty).toHaveAttribute('aria-expanded','true');
  await expect(page.locator('#usecase-0')).not.toBeVisible();
  await expect(page.locator('#usecase-1')).toBeVisible();
  await loyalty.click();
  await page.getByRole('link', {name:'Explore docs', exact:true}).click();
  await expect(page.getByRole('heading', {name:'Everything you need to start building.'})).toBeInViewport();
  await expect(page.locator('.dv-doc-resources a')).toHaveCount(4);
  for(const link of await page.locator('.dv-doc-resources a').all()) expect(await link.getAttribute('href')).toMatch(/^\/developers\/docs#/);
  await expect(page.locator('#privacy')).toContainText('Early attestor sees verified plaintext before encryption');
  await page.goto('/developers');
  await page.evaluate(async () => {const images=Array.from(document.images);images.forEach(image=>{image.loading='eager'});await Promise.all(images.map(image=>image.decode().catch(()=>{})));});
  expect(await page.locator('.dv-background').evaluate((image:HTMLImageElement)=>image.naturalWidth)).toBeGreaterThan(0);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  expect(await page.locator('main').innerText()).not.toContain('—');
  await page.evaluate(()=> (document.activeElement as HTMLElement)?.blur());
  await page.addStyleTag({content:'nextjs-portal{display:none!important}'});
  await page.screenshot({path:`/tmp/early-developers-${testInfo.project.name}-full.png`,fullPage:true});
  await page.setViewportSize({width:820,height:1180});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});


test('local developer references open real sections', async ({page}) => {
  await page.goto('/developers');
  await page.locator('.dv-doc-resources').getByRole('link', {name:/Claim schemas/}).click();
  await expect(page).toHaveURL(/developers\/docs#schemas/);
  await expect(page.getByRole('heading', {name:'A record your product can verify.'})).toBeVisible();
  await page.getByRole('navigation', {name:'Reference sections'}).getByRole('link', {name:'Quickstart'}).click();
  await expect(page.getByRole('heading', {name:'Run the implementation locally.'})).toBeInViewport();
  await page.addStyleTag({content:'nextjs-portal{display:none!important}'});
  await page.screenshot({path:`/tmp/early-developer-reference-${test.info().project.name}.png`,fullPage:true});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
