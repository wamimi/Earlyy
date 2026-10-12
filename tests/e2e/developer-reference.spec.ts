import { expect, test } from "@playwright/test";

test("developer reference states its boundaries and requires login before live requests",async({page})=>{
  const errors:string[]=[];const mutations:string[]=[];
  page.on("pageerror",e=>errors.push(e.message));
  page.on("request",r=>{if(r.url().includes("/api/early/") && r.method()==="POST")mutations.push(r.url());});
  await page.goto("/developers/docs");
  await expect(page.getByRole("heading",{name:"Build with verified support."})).toBeVisible();
  await expect(page.getByText(/Public API keys, external-app tenancy/)).toBeVisible();
  await page.getByRole("link",{name:"Live example",exact:true}).click();
  await expect(page.getByRole("button",{name:"Sign in to try the example"})).toBeVisible();
  expect(mutations).toEqual([]);expect(errors).toEqual([]);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.screenshot({path:`test-results/developer-reference-${test.info().project.name}.png`,fullPage:true});
});
