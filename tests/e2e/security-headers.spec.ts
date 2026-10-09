import { test, expect } from '@playwright/test';
test('public pages serve framing protections and hydrate under the CSP', async ({page}) => {
  const violations: string[] = [];
  page.on('console', message => { if (message.type() === 'error' && /Content Security Policy|violates.*directive/.test(message.text())) violations.push(message.text()); });
  for (const path of ['/', '/waitlist', '/brands', '/developers']) {
    const response = await page.goto(path);
    expect(response?.headers()['x-frame-options']).toBe('DENY');
    expect(response?.headers()['x-content-type-options']).toBe('nosniff');
    const csp = response?.headers()['content-security-policy'];
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain('https://auth.privy.io');
    await expect(page.locator('.site-header')).toBeVisible();
  }
  expect(violations).toEqual([]);
});
