import { expect, test } from "@playwright/test";

for (const locale of ["en", "es"] as const) {
  for (const theme of ["light", "dark"] as const) {
    for (const viewport of [
      { width: 390, height: 844 },
      { width: 1280, height: 800 },
    ]) {
      test(`AkiDuermo guest routes ${locale} ${theme} ${viewport.width}`, async ({
        page,
      }) => {
        await page.setViewportSize(viewport);
        await page.addInitScript(
          (value) => localStorage.setItem("akipasa.theme", value),
          theme,
        );
        const consentRequests: string[] = [];
        page.on("request", (request) => {
          if (
            request.method() === "POST" &&
            new URL(request.url()).pathname ===
              "/api/v1/personalisation/consent"
          )
            consentRequests.push(request.url());
        });
        // Exercise the same Next server through the stay virtual host, without real credentials.
        await page.route(/http:\/\/127\.0\.0\.1:\d+\//, async (route) => {
          const path = new URL(route.request().url()).pathname;
          // Compiled assets and vendored fonts are host-independent. Keep their
          // real local responses instead of sending them through host redirects.
          if (
            path.startsWith("/_next/static/") ||
            path.startsWith("/assets/fonts/")
          )
            return route.continue();
          if (path === "/api/stays") {
            const hasDates = new URL(route.request().url()).searchParams.has(
              "checkIn",
            );
            return route.fulfill({
              json: {
                rows: hasDates
                  ? [
                      {
                        id: "00000000-0000-4000-8000-000000000001",
                        slug: "test-stay",
                        name: "Test stay",
                        address: "Fuengirola",
                        accommodationType: "apartment",
                        website: null,
                        city: "Fuengirola",
                      },
                    ]
                  : [],
                total: hasDates ? 1 : 0,
                availabilityChecked: hasDates,
              },
            });
          }
          if (path === "/api/map/stays")
            return route.fulfill({ json: { ids: [], total: 0 } });
          const response = await route.fetch({
            // Retry one transport reset on GET only; HTTP failures still fail normally.
            maxRetries: route.request().method() === "GET" ? 1 : 0,
            headers: {
              ...route.request().headers(),
              host: "akiduermo.akipasa.com",
            },
          });
          await route.fulfill({ response });
        });
        for (const path of [
          `/${locale}/auth?next=%2Fbookings`,
          "/",
          "/saved",
          "/map",
        ]) {
          await page.goto(
            `${path}${path.includes("?") ? "&" : "?"}lang=${locale}`,
            { waitUntil: "domcontentloaded" },
          );
          await expect(page.locator("main")).toBeVisible();
          if (path.includes("/auth?")) {
            const fonts = await page.evaluate(async () => {
              const faces = await document.fonts.load(
                '600 16px "Aki Selector Poppins"',
              );
              return faces.map((face) => face.status);
            });
            expect(fonts.length).toBeGreaterThan(0);
            expect(fonts.every((status) => status === "loaded")).toBe(true);
          }
          // A first visitor must be able to dismiss the initially open panel
          // without making a consent decision before using the stay controls.
          const privacy = page.getByRole("complementary", {
            name:
              locale === "es" ? "Opciones de privacidad" : "Privacy choices",
          });
          await expect(privacy).toBeVisible();
          await expect(privacy.getByRole("checkbox")).toHaveCount(4);
          for (const checkbox of await privacy.getByRole("checkbox").all())
            await expect(checkbox).not.toBeChecked();
          const close = privacy.getByRole("button", {
            name:
              locale === "es"
                ? "Cerrar opciones de privacidad"
                : "Close privacy choices",
          });
          const closeBounds = await close.boundingBox();
          expect(closeBounds?.height).toBeGreaterThanOrEqual(44);
          expect(closeBounds?.width).toBeGreaterThanOrEqual(44);
          if (path.includes("/auth?")) {
            await privacy.getByRole("checkbox").nth(1).check();
            await privacy.getByRole("checkbox").nth(3).check();
          }
          await close.click();
          await expect(privacy).toBeHidden();
          const privacyTrigger = page.getByRole("button", {
            name:
              locale === "es" ? "Opciones de privacidad" : "Privacy choices",
            exact: true,
          });
          await expect(privacyTrigger).toBeFocused();
          if (path.includes("/auth?")) {
            await privacyTrigger.press("Enter");
            await expect(privacy).toBeVisible();
            await expect(privacy.getByRole("checkbox").nth(1)).toBeChecked();
            await expect(privacy.getByRole("checkbox").nth(3)).toBeChecked();
            await privacy.getByRole("checkbox").nth(1).focus();
            await page.keyboard.press("Escape");
            await expect(privacy).toBeHidden();
            await expect(privacyTrigger).toBeFocused();
          }
          await expect(
            page.locator("#ak-consented-ga, #ak-google-ads-loader"),
          ).toHaveCount(0);
          expect(consentRequests).toEqual([]);
          expect(
            (await page.context().cookies()).filter((cookie) =>
              /^ak_(consent_version|analytics|personalisation|marketing)$/.test(
                cookie.name,
              ),
            ),
          ).toEqual([]);
          if (path === "/") {
            const checkIn = new Date(Date.now() + 86_400_000)
              .toISOString()
              .slice(0, 10);
            const checkOut = new Date(Date.now() + 5 * 86_400_000)
              .toISOString()
              .slice(0, 10);
            await page
              .getByRole("textbox", {
                name: locale === "es" ? "Destino" : "Destination",
              })
              .fill("Fuengirola");
            await page
              .getByLabel(locale === "es" ? "Entrada" : "Check in")
              .fill(checkIn);
            await page
              .getByLabel(locale === "es" ? "Salida" : "Check out")
              .fill(checkOut);
            await page
              .getByRole("button", {
                name: locale === "es" ? "Buscar alojamiento" : "Find a stay",
              })
              .click();
            await expect(
              page.getByRole("link", { name: "Test stay", exact: true }),
            ).toBeVisible();
            await expect(
              page.getByText(
                locale === "es"
                  ? /Disponibilidad comprobada/
                  : /Availability checked/,
              ),
            ).toBeVisible();
          }
          if (path === "/saved") {
            await expect(
              page.getByRole("searchbox", {
                name:
                  locale === "es" ? "Buscar guardados" : "Search saved stays",
              }),
            ).toBeVisible();
            await expect(
              page.getByRole("region", {
                name: locale === "es" ? "Planea tu estancia" : "Plan your stay",
              }),
            ).toHaveCount(0);
          }
          if (path.includes("/auth?")) {
            await expect(
              page.getByRole("banner").getByRole("link", {
                name: "AkiDuermo",
                exact: true,
              }),
            ).toBeVisible();
            await expect(
              page.getByRole("complementary", { name: "Primary navigation" }),
            ).toHaveCount(0);
          }
          expect(
            await page.evaluate(() => document.documentElement.scrollWidth),
            path,
          ).toBeLessThanOrEqual(viewport.width + 1);
          if (path === "/map") {
            const filter = page.locator("details").filter({
              has: page.getByText(
                locale === "es" ? "Buscar y filtrar" : "Search & filters",
              ),
            });
            await expect(filter).not.toHaveAttribute("open", "");
            await expect(page.locator(".map-legend")).toBeHidden();
            await filter.locator("summary").click();
            await expect(filter).toHaveAttribute("open", "");
            const canvas = page.locator(".production-map canvas");
            await expect(canvas).toBeVisible();
            await canvas.evaluate((element) =>
              element.setAttribute("data-stay-map-instance", "original"),
            );
            await page
              .getByRole("button", {
                name: locale === "es" ? "Hoteles" : "Hotels",
              })
              .click();
            await expect(canvas).toHaveAttribute(
              "data-stay-map-instance",
              "original",
            );
            await expect(
              page.getByRole("application", {
                name: locale === "es" ? "Mapa interactivo" : "Interactive map",
              }),
            ).toBeVisible();
            const map = await page.locator(".production-map").boundingBox();
            expect(map?.width).toBeGreaterThan(viewport.width * 0.9);
            expect(map?.height).toBeGreaterThan(viewport.height * 0.6);
          }
          if (path === "/saved" || path === "/map") {
            const links = await page
              .getByRole("navigation", {
                name:
                  locale === "es"
                    ? "Navegación de AkiDuermo"
                    : "AkiDuermo navigation",
              })
              .locator("a")
              .evaluateAll((elements) =>
                elements.map((a) => a.getAttribute("href")?.split("?")[0]),
              );
            expect(links).toEqual([
              "/",
              "/map",
              "/saved",
              "/bookings",
              "/account",
            ]);
          }
        }
        expect(consentRequests).toEqual([]);
        await page.screenshot({
          path: `test-results/duermo-${locale}-${theme}-${viewport.width}.png`,
        });
        await page.unrouteAll({ behavior: "wait" });
      });
    }
  }
}
