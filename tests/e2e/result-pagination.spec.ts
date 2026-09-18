import { expect, test } from "@playwright/test";

test("nearby businesses page through twenty cards with location preserved", async ({
  page,
}) => {
  await page.goto("/en?latitude=36.539&longitude=-4.624&radius=25");
  const section = page.locator("#venue-results");
  await expect(section.locator("a.card")).toHaveCount(20);
  const first = await section.locator("a.card").first().getAttribute("href");
  await section.getByRole("link", { name: "Next", exact: true }).click();
  await expect(page).toHaveURL(/venuePage=2/);
  await expect(page).toHaveURL(/latitude=36.539/);
  await expect(section.locator("a.card")).toHaveCount(20);
  await expect(section.locator("a.card").first()).not.toHaveAttribute(
    "href",
    first!,
  );
  await section.getByRole("link", { name: "Previous", exact: true }).click();
  await expect(section.locator("a.card").first()).toHaveAttribute(
    "href",
    first!,
  );
});

test("map list is bounded and marker API validates its viewport", async ({
  page,
  request,
}) => {
  await page.goto("/es/map?latitude=36.539&longitude=-4.624&radius=25");
  await expect(page.locator("#venue-results a.card")).toHaveCount(20);
  await expect(
    page.getByRole("heading", { name: "Mapa de eventos", exact: true }),
  ).toBeVisible();
  const invalid = await request.get("/api/map/venues?west=bad");
  expect(invalid.status()).toBe(400);
  const response = await request.get(
    "/api/map/venues?west=-19&east=5&south=27&north=45",
  );
  expect(response.ok()).toBe(true);
  const data = await response.json();
  expect(data.rows.length).toBeLessThanOrEqual(2000);
  expect(typeof data.hasMore).toBe("boolean");
});

test("map API continues beyond its first batch", async ({ request }) => {
  const url = "/api/map/venues?west=-19&east=5&south=27&north=45";
  const first = await (await request.get(url)).json();
  expect(first.hasMore).toBe(true);
  expect(first.nextCursor).toBeTruthy();
  const second = await (
    await request.get(url + "&after=" + first.nextCursor)
  ).json();
  expect(second.rows.length).toBeGreaterThan(0);
  const firstIds = new Set(first.rows.map((row: { id: string }) => row.id));
  expect(second.rows.some((row: { id: string }) => firstIds.has(row.id))).toBe(
    false,
  );
  expect((await request.get(url + "&after=bad")).status()).toBe(400);
});
