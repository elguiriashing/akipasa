import { mkdirSync, writeFileSync } from "node:fs";
import { expect, test } from "@playwright/test";

for (const locale of ["en", "es"]) {
  test(`${locale} consumer Account routes retain their real guest boundary`, async ({
    page,
    baseURL,
  }) => {
    expect(baseURL).toBeTruthy();
    const candidateOrigin = new URL(baseURL!).origin;
    const observations = [];
    await page.route("**/*", (route) =>
      ["GET", "HEAD"].includes(route.request().method())
        ? route.continue()
        : route.abort("blockedbyclient"),
    );
    for (const section of [
      "",
      "saved",
      "following",
      "bookings",
      "activity",
      "premium",
      "profile",
      "settings",
      "privacy",
      "subscription",
    ]) {
      const route = `/${locale}/account${section ? `/${section}` : ""}`;
      const response = await page.goto(route);
      expect(response?.status()).toBe(200);
      await expect(page).toHaveURL(new RegExp(`/${locale}/auth(?:[?#]|$)`));
      await expect(page.locator(".pasa-consumer-account")).toHaveCount(0);
      await expect(
        page.locator('input[type="password"]').first(),
      ).toBeVisible();
      expect(new URL(page.url()).origin).toBe(candidateOrigin);
      expect(new URL(response!.url()).origin).toBe(candidateOrigin);
      observations.push({
        route,
        finalStatus: response?.status(),
        finalPath: new URL(page.url()).pathname,
        remainedOnCandidateOrigin: true,
        privateWorkspaceRendered: false,
      });
    }
    mkdirSync("test-results/account-release-guest-boundaries", {
      recursive: true,
    });
    writeFileSync(
      `test-results/account-release-guest-boundaries/${locale}.json`,
      JSON.stringify(
        {
          locale,
          observations,
          scope:
            "Actual anonymous Next route guards with disposable public fixture; no real authentication, private mutation or production customer operation.",
        },
        null,
        2,
      ),
    );
  });
}
