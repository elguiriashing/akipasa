import { expect, test } from "@playwright/test";

const email = process.env.AKIPASA_QA_EMAIL;
const password = process.env.AKIPASA_QA_PASSWORD;
const venueId = process.env.AKIPASA_QA_VENUE_ID;

test.describe("disposable authenticated production acceptance", () => {
  test.skip(
    !email || !password || !venueId,
    "Set disposable QA credentials and venue ID to run authenticated checks.",
  );

  test("all account roles and latest business controls render safely", async ({
    page,
  }) => {
    await page.goto("/en/auth?next=/en/account");
    const signIn = page
      .locator("details")
      .filter({ hasText: "Sign in with password" });
    await signIn.locator("summary").click();
    await signIn.locator('input[name="email"]').fill(email!);
    await signIn.locator('input[name="password"]').fill(password!);
    await signIn.getByRole("button", { name: "Sign in" }).click();
    await page.waitForURL("**/en/account");
    await expect(
      page.getByText("Administrator", { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Your next action" }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Passports and rewards" }),
    ).toBeVisible();

    await page.goto("/en/community");
    await expect(
      page.getByRole("button", { name: "Submit for review" }),
    ).toBeVisible();
    await page.goto("/en/business");
    const promotion = page
      .locator("details")
      .filter({ hasText: "Promote an event" });
    await promotion.locator("summary").click();
    await expect(
      page.getByRole("button", { name: "Send request" }),
    ).toBeVisible();

    for (const route of [
      "/en/account",
      "/en/account/profile",
      "/en/account/saved",
      "/en/account/following",
      "/en/account/rewards",
      "/en/account/activity",
      "/en/account/privacy",
      "/en/account/settings",
      "/en/business",
      "/en/staff",
      "/en/staff/moderation",
      "/en/staff/support",
      "/en/staff/catalogue",
      "/en/staff/promotions",
      "/en/staff/audit",
      "/en/admin",
      "/en/admin/users",
      "/en/admin/catalogue",
      "/en/admin/promotions",
      "/en/admin/privacy",
      "/en/admin/settings",
      "/en/admin/passports",
      "/en/admin/audit",
      `/en/business/venue/${venueId}`,
    ]) {
      const response = await page.goto(route, {
        waitUntil: "domcontentloaded",
      });
      expect(response?.status(), route).toBe(200);
      await expect(page.locator("main"), route).toBeVisible();
      const audit = await page.evaluate(() => {
        const visible = (element: HTMLElement) =>
          Boolean(element.offsetWidth || element.offsetHeight);
        const unnamedActions = [
          ...document.querySelectorAll<HTMLElement>("a,button"),
        ]
          .filter(visible)
          .filter(
            (element) =>
              !(
                element.getAttribute("aria-label") ||
                element.getAttribute("title") ||
                element.textContent ||
                ""
              ).trim(),
          ).length;
        const unlabeledFields = [
          ...document.querySelectorAll<HTMLElement>(
            "input:not([type=hidden]),select,textarea",
          ),
        ]
          .filter(visible)
          .filter(
            (element) =>
              !element.getAttribute("aria-label") &&
              !element.closest("label") &&
              !(
                element.id &&
                document.querySelector(`label[for="${element.id}"]`)
              ),
          ).length;
        return {
          unnamedActions,
          unlabeledFields,
          horizontalOverflow:
            document.documentElement.scrollWidth >
            document.documentElement.clientWidth + 1,
        };
      });
      expect(audit, route).toEqual({
        unnamedActions: 0,
        unlabeledFields: 0,
        horizontalOverflow: false,
      });
    }

    await page.goto("/en/admin");
    await expect(
      page.getByRole("heading", { name: "Operations overview" }),
    ).toBeVisible();
    await page.goto("/en/admin/users");
    await expect(
      page.getByRole("searchbox", { name: "Search accounts" }),
    ).toBeVisible();
    expect(await page.locator(".user-search-result").count()).toBe(0);

    await page.goto("/en/admin/settings");
    await expect(
      page.getByRole("heading", { name: "Platform controls" }),
    ).toBeVisible();

    await page.setViewportSize({ width: 360, height: 800 });
    await page.goto("/en/account");
    await expect(
      page.getByRole("button", { name: "AkiPasa account Account menu" }),
    ).toBeVisible();
    await page
      .getByRole("button", { name: "AkiPasa account Account menu" })
      .click();
    await expect(
      page.getByRole("dialog", { name: "Account navigation" }),
    ).toBeVisible();
    expect(
      await page.evaluate(
        () =>
          document.documentElement.scrollWidth >
          document.documentElement.clientWidth + 1,
      ),
    ).toBe(false);
    await page.getByRole("button", { name: "Close" }).click();
    await page.setViewportSize({ width: 1280, height: 900 });

    await page.goto(`/en/business/venue/${venueId}`);
    const occurrences = page
      .locator("details")
      .filter({ hasText: "Manage occurrences" });
    await occurrences.locator("summary").click();
    const images = page
      .locator("details")
      .filter({ hasText: "Authorised images" });
    await images.locator("summary").click();

    await expect(
      page.getByRole("button", { name: "Save occurrence" }),
    ).toBeVisible();
    await expect(
      page.getByLabel("Booking link for this occurrence"),
    ).toBeVisible();
    expect(await page.getByLabel("Spanish alternative text").count()).toBe(2);
    expect(await page.getByLabel("English alternative text").count()).toBe(2);
    expect(await page.getByLabel("Display order").count()).toBe(2);
    await expect(
      page.getByRole("button", { name: "Save image" }),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: "Remove" })).toBeVisible();
  });
});
