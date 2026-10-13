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
