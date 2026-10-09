import { expect, test } from "@playwright/test";

test("fan navigation preserves private, signed-out states", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.goto("/dashboard");
  await expect(page.getByRole("heading", { name: "Find your first campaign." })).toBeVisible();
  await page.getByRole("button", { name: "My support", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Your archive is private." })).toBeVisible();
  await page.getByRole("button", { name: "Account", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Your account." })).toBeVisible();
  await page.getByRole("link", { name: "Discover", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Find your first campaign." })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(errors).toEqual([]);
});

test("campaign deep links require sign-in and retain an accessible main landmark", async ({ page }) => {
  await page.goto("/dashboard/campaigns/unknown-campaign");
  await expect(page.getByRole("main")).toBeVisible();
  await expect(page.getByRole("heading", { name: "See what could qualify." })).toBeVisible();
  await expect(page.getByRole("button", { name: "Sign in to continue" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Skip to content" })).toHaveAttribute("href", "#campaign-content");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole("link", { name: "Close campaign details" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
});
