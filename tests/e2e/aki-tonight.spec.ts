import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    document.cookie = "ak_consent_version=2; Path=/";
    document.cookie = "ak_personalisation=denied; Path=/";
  });
});

for (const locale of ["en", "es"] as const) {
  const es = locale === "es";

  test(`${locale}: Tonight query round trip`, async ({ page }) => {
    await page.goto(`/${locale}`);
    const entry = es ? "Crear un plan · AkiTonight" : "Make a plan · AkiTonight";
    await page.getByRole("link", { name: entry, exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`/${locale}/tonight$`));
    const heading = es ? "¿Qué hacemos esta noche?" : "What's the plan tonight?";
    await expect(
      page.getByRole("heading", { level: 1, name: heading }),
    ).toBeVisible();
    const planner = page.getByRole("region", {
      name: es ? "Crear un plan" : "Build a plan",
    });
    const area = planner.getByLabel(es ? "Zona" : "Area", { exact: true });
    const people = planner.getByLabel(es ? "Personas" : "People", {
      exact: true,
    });
    const distance = planner.getByLabel(es ? "Distancia máxima" : "Distance", {
      exact: true,
    });
    await planner.getByText(es ? "Bailar" : "Dancing", { exact: true }).click();
    await area.selectOption("benalmadena");
    await people.selectOption("6");
    await distance.selectOption("25");
    await planner
      .getByRole("button", {
        name: es ? "Buscar planes reales" : "Find real plans",
      })
      .click();
    await expect(page).toHaveURL(/intent=dancing/);
    await expect(page).toHaveURL(/area=benalmadena/);
    await expect(page).toHaveURL(/people=6/);
    await expect(page).toHaveURL(/radius=25/);
    await expect(
      planner.getByRole("radio", { name: /Dancing|Bailar/ }),
    ).toBeChecked();
    await expect(people).toHaveValue("6");
    const disclaimer = es
      ? "El tamaño del grupo es orientativo: no confirma aforo ni reserva."
      : "Group size is for planning only, not a capacity or booking confirmation.";
    await expect(page.getByText(disclaimer)).toBeVisible();
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
      "content",
      /noindex/,
    );
    await expect(
      page.getByRole("link", {
        name: es ? "Explorar AkiPassport" : "Explore AkiPassport",
      }),
    ).toHaveAttribute("href", `/${locale}/passports`);
  });

  for (const theme of ["light", "dark"] as const) {
    for (const width of [390, 1280]) {
      test(`${locale}: Tonight ${theme} ${width}px`, async ({ page }) => {
        await page.setViewportSize({ width, height: 900 });
        await page.emulateMedia({
          colorScheme: theme,
          reducedMotion: "reduce",
        });
        await page.goto(`/${locale}/tonight?intent=not-valid&radius=-9`);
        await page.evaluate((value) => {
          document.documentElement.setAttribute("data-theme", value);
        }, theme);
        const main = page.locator("main");
        await expect(main.getByRole("heading", { level: 1 })).toBeVisible();
        await expect(main.getByRole("radio")).toHaveCount(8);
        await expect(main.locator('select[name="radius"]')).toHaveValue("15");
        await expect(main.locator('input[value="all"]')).toBeChecked();
        const fits = await page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth + 1,
        );
        expect(fits).toBe(true);
        for (const select of await main.locator("select").all()) {
          const box = await select.boundingBox();
          expect(box).not.toBeNull();
          expect(box!.width).toBeGreaterThan(40);
          expect(box!.height).toBeGreaterThanOrEqual(44);
          expect(box!.x).toBeGreaterThanOrEqual(0);
          expect(box!.x + box!.width).toBeLessThanOrEqual(width + 1);
        }
        await page.screenshot({
          path: `test-results/tonight-${locale}-${theme}-${width}.png`,
          fullPage: true,
        });
      });
    }
  }
}
