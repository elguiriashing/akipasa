import { expect, test } from "@playwright/test";

for (const locale of ["en", "es"] as const) {
  for (const width of [390, 1440]) {
    test(`business tools stay compact and accurate: ${locale}, ${width}px`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 1000 });
      const errors: string[] = [];
      page.on("pageerror", (error) => errors.push(error.message));
      await page.goto(`/${locale}/membership`);
      const es = locale === "es";
      const dismiss = page.getByRole("button", {
        name: es ? "Ahora no" : "Not now",
        exact: true,
      });
      if (await dismiss.isVisible()) await dismiss.click();
      const region = page.getByRole("region", {
        name: es ? "Tus herramientas, de un vistazo" : "Your tools at a glance",
      });
      const selector = region.getByLabel(
        es ? "Tipo de negocio" : "Business type",
      );
      await expect(region.getByRole("group")).toHaveCount(0);
      await selector.selectOption("food");
      const preview = region.locator('[aria-live="polite"]');
      await expect(preview.getByRole("listitem")).toHaveCount(3);
      await expect(preview).toContainText(es ? "Facturas" : "Invoices");
      await expect(preview).not.toContainText(es ? "Inventario" : "Inventory");
      await region.getByRole("button", { name: /Pro/ }).click();
      await expect(preview).toContainText(
        es ? "Punto de venta" : "Point of sale",
      );
      await expect(preview).toContainText(es ? "Inventario" : "Inventory");
      await expect(region.getByRole("link", { name: /Pro/ })).toHaveAttribute(
        "href",
        `/${locale}/business/apply?category=food&plan=business_pro`,
      );
      const allTools = region.locator("details").first();
      await expect(allTools).not.toHaveAttribute("open", "");
      await allTools.locator("summary").click();
      await expect(allTools.getByRole("listitem")).toHaveCount(12);
      await allTools.locator("summary").click();
      await selector.selectOption("music");
      await expect(preview).toContainText(es ? "Chat de equipo" : "Team chat");
      await expect(preview).not.toContainText(
        es ? "Punto de venta" : "Point of sale",
      );
      await region
        .getByRole("button", { name: es ? /Básico/ : /Basic/ })
        .click();
      await expect(preview).not.toContainText(
        es ? "Chat de equipo" : "Team chat",
      );
      await expect(
        region.getByRole("link", { name: es ? /Básico/ : /Basic/ }),
      ).toHaveAttribute(
        "href",
        `/${locale}/business/apply?category=music&plan=business`,
      );
      await expect(
        region.locator("details").first().locator("summary"),
      ).toContainText("7");
      for (const category of ["social", "workshop", "family", "sport"]) {
        await selector.selectOption(category);
        await expect(preview.getByRole("listitem")).toHaveCount(3);
        await expect(region.getByRole("link")).toHaveAttribute(
          "href",
          `/${locale}/business/apply?category=${category}&plan=business`,
        );
      }
      await selector.selectOption("food");
      await region.getByRole("button", { name: /Pro/ }).click();
      const box = await region.boundingBox();
      expect(box!.height).toBeLessThan(720);
      const dimensions = await region.evaluate((element) => ({
        width: element.clientWidth,
        scroll: element.scrollWidth,
      }));
      expect(dimensions.scroll).toBeLessThanOrEqual(dimensions.width + 1);
      for (const theme of ["light", "dark"]) {
        await page.evaluate((value) => {
          window.localStorage.setItem("akipasa.theme", value);
        }, theme);
        await page.reload();
        await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
        await selector.selectOption("food");
        await region.getByRole("button", { name: /Pro/ }).click();
        await region.screenshot({
          path: `test-results/membership-${locale}-${width}-${theme}.png`,
        });
      }
      expect(errors).toEqual([]);
    });
  }
}
