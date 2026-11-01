import { expect, test } from "@playwright/test";

// The one canonical consumer dock is reused across these independent public
// routes. Signed-in Profile uses the same AppShell renderer and is covered by
// its existing account acceptance tests; guests must still be sent to Auth.
for (const locale of ["en", "es"] as const) {
  for (const theme of ["light", "dark"] as const) {
    test(`${locale} shared consumer dock follows ${theme} theme across routes and rotation`, async ({
      page,
    }) => {
      await page.setViewportSize({ width: 390, height: 844 });
      await page.addInitScript((value) => {
        localStorage.setItem("akipasa.theme", value);
        document.cookie = "ak_consent_version=2; Path=/";
      }, theme);

      for (const destination of ["", "/map", "/check-in", "/community"]) {
        const response = await page.goto(`/${locale}${destination}`, {
          waitUntil: "domcontentloaded",
        });
        expect(response?.status()).toBe(200);
        const dock = page.locator("nav.app-bottom-nav.pasa-dock");
        await expect(dock).toBeVisible();
        await expect(dock).toHaveCSS(
          "background-color",
          theme === "light"
            ? "rgb(250, 247, 242)"
            : "rgba(7, 9, 11, 0.97)",
        );
        await expect(dock.getByRole("link")).toHaveCount(5);
        const activeHref =
          destination === "" ? `/${locale}` : `/${locale}${destination}`;
        await expect(dock.locator('a[aria-current="page"]')).toHaveAttribute(
          "href",
          activeHref,
        );
        await expect(
          dock.getByRole("link", { name: "Check-in" }).locator("svg"),
        ).toHaveCSS("background-color", "rgb(242, 107, 29)");
        const cameraLink = dock.getByRole("link", { name: "Check-in" });
        expect(
          await cameraLink.evaluate((node) => node.getBoundingClientRect().height),
        ).toBeGreaterThanOrEqual(44);
      }

      const dock = page.locator("nav.app-bottom-nav.pasa-dock");
      await page.setViewportSize({ width: 820, height: 390 });
      await expect(dock).toBeVisible();
      await expect(dock).toHaveCSS(
        "background-color",
        theme === "light"
          ? "rgb(250, 247, 242)"
          : "rgba(7, 9, 11, 0.97)",
      );
      await page.setViewportSize({ width: 900, height: 540 });
      await expect(dock).toBeHidden();
      await expect(page.locator(".suite-discovery-nav")).toBeVisible();
      await page.setViewportSize({ width: 390, height: 844 });
      await expect(dock).toBeVisible();
      await expect(dock).toHaveCSS(
        "background-color",
        theme === "light"
          ? "rgb(250, 247, 242)"
          : "rgba(7, 9, 11, 0.97)",
      );
    });
  }
}
