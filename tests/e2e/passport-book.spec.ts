import { expect, test } from "@playwright/test";

test("city pages reuse discovery photos, turn with keys, and expose real discovery links", async ({
  page,
}) => {
  await page.goto("/en/passports");
  await page.getByRole("button", { name: "Open passport" }).click();
  await page.getByRole("searchbox", { name: "Find a city" }).fill("malaga");
  await page.getByRole("button", { name: /^Málaga/ }).click();
  const photo = page.getByRole("img", { name: /Málaga/ });
  await expect(photo).toHaveAttribute("src", "/images/cities/malaga.webp");
  await expect(photo).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Explore Málaga" }),
  ).toHaveAttribute("href", /locality=malaga/);
  await page
    .getByRole("heading", { name: "Málaga", exact: true, level: 2 })
    .press("ArrowRight");
  await expect(
    page.getByRole("heading", { name: "Málaga", exact: true, level: 2 }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Previous page" }).click();
  await expect(
    page.getByRole("heading", { name: "Málaga", exact: true, level: 2 }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Foil: ON" }).click();
  await expect(page.locator('[data-shine="false"]')).toBeVisible();
});

test("legacy chapter URLs and reward feedback remain available", async ({
  page,
}) => {
  await page.goto("/en/passports?view=stamps&reward=ready");
  await expect(
    page.getByRole("heading", { name: "Stamp cards" }),
  ).toBeVisible();
  await expect(
    page.getByText("Reward ready. Your code appears in Progress."),
  ).toBeVisible();
});

test("reduced motion disables tilt and page rotation", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/es/passports");
  await expect(
    page.getByRole("button", { name: "Activar inclinación" }),
  ).toBeDisabled();
  await expect(page.locator('[data-motion="off"]')).toBeVisible();
  await expect(page.locator('[data-shine="false"]')).toBeVisible();
  await page.getByRole("button", { name: "Abrir pasaporte" }).click();
  await expect(
    page.getByRole("searchbox", { name: "Busca una ciudad" }),
  ).toBeVisible();
});

test("denied motion permission falls back to touch", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window.DeviceOrientationEvent, "requestPermission", {
      value: async () => "denied",
      configurable: true,
    });
  });
  await page.goto("/en/passports");
  await page.getByRole("button", { name: "Enable tilt" }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "Motion unavailable" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Enable tilt" }),
  ).toHaveAttribute("aria-pressed", "false");
});

test("granted tilt drives the foil and can be recentered", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window.DeviceOrientationEvent, "requestPermission", {
      value: async () => "granted",
      configurable: true,
    });
  });
  await page.goto("/en/passports");
  await page.getByRole("button", { name: "Enable tilt" }).click();
  await page.evaluate(() => {
    window.dispatchEvent(
      new DeviceOrientationEvent("deviceorientation", { beta: 40, gamma: 0 }),
    );
    window.dispatchEvent(
      new DeviceOrientationEvent("deviceorientation", { beta: 52, gamma: 14 }),
    );
  });
  await expect(
    page.getByRole("status").filter({ hasText: "Tilt gently" }),
  ).toBeVisible();
  const foil = page.locator('[data-shine="true"]');
  await expect
    .poll(() =>
      foil.evaluate((el) =>
        Number.parseFloat((el as HTMLElement).style.getPropertyValue("--mx")),
      ),
    )
    .toBeGreaterThan(60);
  await page.getByRole("button", { name: "Recenter" }).click();
  await expect
    .poll(() =>
      foil.evaluate((el) =>
        Math.abs(
          Number.parseFloat(
            (el as HTMLElement).style.getPropertyValue("--mx"),
          ) - 50,
        ),
      ),
    )
    .toBeLessThan(0.1);
});

test("horizontal touch gestures turn pages without changing vertical scroll", async ({
  page,
}) => {
  await page.goto("/en/passports");
  const heading = page.getByRole("heading", { name: "Cover", exact: true });
  await heading.dispatchEvent("touchstart", {
    touches: [{ identifier: 1, clientX: 300, clientY: 200 }],
  });
  await heading.dispatchEvent("touchend", {
    changedTouches: [{ identifier: 1, clientX: 180, clientY: 202 }],
  });
  await expect(
    page.getByRole("searchbox", { name: "Find a city" }),
  ).toBeVisible();
  const index = page.getByRole("heading", { name: "Index", exact: true });
  await index.dispatchEvent("touchstart", {
    touches: [{ identifier: 1, clientX: 200, clientY: 200 }],
  });
  await index.dispatchEvent("touchend", {
    changedTouches: [{ identifier: 1, clientX: 190, clientY: 380 }],
  });
  await expect(index).toBeVisible();
});
