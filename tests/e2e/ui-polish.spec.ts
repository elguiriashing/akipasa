import { expect, test } from "@playwright/test";

const publicRoutes = [
  "/en",
  "/es",
  "/en/map",
  "/es/map",
  "/en/passports",
  "/es/passports",
  "/en/auth",
  "/es/auth",
  "/en/membership",
  "/es/membership",
  "/en/privacy",
  "/es/privacy",
  "/en/terms",
  "/es/terms",
] as const;

test.describe("polished public UI", () => {
  for (const viewport of [
    { name: "mobile", width: 390, height: 844 },
    { name: "desktop", width: 1440, height: 1000 },
  ]) {
    test(`public routes fit ${viewport.name} screens`, async ({ page }) => {
      await page.setViewportSize(viewport);
      test.setTimeout(180_000);

      for (const route of publicRoutes) {
        await page.goto(route);
        await expect(page.locator("body")).toBeVisible();

        await expect(
          page.locator("main"),
          `${route}: main landmark`,
        ).toHaveCount(1);
        const dimensions = await page.locator("body").evaluate((body) => ({
          clientWidth: body.clientWidth,
          scrollWidth: body.scrollWidth,
        }));
        expect(dimensions.scrollWidth).toBeLessThanOrEqual(
          dimensions.clientWidth + 1,
        );
        if (viewport.name === "mobile") {
          const undersized = await page
            .locator(
              [
                "button:not([data-next-mark])",
                "a.button",
                "a.text-button",
                "summary",
                "input:not([type=hidden]):not([type=checkbox]):not([type=radio])",
                "select",
                "textarea",
              ].join(","),
            )
            .evaluateAll((elements) =>
              elements
                .filter((element) => {
                  const rect = element.getBoundingClientRect();
                  return (
                    rect.width > 0 && rect.height > 0 && rect.height < 43.5
                  );
                })
                .map((element) => element.outerHTML.slice(0, 180)),
            );
          expect(undersized, `${route}: undersized mobile target`).toEqual([]);
        }

        const slug = route.replace(/^\//, "").replaceAll("/", "-") || "home";
        await page.screenshot({
          path: `test-results/polish-${slug}-${viewport.name}.png`,
          fullPage: true,
        });
      }
    });
  }

  test("mobile navigation uses comfortable touch targets", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/en");

    const targets = await page
      .locator(".app-bottom-nav a, .app-bottom-nav button")
      .evaluateAll((elements) =>
        elements.map((element) => element.getBoundingClientRect().height),
      );

    expect(targets).toHaveLength(5);
    for (const height of targets) expect(height).toBeGreaterThanOrEqual(44);

    const more = page.getByRole("button", { name: "More options" });
    await more.click();
    await expect(more).toHaveAttribute("aria-expanded", "true");
    await expect(
      page.getByRole("dialog", { name: "More options" }),
    ).toBeVisible();
    await expect(page.locator("body")).toHaveCSS("overflow", "hidden");
    const sheetTargets = await page
      .locator(".app-sheet-nav a, .app-sheet-tools a, .app-sheet-tools button")
      .evaluateAll((elements) =>
        elements.map((element) => element.getBoundingClientRect().height),
      );
    for (const height of sheetTargets)
      expect(height).toBeGreaterThanOrEqual(44);
    await page.locator(".app-sheet-close").click();
    await expect(
      page.getByRole("dialog", { name: "More options" }),
    ).toBeHidden();
    await expect(page.locator("body")).not.toHaveCSS("overflow", "hidden");
  });

  test("authentication disclosures open smoothly and expose usable forms", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/en/auth");
    const passwordPanel = page
      .locator("details")
      .filter({ hasText: "Sign in with password" });
    const summary = passwordPanel.locator("summary");
    await summary.click();
    await expect(passwordPanel).toHaveAttribute("open", "");
    await expect(passwordPanel.locator('input[name="email"]')).toBeVisible();
    await expect(
      passwordPanel.getByRole("button", { name: "Sign in" }),
    ).toBeVisible();
    await summary.click();
    await expect(passwordPanel).not.toHaveAttribute("open", "");
  });
  test("workspace menus stay compact and dense across breakpoints", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 1000 });
    const pageErrors: string[] = [];
    page.on("pageerror", (error) => pageErrors.push(error.message));
    await page.goto("/en/passports");

    const desktopGlyphs = await page
      .locator(".workspace-sidebar .workspace-glyph")
      .evaluateAll((elements) =>
        elements.map((element) => {
          const style = getComputedStyle(element);
          return {
            width: element.getBoundingClientRect().width,
            marginBottom: Number.parseFloat(style.marginBottom),
          };
        }),
      );

    expect(desktopGlyphs.length).toBeGreaterThan(0);
    for (const glyph of desktopGlyphs) {
      expect(glyph.width).toBeLessThanOrEqual(40);
      expect(glyph.marginBottom).toBe(0);
    }

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/en/passports");
    const trigger = page.locator(".workspace-mobile-trigger");
    await expect(trigger).toBeVisible();
    await trigger.click();
    expect(pageErrors).toEqual([]);
    await expect(trigger).toHaveAttribute("aria-expanded", "true");
    await page.waitForTimeout(100);
    await expect(page.locator(".workspace-drawer")).toBeVisible();

    const mobileLinks = page.locator(
      ".workspace-drawer .workspace-navigation a",
    );
    expect(await mobileLinks.count()).toBeGreaterThan(1);
    const columns = await page
      .locator(".workspace-drawer .workspace-navigation")
      .evaluate((element) => getComputedStyle(element).gridTemplateColumns);
    expect(columns.trim().split(/\s+/)).toHaveLength(2);
  });
});
