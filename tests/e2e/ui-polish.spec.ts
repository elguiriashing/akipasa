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
  test.beforeEach(async ({ page }, testInfo) => {
    // Retain first-load privacy controls in the public route sizing audit.
    if (!testInfo.title.startsWith("public routes fit")) {
      await page.addInitScript(() => {
        document.cookie = "ak_consent_version=2; Path=/";
      });
    }
  });

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

  test("map attribution remains usable beside privacy choices", async ({
    page,
  }, testInfo) => {
    test.setTimeout(150_000);
    await page.emulateMedia({ reducedMotion: "reduce" });
    const measurements: Record<string, unknown>[] = [];
    // The vendor control is hidden without source attribution. A tileless
    // basemap makes its real native disclosure deterministic without network
    // access, while retaining the application, MapLibre and production CSS.
    await page.route("https://tiles.openfreemap.org/styles/liberty", (route) =>
      route.fulfill({
        json: {
          version: 8,
          sources: {
            attribution: {
              type: "geojson",
              attribution: "Disposable map attribution",
              data: {
                type: "FeatureCollection",
                features: [
                  {
                    type: "Feature",
                    geometry: {
                      type: "Point",
                      coordinates: [-4.62, 36.55],
                    },
                    properties: {},
                  },
                ],
              },
            },
          },
          layers: [
            {
              id: "background",
              type: "background",
              paint: { "background-color": "#e8eee9" },
            },
            {
              id: "attribution",
              type: "circle",
              source: "attribution",
              paint: { "circle-radius": 1 },
            },
          ],
        },
      }),
    );

    for (const locale of ["en", "es"]) {
      for (const viewport of [
        { width: 360, height: 800 },
        { width: 390, height: 844 },
        { width: 768, height: 1024 },
        { width: 1536, height: 960 },
        { width: 640, height: 400 },
      ]) {
        await page.setViewportSize(viewport);
        await page.goto(`/${locale}/map`, {
          waitUntil: "domcontentloaded",
        });
        const attribution = page.locator(
          ".production-map .maplibregl-ctrl-attrib",
        );
        const summary = attribution.locator(":scope > summary");
        const privacy = page.locator(".privacy-preferences button");
        await expect(summary).toBeVisible();
        await expect(privacy).toBeVisible();
        if ((await attribution.getAttribute("open")) !== null)
          await summary.click();

        for (const open of [false, true]) {
          if (open) await summary.click();
          await expect(attribution).toHaveJSProperty("open", open);
          const credit = attribution.locator(".maplibregl-ctrl-attrib-inner");
          if (open) {
            await expect(credit).toBeVisible();
            await expect(credit).toHaveText("Disposable map attribution");
          } else await expect(credit).toBeHidden();

          const control = await summary.boundingBox();
          const container = await attribution.boundingBox();
          const map = await page.locator(".production-map").boundingBox();
          const privacyControl = await privacy.boundingBox();
          expect(control).not.toBeNull();
          expect(container).not.toBeNull();
          expect(map).not.toBeNull();
          expect(privacyControl).not.toBeNull();
          expect(control!.width).toBeGreaterThanOrEqual(43.5);
          expect(control!.height).toBeGreaterThanOrEqual(43.5);
          expect(control!.x).toBeGreaterThanOrEqual(container!.x - 1);
          expect(control!.y).toBeGreaterThanOrEqual(container!.y - 1);
          expect(control!.x + control!.width).toBeLessThanOrEqual(
            container!.x + container!.width + 1,
          );
          expect(control!.y + control!.height).toBeLessThanOrEqual(
            container!.y + container!.height + 1,
          );
          expect(container!.x).toBeGreaterThanOrEqual(map!.x - 1);
          expect(container!.y).toBeGreaterThanOrEqual(map!.y - 1);
          expect(container!.x + container!.width).toBeLessThanOrEqual(
            map!.x + map!.width + 1,
          );
          expect(container!.y + container!.height).toBeLessThanOrEqual(
            map!.y + map!.height + 1,
          );
          const overlapsPrivacy =
            container!.x < privacyControl!.x + privacyControl!.width &&
            container!.x + container!.width > privacyControl!.x &&
            container!.y < privacyControl!.y + privacyControl!.height &&
            container!.y + container!.height > privacyControl!.y;
          expect(overlapsPrivacy, "Attribution must not cover privacy").toBe(
            false,
          );
          const label = `${locale}-${viewport.width}x${viewport.height}-${open ? "open" : "closed"}`;
          measurements.push({
            label,
            control,
            container,
            map,
            privacyControl,
          });
          await testInfo.attach(`map-attribution-${label}`, {
            body: await page.screenshot(),
            contentType: "image/png",
          });
        }
        await summary.click();
        await expect(attribution).toHaveJSProperty("open", false);
        await privacy.click();
        await expect(page.locator(".personalisation-consent")).toBeVisible();
      }
    }
    await testInfo.attach("map-attribution-measurements", {
      body: Buffer.from(JSON.stringify(measurements, null, 2)),
      contentType: "application/json",
    });
  });

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

  test("authentication modes expose usable forms and preserve the return route", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/en/auth?next=%2Fen%2Faccount");
    const passwordPanel = page
      .locator(".auth-focus-panel form")
      .filter({ has: page.locator('input[name="password"]') });
    await expect(passwordPanel.locator('input[name="email"]')).toBeVisible();
    await expect(
      passwordPanel.locator('input[name="password"]'),
    ).toHaveAttribute("autocomplete", "current-password");
    await expect(
      passwordPanel.getByRole("button", { name: "Sign in", exact: true }),
    ).toBeVisible();
    const modes = page.getByRole("navigation", { name: "Access options" });
    await modes
      .getByRole("link", { name: "Create account", exact: true })
      .click();
    await expect(page).toHaveURL(/mode=signup/);
    await expect(
      passwordPanel.getByRole("button", { name: "Sign in", exact: true }),
    ).toHaveCount(0);
    await expect(
      passwordPanel.getByRole("button", {
        name: "Create account",
        exact: true,
      }),
    ).toBeVisible();
    await expect(
      passwordPanel.locator('input[name="password"]'),
    ).toHaveAttribute("autocomplete", "new-password");
    await expect(passwordPanel.locator('input[name="next"]')).toHaveValue(
      "/en/account",
    );
    await modes.getByRole("link", { name: "Sign in", exact: true }).click();
    await expect(page).toHaveURL(/mode=signin/);
    await expect(
      passwordPanel.getByRole("button", { name: "Sign in", exact: true }),
    ).toBeVisible();
    await expect(passwordPanel.locator('input[name="next"]')).toHaveValue(
      "/en/account",
    );
  });
  test("passport chapter bookmarks stay available across breakpoints", async ({
    page,
  }) => {
    const pageErrors: string[] = [];
    page.on("pageerror", (error) => pageErrors.push(error.message));
    for (const width of [1440, 390]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto("/en/passports");
      const chapters = page.getByRole("navigation", {
        name: "Passport chapters",
      });
      await expect(
        page.getByRole("button", { name: "Open passport", exact: true }),
      ).toBeVisible();
      if (width === 390) {
        await expect(chapters).toBeHidden();
        await page
          .getByRole("button", { name: "Open passport menu", exact: true })
          .click();
      }
      await expect(chapters).toBeVisible();
      await expect(chapters.locator(":scope > button")).toHaveCount(6);
      await chapters.getByRole("button", { name: /Cities/ }).click();
      await expect(
        page.getByRole("searchbox", { name: "Find a city" }),
      ).toBeVisible();
      if (width === 390) await expect(chapters).toBeHidden();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
    }
    expect(pageErrors).toEqual([]);
  });

  test("sidebar and light/dark choices stay consistent across routes", async ({
    page,
  }) => {
    test.setTimeout(120_000);
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto("/en");
    await page.evaluate(() => {
      window.localStorage.setItem("akipasa.theme", "dark");
      window.localStorage.removeItem("akipasa.sidebar.collapsed");
    });
    await page.reload();

    const rail = page.getByRole("complementary", {
      name: "Primary navigation",
    });
    await expect(rail).toHaveAttribute("data-compact", "false");
    await expect(
      page.getByRole("button", { name: "Switch to light mode" }),
    ).toBeVisible();

    await page.getByRole("button", { name: "Collapse sidebar" }).click();
    await expect(rail).toHaveAttribute("data-compact", "true");
    expect(
      await page.evaluate(() =>
        window.localStorage.getItem("akipasa.sidebar.collapsed"),
      ),
    ).toBe("true");

    await page.goto("/en/passports");
    await expect(
      page.getByRole("complementary", { name: "Primary navigation" }),
    ).toHaveAttribute("data-compact", "true");
    await page.getByRole("button", { name: "Expand sidebar" }).click();
    await expect(
      page.getByRole("complementary", { name: "Primary navigation" }),
    ).toHaveAttribute("data-compact", "false");

    const themeToggle = page.getByRole("button", {
      name: "Switch to light mode",
    });
    await expect(themeToggle.locator("svg")).toBeVisible();
    await expect(themeToggle).toHaveText("");
    await themeToggle.click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
    await expect(page.locator("html")).toHaveCSS("color-scheme", "light");
    expect(
      await page.evaluate(() => window.localStorage.getItem("akipasa.theme")),
    ).toBe("light");

    await page.goto("/en/membership");
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
    await expect(
      page.getByRole("button", { name: "Switch to dark mode" }),
    ).toBeVisible();

    await page.setViewportSize({ width: 390, height: 844 });
    await page.getByRole("button", { name: "More options" }).click();
    const mobileThemeToggle = page
      .getByRole("dialog", { name: "More options" })
      .getByRole("button", { name: "Switch to dark mode" });
    await expect(mobileThemeToggle.locator("svg")).toBeVisible();
    await expect(mobileThemeToggle).toHaveText("");
    await mobileThemeToggle.click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  });
});
