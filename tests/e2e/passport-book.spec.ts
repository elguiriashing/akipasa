import { expect, test } from "@playwright/test";
// Passport interactions model returning visitors; privacy tests exercise first load.
test.beforeEach(async ({ page }, testInfo) => {
  if (!/accept all|reject optional|passport fits/.test(testInfo.title)) {
    await page.addInitScript(() => {
      document.cookie = "ak_consent_version=2; Path=/";
    });
  }
});

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
    page.getByRole("link", { name: "Explore the city ↗" }),
  ).toHaveAttribute("href", /locality=malaga/);
  await page
    .getByRole("heading", { name: "Málaga", exact: true, level: 2 })
    .press("ArrowRight");
  await expect(
    page.getByRole("heading", { name: "Málaga", exact: true, level: 2 }),
  ).toHaveCount(0);
  await page.locator("h2").filter({ hasText: /.+/ }).first().press("ArrowLeft");
  await expect(page.getByRole("button", { name: "Previous page" })).toHaveCount(
    0,
  );
  await expect(page.getByRole("button", { name: "Next page" })).toHaveCount(0);
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
  await expect(page.getByRole("button", { name: "Enable tilt" })).toBeVisible();
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
  await expect(page.getByRole("button", { name: "Enable tilt" })).toBeVisible();
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
  const index = page.getByRole("heading", { name: "Cities", exact: true });
  await index.dispatchEvent("touchstart", {
    touches: [{ identifier: 1, clientX: 200, clientY: 200 }],
  });
  await index.dispatchEvent("touchend", {
    changedTouches: [{ identifier: 1, clientX: 190, clientY: 380 }],
  });
  await expect(index).toBeVisible();
});

test("default tilt calibrates while unearned city cards stay still", async ({
  page,
}) => {
  await page.goto("/en/passports");
  await expect(
    page.getByRole("button", { name: "Disable tilt" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Open passport" }).click();
  await page.getByRole("searchbox", { name: "Find a city" }).fill("malaga");
  await page.getByRole("button", { name: /^Málaga/ }).click();
  const card = page.locator("[data-finish]");
  const book = page.locator('[data-tilt="on"]');
  await page.evaluate(() =>
    window.dispatchEvent(
      new DeviceOrientationEvent("deviceorientation", { beta: 63, gamma: 18 }),
    ),
  );
  await expect
    .poll(() =>
      card.evaluate((el) =>
        Number.parseFloat((el as HTMLElement).style.getPropertyValue("--ry")),
      ),
    )
    .toBe(0);
  await page.evaluate(() =>
    window.dispatchEvent(
      new DeviceOrientationEvent("deviceorientation", { beta: 75, gamma: 32 }),
    ),
  );
  await expect
    .poll(() =>
      card.evaluate((el) =>
        Number.parseFloat((el as HTMLElement).style.getPropertyValue("--ry")),
      ),
    )
    .toBeGreaterThan(1);
  await expect
    .poll(() => card.evaluate((el) => getComputedStyle(el).transform))
    .toBe("none");
  await expect(book).toHaveCSS("transform", "none");
  await expect(
    page.getByRole("link", { name: "Explore the city ↗" }),
  ).toBeVisible();
});

test("accept all requests required motion permission within the click", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(window.DeviceOrientationEvent, "requestPermission", {
      value: async () => {
        (window as Window & { motionRequests?: number }).motionRequests =
          ((window as Window & { motionRequests?: number }).motionRequests ||
            0) + 1;
        return "granted";
      },
      configurable: true,
    });
  });
  await page.route("**/api/v1/personalisation/consent", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: "{}" }),
  );
  await page.goto("/en");
  await page.getByRole("button", { name: "Accept all", exact: true }).click();
  expect(
    await page.evaluate(
      () => (window as Window & { motionRequests?: number }).motionRequests,
    ),
  ).toBe(1);
  expect(
    await page.evaluate(() => localStorage.getItem("akipasa:passport-motion")),
  ).toBe("on");
  await page.goto("/en/passports");
  await expect(
    page.getByRole("button", { name: "Disable tilt" }),
  ).toBeVisible();
});

test("reject optional disables motion without requesting sensor permission", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(window.DeviceOrientationEvent, "requestPermission", {
      value: async () => {
        throw new Error("Should not request motion");
      },
      configurable: true,
    });
  });
  await page.route("**/api/v1/personalisation/consent", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: "{}" }),
  );
  await page.goto("/en/passports");
  await page
    .getByRole("button", { name: "Reject optional", exact: true })
    .click();
  await expect(page.locator('[data-tilt="off"]')).toBeVisible();
  expect(
    await page.evaluate(() => localStorage.getItem("akipasa:passport-motion")),
  ).toBe("off");
  await page.reload();
  await expect(page.getByRole("button", { name: "Enable tilt" })).toBeVisible();
});

for (const viewport of [
  { name: "small phone", width: 320, height: 740, columns: 3, spread: 1 },
  { name: "phone", width: 390, height: 844, columns: 3, spread: 1 },
  { name: "tablet portrait", width: 820, height: 1180, columns: 6, spread: 1 },
  { name: "tablet landscape", width: 1024, height: 768, columns: 6, spread: 2 },
  { name: "desktop", width: 1440, height: 1000, columns: 1, spread: 2 },
]) {
  test(`passport fits ${viewport.name} with comfortable controls`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await page.route("**/api/v1/personalisation/consent", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: "{}",
      }),
    );
    await page.goto("/en/passports");
    const privacy = page.locator("aside.personalisation-consent");
    await expect(privacy).toBeVisible();
    expect(
      await privacy.evaluate((el) => {
        const r = el.getBoundingClientRect();
        return (
          r.x >= 0 &&
          r.right <= innerWidth &&
          r.y >= 0 &&
          r.bottom <= innerHeight
        );
      }),
    ).toBe(true);
    await privacy
      .getByRole("button", { name: "Accept all", exact: true })
      .click();
    const bookmarks = page.getByRole("navigation", {
      name: "Passport chapters",
    });
    expect(
      await bookmarks.evaluate(
        (el) => getComputedStyle(el).gridTemplateColumns.split(" ").length,
      ),
    ).toBe(viewport.columns);
    await page.getByRole("button", { name: "Open passport" }).click();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.getByRole("searchbox", { name: "Find a city" }).fill("malaga");
    await page.getByRole("button", { name: /^Málaga/ }).click();
    expect(
      await page
        .getByRole("link", { name: "Explore the city ↗" })
        .evaluate(
          (el) =>
            getComputedStyle(
              el.parentElement!.parentElement!,
            ).gridTemplateColumns.split(" ").length,
        ),
    ).toBe(viewport.spread);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    expect(
      await page
        .locator("main button, main a.button, main summary")
        .evaluateAll((elements) =>
          elements
            .filter((el) => {
              const r = el.getBoundingClientRect();
              return (
                r.width > 0 && r.height > 0 && (r.width < 44 || r.height < 44)
              );
            })
            .map((el) => el.textContent),
        ),
    ).toEqual([]);
    await page.screenshot({
      path: `test-results/passport-${viewport.name.replaceAll(" ", "-")}.png`,
      fullPage: true,
    });
  });
}

test("unearned city cards stay plain and expose ten inline category stamps", async ({
  page,
}) => {
  await page.goto("/en/passports?city=fuengirola");
  const card = page.locator("[data-finish]");
  await expect(card).toHaveAttribute("data-finish", "plain");
  await expect(card).toHaveAttribute("data-shine", "false");
  await expect(page.getByRole("img", { name: /Fuengirola/ })).toHaveAttribute(
    "src",
    "/passport-placeholder.svg",
  );
  await expect(page.locator("button[data-tier]")).toHaveCount(10);
  await expect(page.getByTestId("passport-negative")).toBeHidden();
  await expect(page.getByTestId("passport-echo")).toBeHidden();
  await page.locator("button[data-tier]").first().click();
  await expect(
    page.getByRole("button", { name: "Close details" }),
  ).toBeVisible();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.getByRole("button", { name: "Close details" }).click();
  await expect(page.getByRole("button", { name: "Close details" })).toHaveCount(
    0,
  );
});
