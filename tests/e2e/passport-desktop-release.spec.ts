import { mkdirSync } from "node:fs";
import { devices, expect, test } from "@playwright/test";

// Explicit desktop input/UA proof, separate from the wider Android-like matrix.
test.use({
  ...devices["Desktop Chrome"],
  viewport: { width: 1440, height: 900 },
  isMobile: false,
  hasTouch: false,
  serviceWorkers: "block",
});

for (const [locale, theme] of [
  ["en", "dark"],
  ["es", "light"],
] as const) {
  test(`explicit desktop ${locale}/${theme} opens cover, restores index and decodes city`, async ({
    page,
  }) => {
    await page.emulateMedia({ colorScheme: theme, reducedMotion: "reduce" });
    await page.addInitScript((value) => {
      localStorage.setItem("akipasa.theme", value);
      document.cookie = "ak_consent_version=2; Path=/";
    }, theme);
    await page.goto(`/${locale}/passports`);
    expect(await page.evaluate(() => navigator.userAgent)).toBe(
      devices["Desktop Chrome"].userAgent,
    );
    expect(await page.evaluate(() => navigator.maxTouchPoints)).toBe(0);
    expect(
      await page.evaluate(() => matchMedia("(pointer: fine)").matches),
    ).toBe(true);
    const book = page.getByRole("main", {
      name: locale === "es" ? "Pasaporte interactivo" : "Interactive passport",
      exact: true,
    });
    const open = book.getByRole("button", {
      name: locale === "es" ? "Abrir pasaporte" : "Open passport",
      exact: true,
    });
    await expect(open).toBeVisible();
    await open.click();
    await expect(page).toHaveURL(/view=index/);
    await page.reload();
    await expect(
      book.getByRole("heading", {
        name: locale === "es" ? "Ciudades" : "Cities",
        exact: true,
        level: 2,
      }),
    ).toBeVisible();
    await book
      .getByRole("searchbox", {
        name: locale === "es" ? "Busca una ciudad" : "Find a city",
      })
      .fill("malaga");
    const city = book.getByRole("button", { name: /^Málaga/ });
    await expect(city.locator("img")).toHaveJSProperty("complete", true);
    expect(
      await city
        .locator("img")
        .evaluate((image: HTMLImageElement) => image.naturalWidth),
    ).toBeGreaterThan(0);
    await city.click();
    await expect(
      book.getByRole("heading", { name: "Málaga", exact: true, level: 2 }),
    ).toBeVisible();
    const photo = book.getByRole("img", { name: /Málaga/ });
    await expect(photo).toHaveJSProperty("complete", true);
    expect(
      await photo.evaluate((image: HTMLImageElement) => image.naturalWidth),
    ).toBeGreaterThan(0);
    const collection = book.getByRole("region", {
      name: locale === "es" ? "Colección de la ciudad" : "City collection",
      exact: true,
    });
    await collection.getByRole("combobox").selectOption("cafe");
    const journal = collection.locator("..");
    const palette = await journal.evaluate((element) => ({
      scheme: getComputedStyle(element).colorScheme,
      ink: getComputedStyle(element).getPropertyValue("--passport-ink").trim(),
      paper: getComputedStyle(element).getPropertyValue("--paper-ink").trim(),
      interfaceInk: getComputedStyle(element.closest("main")!)
        .getPropertyValue("--passport-ink")
        .trim(),
      rootInk: getComputedStyle(document.documentElement)
        .getPropertyValue("--passport-ink")
        .trim(),
    }));
    expect(palette.scheme).toBe("light");
    expect(palette.ink).toBe(palette.paper);
    expect(palette.interfaceInk).toBe(palette.rootInk);
    const photoStamps = book.getByRole("group", {
      name: locale === "es" ? "Sellos en la tarjeta" : "Stamps on this card",
      exact: true,
    });
    expect(
      await photoStamps.evaluate((element) =>
        getComputedStyle(element).getPropertyValue("--passport-surface").trim(),
      ),
    ).toBe("#152a3c");

    const readable = await journal.evaluate((element) => {
      const colour = (value: string) => {
        if (!/^rgba?\(/.test(value)) {
          const canvas = document.createElement("canvas");
          canvas.width = canvas.height = 1;
          const context = canvas.getContext("2d")!;
          context.fillStyle = value;
          context.fillRect(0, 0, 1, 1);
          const pixel = context.getImageData(0, 0, 1, 1).data;
          return [pixel[0], pixel[1], pixel[2], pixel[3] / 255];
        }
        const channels = (value.match(/[\d.]+/g) || []).map(Number);
        return channels.length === 3 ? [...channels, 1] : channels;
      };
      const luminance = (rgb: number[]) =>
        rgb
          .slice(0, 3)
          .map((x) => x / 255)
          .map((x) => (x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4))
          .reduce((sum, x, i) => sum + x * [0.2126, 0.7152, 0.0722][i], 0);
      return [
        ...element.querySelectorAll(
          "h3,h4,p,span,small,summary,label,a,select",
        ),
      ]
        .filter((label) => {
          const box = label.getBoundingClientRect();
          return (
            box.width > 0 &&
            box.height > 0 &&
            !label.closest('[aria-hidden="true"]')
          );
        })
        .map((label) => {
          let node: Element | null = label,
            background = [255, 255, 255];
          while (node) {
            const rgba = colour(getComputedStyle(node).backgroundColor);
            if (rgba[3] === 1) {
              background = rgba;
              break;
            }
            node = node.parentElement;
          }
          const ink = colour(getComputedStyle(label).color);
          let alpha = ink[3];
          node = label;
          while (node && node !== element.parentElement) {
            alpha *= Number(getComputedStyle(node).opacity);
            node = node.parentElement;
          }
          const foreground = ink
            .slice(0, 3)
            .map((channel, i) => channel * alpha + background[i] * (1 - alpha));
          const a = luminance(foreground),
            b = luminance(background);
          return {
            text: label.textContent,
            contrast: (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05),
          };
        });
    });
    for (const label of readable)
      expect(
        label.contrast,
        label.text || "journal text",
      ).toBeGreaterThanOrEqual(4.5);
    const pageBounds = await book
      .getByRole("heading", { name: "Málaga", exact: true, level: 2 })
      .locator("..")
      .boundingBox();
    const controls = await journal
      .locator("select,a,summary")
      .evaluateAll((elements) =>
        elements.map((element) => {
          const box = element.getBoundingClientRect();
          return {
            tag: element.tagName,
            text: element.textContent,
            left: box.left,
            right: box.right,
            width: box.width,
          };
        }),
      );
    for (const control of controls)
      if (control.width) {
        expect(control.left).toBeGreaterThanOrEqual(pageBounds!.x);
        expect(control.right, JSON.stringify(control)).toBeLessThanOrEqual(
          pageBounds!.x + pageBounds!.width,
        );
      }
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    mkdirSync("test-results/passport-desktop-release", { recursive: true });
    await page.screenshot({
      path: `test-results/passport-desktop-release/${locale}-${theme}-city.png`,
      animations: "disabled",
    });
    const explore = book.getByRole("link", {
      name: locale === "es" ? "Explorar la ciudad ↗" : "Explore the city ↗",
      exact: true,
    });
    const destination = await explore.getAttribute("href");
    await explore.click();
    await expect(page).toHaveURL(
      new URL(destination!, "http://127.0.0.1:3107").href,
    );
  });
}
