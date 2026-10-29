import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    document.cookie = "ak_consent_version=2; Path=/";
    document.cookie = "ak_personalisation=denied; Path=/";
  });
});

for (const locale of ["en", "es"] as const) {
  const es = locale === "es";

  test(`${locale}: Tonight is reachable and retains submitted planning filters`, async ({
    page,
  }) => {
    await page.goto(`/${locale}`);
    await page
      .getByRole("link", {
        name: es ? "Crear un plan · AkiTonight" : "Make a plan · AkiTonight",
        exact: true,
      })
      .click();
    await expect(page).toHaveURL(new RegExp(`/${locale}/tonight$`));
    await expect(
      page.getByRole("heading", {
        level: 1,
        name: es ? "¿Qué hacemos esta noche?" : "What's the plan tonight?",
      }),
    ).toBeVisible();
    const planner = page.getByRole("region", {
      name: es ? "Crear un plan" : "Build a plan",
    });
    await planner.getByText(es ? "Bailar" : "Dancing", { exact: true }).click();
    await planner.getByLabel(es ? "Zona" : "Area", { exact: true }).selectOption("benalmadena");
    await planner.getByLabel(es ? "Personas" : "People", { exact: true }).selectOption("6");
    await planner.getByLabel(es ? "Distancia máxima" : "Distance", { exact: true }).selectOption("25");
    await planner
      .getByRole("button", {
        name: es ? "Buscar planes reales" : "Find real plans",
      })
      .click();
    await expect(page).toHaveURL(/intent=dancing/);
    await expect(page).toHaveURL(/area=benalmadena/);
    await expect(page).toHaveURL(/people=6/);
    await expect(page).toHaveURL(/radius=25/);
    await expect(planner.getByRole("radio", { name: /Dancing|Bailar/ })).toBeChecked();
    await expect(planner.getByLabel(es ? "Personas" : "People", { exact: true })).toHaveValue("6");
    await expect(
      page.getByText(
        es
          ? "El tamaño del grupo es orientativo: no confirma aforo ni reserva."
          : "Group size is for planning only, not a capacity or booking confirmation.",
      ),
    ).toBeVisible();
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
      test(`${locale}: Tonight ${theme} layout fits ${width}px`, async ({ page }) => {
        await page.setViewportSize({ width, height: 900 });
        await page.emulateMedia({ colorScheme: theme, reducedMotion: "reduce" });
        await page.goto(`/${locale}/tonight?intent=not-valid&radius=-9`);
        await page.evaluate((value) => {
          document.documentElement.setAttribute("data-theme", value);
        }, theme);
        const main = page.locator("main");
        await expect(main.getByRole("heading", { level: 1 })).toBeVisible();
        await expect(main.getByRole("radio")).toHaveCount(8);
        await expect(main.locator('select[name="radius"]')).toHaveValue("15");
        await expect(main.locator('input[value="all"]')).toBeChecked();
        expect(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= window.innerWidth + 1,
          ),
        ).toBe(true);
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
