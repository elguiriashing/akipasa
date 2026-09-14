import { expect as baseExpect, test } from "@playwright/test";

// Development route compilation on the Windows acceptance host can exceed
// the default assertion timeout; the assertions still require real updates.
const expect = baseExpect.configure({ timeout: 60_000 });
test.setTimeout(300_000);
test.use({ navigationTimeout: 120_000 });

for (const width of [360, 390, 768, 1440]) {
  test(`city tiles and dropdown fit ${width}px screens`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto("/en", { waitUntil: "domcontentloaded" });
    await expect(
      page.getByRole("heading", { name: "Your next plan starts here" }),
    ).toBeVisible();
    const featured = page.locator(
      'section[aria-labelledby="city-discovery-title"]',
    );
    await expect(featured.getByRole("link")).toHaveCount(5);
    await expect(page.locator(".hero")).toHaveCount(0);
    await expect(page.locator("#site-search-panel")).toBeHidden();
    await page
      .getByRole("button", { name: "Search plans", exact: true })
      .click();
    const search = page.getByRole("search", { name: "Search plans" });
    await expect(search).toBeVisible();
    await search.getByLabel("Radius", { exact: true }).selectOption("50");
    await expect(page).toHaveURL(/radius=50/);
    await search.getByText("More filters", { exact: true }).click();
    await search.locator('input[name="accessible"]').check();
    await expect(page).toHaveURL(/accessible=on/);
    await search.getByLabel("Radius", { exact: true }).selectOption("100");
    await expect(page).toHaveURL(/radius=100/);
    await expect(search.locator('input[name="accessible"]')).toBeChecked();
    await page.keyboard.press("Escape");
    await expect(search).toBeHidden();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    for (const image of await featured.locator("img").all()) {
      await image.scrollIntoViewIfNeeded();
      await expect
        .poll(() =>
          image.evaluate(
            (el: HTMLImageElement) => el.complete && el.naturalWidth > 0,
          ),
        )
        .toBe(true);
    }
    await featured.getByRole("link").first().click();
    await expect(page).toHaveURL(/locality=madrid.*#results/);
    await expect(
      page.locator("#results + p, #results .result-caption"),
    ).toContainText("Madrid");
    expect(errors).toEqual([]);
  });
}

test("GPS selects the closest three major cities and updates when location changes", async ({
  page,
  context,
}) => {
  await context.grantPermissions(["geolocation"]);
  await context.setGeolocation({ latitude: 42.2406, longitude: -8.7207 });
  await page.goto("/en", { waitUntil: "domcontentloaded" });
  const nearby = page.locator('section[aria-labelledby="nearby-cities-title"]');
  await expect(
    nearby.getByRole("heading", { name: "Cities near you" }),
  ).toBeVisible();
  await expect(nearby.locator("h3")).toHaveText([
    "Vigo",
    "Pontevedra",
    "Ourense",
  ]);
  await context.setGeolocation({ latitude: 28.4636, longitude: -16.2518 });
  await page.getByRole("button", { name: "Search plans", exact: true }).click();
  await page
    .getByRole("search")
    .getByRole("button", { name: "Use my location" })
    .click();
  await expect(nearby.locator("h3")).toHaveText([
    "Santa Cruz de Tenerife",
    "San Cristóbal de La Laguna",
    "Las Palmas",
  ]);
});

test("denied GPS uses the labelled selected area and global search works from other routes", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "geolocation", {
      value: {
        getCurrentPosition: (
          _success: unknown,
          failure: (error: { code: number }) => void,
        ) => setTimeout(() => failure({ code: 1 }), 0),
      },
    });
  });
  await page.goto("/en?locality=bilbao", { waitUntil: "domcontentloaded" });
  await page
    .getByRole("button", { name: "Use my location", exact: true })
    .click();
  await expect(
    page.getByText("Permission denied. You can choose an area in search."),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Cities near Bilbao" }),
  ).toBeVisible();
  await page.goto("/en/privacy", { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: "Search plans", exact: true }).click();
  await page
    .getByRole("search")
    .getByLabel("Radius", { exact: true })
    .selectOption("50");
  await expect(page).toHaveURL(/\/en\?.*radius=50/);
  await page.goto("/en/map", { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: "Search plans", exact: true }).click();
  await page
    .getByRole("search")
    .getByLabel("Radius", { exact: true })
    .selectOption("100");
  await expect(page).toHaveURL(/\/en\/map\?.*radius=100/);
});
