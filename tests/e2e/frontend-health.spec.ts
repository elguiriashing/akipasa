import { expect, test } from "@playwright/test";

test("privacy choices follow client locale navigation without submitting consent", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1363, height: 936 });
  const consentRequests: string[] = [];
  page.on("request", (request) => {
    if (
      request.method() === "POST" &&
      new URL(request.url()).pathname === "/api/v1/personalisation/consent"
    )
      consentRequests.push(request.url());
  });
  await page.addInitScript(() => {
    document.cookie = "ak_consent_version=2; Path=/";
  });
  await page.goto("/es/membership");
  await expect(
    page.getByRole("button", { name: "Opciones de privacidad", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("link", { name: "Switch to English", exact: true })
    .click();
  await expect(page).toHaveURL(/\/en\/membership$/);
  await page
    .getByRole("button", { name: "Privacy choices", exact: true })
    .click();
  await page.getByLabel("Recommendations based on my interactions").check();
  await page.screenshot({ path: "test-results/frontend-privacy-en-after.png" });
  await page
    .getByRole("link", { name: "Cambiar a español", exact: true })
    .click();
  await expect(page).toHaveURL(/\/es\/membership$/);
  await expect(
    page.getByLabel("Recomendaciones según mis interacciones"),
  ).toBeChecked();
  await expect(
    page.getByRole("button", { name: "Guardar opciones", exact: true }),
  ).toBeVisible();
  expect(consentRequests).toEqual([]);
  await page.screenshot({
    path: "test-results/frontend-privacy-locale-after.png",
  });
});

test("AkiDuermo native history language changes update privacy without a reload or consent submission", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1363, height: 936 });
  const consentRequests: string[] = [];
  let documents = 0;
  page.on("request", (request) => {
    if (request.isNavigationRequest() && request.frame() === page.mainFrame())
      documents++;
    if (
      request.method() === "POST" &&
      new URL(request.url()).pathname === "/api/v1/personalisation/consent"
    )
      consentRequests.push(request.url());
  });
  await page.route("**/api/stays**", (route) =>
    route.fulfill({ json: { rows: [], total: 0, availabilityChecked: false } }),
  );
  await page.addInitScript(() => {
    document.cookie = "ak_consent_version=2; Path=/";
  });
  await page.goto("/akiduermo?lang=es");
  await page
    .getByRole("button", { name: "Opciones de privacidad", exact: true })
    .click();
  await page.getByLabel("Recomendaciones según mis interacciones").check();
  const initialDocuments = documents;
  await page
    .getByRole("button", { name: "Switch to English", exact: true })
    .click();
  await expect(page).toHaveURL(/\/akiduermo\?lang=en$/);
  await expect(
    page.getByRole("button", { name: "Privacy choices", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByLabel("Recommendations based on my interactions"),
  ).toBeChecked();
  await expect(
    page.getByLabel("Audience measurement (Google Analytics)"),
  ).not.toBeChecked();
  await page.screenshot({
    path: "test-results/frontend-duermo-privacy-en-after.png",
  });
  await page
    .getByRole("button", { name: "Cambiar a español", exact: true })
    .click();
  await expect(page).toHaveURL(/\/akiduermo\?lang=es$/);
  await expect(
    page.getByLabel("Recomendaciones según mis interacciones"),
  ).toBeChecked();
  expect(documents).toBe(initialDocuments);
  expect(consentRequests).toEqual([]);
});

for (const locale of ["en", "es"] as const)
  for (const theme of ["light", "dark"] as const)
    for (const [width, height] of [
      [390, 844],
      [768, 1024],
      [1024, 768],
      [1440, 1000],
      [640, 400],
    ]) {
      test(`AkiDuermo privacy remains reachable above its navigation: ${locale} ${theme} ${width}x${height}`, async ({
        page,
      }) => {
        await page.setViewportSize({ width, height });
        const consentRequests: string[] = [];
        page.on("request", (request) => {
          if (
            request.method() === "POST" &&
            new URL(request.url()).pathname ===
              "/api/v1/personalisation/consent"
          )
            consentRequests.push(request.url());
        });
        // Use the production stay-host rewrite against the isolated Next server.
        await page.route(/http:\/\/127\.0\.0\.1:\d+\//, async (route) => {
          const path = new URL(route.request().url()).pathname;
          // Compiled assets are host-independent; keep their native browser transport.
          if (path.startsWith("/_next/static/")) return route.continue();
          if (path === "/api/stays")
            return route.fulfill({
              json: { rows: [], total: 0, availabilityChecked: false },
            });
          const response = await route.fetch({
            // Retry one reset on this loopback GET proxy, never an HTTP error.
            maxRetries: route.request().method() === "GET" ? 1 : 0,
            headers: {
              ...route.request().headers(),
              host: "akiduermo.akipasa.com",
            },
          });
          await route.fulfill({ response });
        });
        await page.addInitScript((selectedTheme) => {
          document.cookie = "ak_consent_version=2; Path=/";
          window.localStorage.setItem("akipasa.theme", selectedTheme);
        }, theme);
        await page.goto(`/?lang=${locale}`);
        await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
        await expect(page.locator("body")).toHaveAttribute(
          "data-product",
          "akiduermo",
        );
        const nav = page.getByRole("navigation", {
          name:
            locale === "es"
              ? "Navegación de AkiDuermo"
              : "AkiDuermo navigation",
          exact: true,
        });
        const trigger = page.getByRole("button", {
          name: locale === "es" ? "Opciones de privacidad" : "Privacy choices",
          exact: true,
        });
        const triggerBounds = await trigger.boundingBox();
        const navBounds = await nav.boundingBox();
        expect(triggerBounds).not.toBeNull();
        expect(navBounds).not.toBeNull();
        if (!triggerBounds || !navBounds)
          throw new Error("Missing privacy/navigation bounds");
        expect(triggerBounds.height).toBeGreaterThanOrEqual(44);
        expect(triggerBounds.y + triggerBounds.height).toBeLessThanOrEqual(
          navBounds.y - 8,
        );
        expect(triggerBounds.x).toBeGreaterThanOrEqual(0);
        expect(triggerBounds.x + triggerBounds.width).toBeLessThanOrEqual(
          width,
        );
        await trigger.click();
        const panel = page.locator("aside.personalisation-consent");
        await expect(panel).toBeVisible();
        const panelBounds = await panel.boundingBox();
        expect(panelBounds).not.toBeNull();
        if (!panelBounds) throw new Error("Missing privacy panel bounds");
        expect(panelBounds.y).toBeGreaterThanOrEqual(0);
        expect(panelBounds.y + panelBounds.height).toBeLessThanOrEqual(
          navBounds.y - 8,
        );
        await page.screenshot({
          path: `test-results/frontend-duermo-privacy-${locale}-${theme}-${width}x${height}-top-after.png`,
        });
        for (const checkbox of await panel.getByRole("checkbox").all())
          await expect(checkbox).not.toBeChecked();
        for (const button of await panel.getByRole("button").all()) {
          await button.scrollIntoViewIfNeeded();
          await expect(button).toBeVisible();
          await expect(button).toBeEnabled();
          const bounds = await button.boundingBox();
          if (!bounds) throw new Error("Missing privacy action bounds");
          expect(bounds.y).toBeGreaterThanOrEqual(0);
          expect(bounds.y + bounds.height).toBeLessThanOrEqual(navBounds.y - 8);
          expect(
            await button.evaluate((element) => {
              const rect = element.getBoundingClientRect();
              const target = document.elementFromPoint(
                rect.x + rect.width / 2,
                rect.y + rect.height / 2,
              );
              return (
                target === element ||
                (target !== null && element.contains(target))
              );
            }),
          ).toBe(true);
        }
        await page.screenshot({
          path: `test-results/frontend-duermo-privacy-${locale}-${theme}-${width}x${height}-actions-after.png`,
        });
        expect(consentRequests).toEqual([]);
        // Drain this loopback host proxy before Playwright closes its context.
        // Every intercepted request still completes normally or fails the test.
        await page.unrouteAll({ behavior: "wait" });
      });
    }

for (const locale of ["en", "es"] as const)
  for (const theme of ["light", "dark"] as const)
    for (const [width, height] of [
      [390, 844],
      [768, 1024],
      [640, 400],
    ]) {
      test(`stay property privacy preserves the mobile planning bar: ${locale} ${theme} ${width}x${height}`, async ({
        page,
      }) => {
        const consentRequests: string[] = [];
        let documents = 0;
        page.on("request", (request) => {
          if (
            request.isNavigationRequest() &&
            request.frame() === page.mainFrame()
          )
            documents++;
          if (
            request.method() === "POST" &&
            new URL(request.url()).pathname ===
              "/api/v1/personalisation/consent"
          )
            consentRequests.push(request.url());
        });
        await page.setViewportSize({ width, height });
        await page.addInitScript((selectedTheme) => {
          document.cookie = "ak_consent_version=2; Path=/";
          window.localStorage.setItem("akipasa.theme", selectedTheme);
        }, theme);
        // The existing read-only detail fixture supplies synthetic content only.
        // This exercises the real property renderer, not accommodation inventory.
        const response = await page.goto(
          `/akiduermo/stays/e2e-synthetic-venue-1?lang=${locale}`,
        );
        expect(response?.status()).toBe(200);
        await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
        await expect(page.locator("body")).toHaveAttribute(
          "data-product",
          "akiduermo",
        );
        expect(
          await page
            .locator("body")
            .evaluate((element) =>
              getComputedStyle(element)
                .getPropertyValue("--stay-privacy-dock-offset")
                .trim(),
            ),
        ).toBe("176px");
        const planning = page.getByRole("link", {
          name: locale === "es" ? "Planificar estancia" : "Plan your stay",
          exact: true,
        });
        const trigger = page.getByRole("button", {
          name: locale === "es" ? "Opciones de privacidad" : "Privacy choices",
          exact: true,
        });
        await expect(planning).toBeVisible();
        const barBounds = await planning.locator("..").boundingBox();
        const triggerBounds = await trigger.boundingBox();
        if (!barBounds || !triggerBounds)
          throw new Error("Missing planning/privacy bounds");
        expect(triggerBounds.y + triggerBounds.height).toBeLessThanOrEqual(
          barBounds.y - 8,
        );
        await planning.click();
        await expect(page).toHaveURL(/#plan$/);
        await trigger.click();
        const panel = page.locator("aside.personalisation-consent");
        await expect(panel).toBeVisible();
        const panelBounds = await panel.boundingBox();
        if (!panelBounds)
          throw new Error("Missing property privacy panel bounds");
        expect(panelBounds.y).toBeGreaterThanOrEqual(0);
        expect(panelBounds.y + panelBounds.height).toBeLessThanOrEqual(
          barBounds.y - 8,
        );
        for (const button of await panel.getByRole("button").all()) {
          await button.scrollIntoViewIfNeeded();
          await expect(button).toBeVisible();
          expect(
            await button.evaluate((element) => {
              const rect = element.getBoundingClientRect();
              const target = document.elementFromPoint(
                rect.x + rect.width / 2,
                rect.y + rect.height / 2,
              );
              return (
                target === element ||
                (target !== null && element.contains(target))
              );
            }),
          ).toBe(true);
        }
        for (const checkbox of await panel.getByRole("checkbox").all())
          await expect(checkbox).not.toBeChecked();
        await page.screenshot({
          path: `test-results/frontend-stay-property-privacy-${locale}-${theme}-${width}x${height}-after.png`,
        });
        await panel
          .getByLabel(
            locale === "es"
              ? "Recomendaciones según mis interacciones"
              : "Recommendations based on my interactions",
          )
          .check();
        const initialDocuments = documents;
        const opposite = locale === "es" ? "en" : "es";
        await page
          .getByRole("button", {
            name: locale === "es" ? "Switch to English" : "Cambiar a español",
            exact: true,
          })
          .click();
        expect(new URL(page.url()).searchParams.get("lang")).toBe(opposite);
        await expect(
          panel.getByLabel(
            opposite === "es"
              ? "Recomendaciones según mis interacciones"
              : "Recommendations based on my interactions",
          ),
        ).toBeChecked();
        await page
          .getByRole("button", {
            name: locale === "es" ? "Cambiar a español" : "Switch to English",
            exact: true,
          })
          .click();
        expect(new URL(page.url()).searchParams.get("lang")).toBe(locale);
        await expect(
          panel.getByLabel(
            locale === "es"
              ? "Recomendaciones según mis interacciones"
              : "Recommendations based on my interactions",
          ),
        ).toBeChecked();
        expect(documents).toBe(initialDocuments);
        expect(consentRequests).toEqual([]);
        await page.setViewportSize({ width: 801, height });
        await expect(planning).toBeHidden();
        expect(
          await page
            .locator("body")
            .evaluate((element) =>
              getComputedStyle(element)
                .getPropertyValue("--stay-privacy-dock-offset")
                .trim(),
            ),
        ).toBe("");
        await page.goto(`/akiduermo?lang=${locale}`);
        expect(
          await page
            .locator("body")
            .evaluate((element) =>
              getComputedStyle(element)
                .getPropertyValue("--stay-privacy-dock-offset")
                .trim(),
            ),
        ).toBe("");
      });
    }

for (const locale of ["en", "es"] as const)
  for (const theme of ["light", "dark"] as const)
    for (const [width, height] of [
      [390, 844],
      [768, 1024],
      [800, 600],
      [801, 600],
      [1024, 768],
      [1363, 936],
      [1440, 1000],
    ]) {
      test(`membership management remains clear of Search: ${locale} ${theme} ${width}px`, async ({
        page,
      }) => {
        await page.setViewportSize({ width, height });
        await page.addInitScript((selectedTheme) => {
          document.cookie = "ak_consent_version=2; Path=/";
          window.localStorage.setItem("akipasa.theme", selectedTheme);
        }, theme);
        await page.goto(`/${locale}/membership`);
        await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
        const manage = page.getByRole("link", {
          name: locale === "es" ? "Gestionar" : "Manage",
          exact: true,
        });
        const search = page.getByRole("button", {
          name: locale === "es" ? "Buscar en AkiPasa" : "Search AkiPasa",
          exact: true,
        });
        await expect(manage).toBeVisible();
        await expect(search).toBeEnabled();
        const manageBounds = await manage.boundingBox();
        const searchBounds = await search.boundingBox();
        expect(manageBounds).not.toBeNull();
        expect(searchBounds).not.toBeNull();
        if (!manageBounds || !searchBounds)
          throw new Error("Missing control bounds");
        const overlapWidth =
          Math.min(
            manageBounds.x + manageBounds.width,
            searchBounds.x + searchBounds.width,
          ) - Math.max(manageBounds.x, searchBounds.x);
        const overlapHeight =
          Math.min(
            manageBounds.y + manageBounds.height,
            searchBounds.y + searchBounds.height,
          ) - Math.max(manageBounds.y, searchBounds.y);
        expect(overlapWidth <= 0 || overlapHeight <= 0).toBe(true);
        expect(manageBounds.height).toBeGreaterThanOrEqual(44);
        const dimensions = await page.evaluate(() => ({
          width: document.documentElement.clientWidth,
          scrollWidth: document.documentElement.scrollWidth,
        }));
        expect(dimensions.scrollWidth).toBeLessThanOrEqual(
          dimensions.width + 1,
        );
        await page.screenshot({
          path: `test-results/frontend-membership-${locale}-${theme}-${width}-after.png`,
        });
        await manage.click();
        await expect(page).toHaveURL(/\/auth\?next=/);
        expect(new URL(page.url()).searchParams.get("next")).toBe(
          `/${locale}/account/subscription?from=akipasa`,
        );
      });
    }
