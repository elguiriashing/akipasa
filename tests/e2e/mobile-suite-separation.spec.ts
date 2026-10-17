import { expect, test } from "@playwright/test";

test("mobile AkiSuite launcher and AkiPasa More menu are independent", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/en");

  const suite = page.locator(".app-suite-mobile-menu");
  const trigger = suite.locator("summary");
  const search = page.getByRole("button", { name: "Search AkiPasa" });
  await expect(trigger).toBeVisible();
  await expect(search).toBeVisible();

  const suiteRect = await trigger.boundingBox();
  const searchRect = await search.boundingBox();
  expect(suiteRect).not.toBeNull();
  expect(searchRect).not.toBeNull();
  expect(suiteRect!.x + suiteRect!.width).toBeLessThanOrEqual(
    searchRect!.x + 1,
  );

  await trigger.click();
  await expect(suite).toHaveAttribute("open", "");
  const apps = suite.locator(".app-suite-mobile-popover");
  for (const name of ["AkiDuermo", "AkiCoches", "AkiHQ", "AkiBusiness"]) {
    await expect(apps.getByRole("link", { name })).toBeVisible();
  }
  await expect(apps.getByRole("link", { name: "Passports" })).toHaveCount(0);
  await expect(apps.getByRole("link", { name: "Membership" })).toHaveCount(0);

  await page.getByRole("button", { name: "More options" }).click();
  await expect(suite).not.toHaveAttribute("open", "");
  const internal = page.getByRole("dialog", { name: "More options" });
  await expect(internal).toBeVisible();
  await expect(internal.getByRole("link", { name: "Passports" })).toBeVisible();
  await expect(internal.getByRole("link", { name: "Membership" })).toBeVisible();
  await expect(internal.locator(".app-suite-links")).toHaveCount(0);
  await expect(internal.getByRole("link", { name: "AkiCoches" })).toHaveCount(0);
});
