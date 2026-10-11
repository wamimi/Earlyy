import { test, expect } from "@playwright/test";
test("rewards entry explains testnet and eligibility requirements without claiming a payout",async({page})=>{
  const errors:string[]=[];page.on("pageerror",error=>errors.push(error.message));
  await page.goto("/rewards");
  await expect(page.getByRole("heading",{name:"Your support has a history."})).toBeVisible();
  await expect(page.getByText(/Test rewards use test MON/)).toBeVisible();
  await expect(page.getByRole("button",{name:"Sign in to continue"})).toBeVisible();
  await expect(page.getByRole("heading",{name:"Benefit activity"})).toHaveCount(0);
  await expect(page.getByText(/Claims require verified qualifying support/)).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
  expect(errors).toEqual([]);
  await page.screenshot({path:`test-results/rewards-${test.info().project.name}.png`,fullPage:true});
});
test("unavailable account services keep sign-in disabled and reward controls inaccessible",async({page})=>{
  await page.route("https://auth.privy.io/**",route=>route.abort());
  await page.goto("/rewards");
  await expect(page.getByRole("button",{name:"Sign in to continue"})).toBeDisabled();
  await expect(page.getByText(/Connecting to account services/)).toBeVisible();
  await expect(page.getByRole("heading",{name:"Benefit activity"})).toHaveCount(0);
});
test("new mutation API rejects untrusted origins and unauthenticated wallets",async({request})=>{
  const data={wallet:"0x0000000000000000000000000000000000000001"};
  const foreign=await request.post("/api/early/list-rules",{headers:{origin:"https://attacker.invalid"},data});expect(foreign.status()).toBe(403);
  const anonymous=await request.post("/api/early/list-rules",{headers:{origin:"http://localhost:3000"},data});expect(anonymous.status()).toBe(401);
});
