import { expect, test } from "@playwright/test";

test("relevance review requires authentication and rejects cross-origin decisions", async ({
  page,
}) => {
  for (const locale of ["es", "en"]) {
    const response = await page.request.get(
      `/${locale}/admin/venue-relevance`,
      { maxRedirects: 0 },
    );
    expect(response.status()).toBe(307);
    expect(response.headers().location).toContain(`/${locale}/auth?next=`);
  }
  const review = await page.request.get("/api/admin/venue-relevance");
  expect(review.status()).toBe(401);
  expect(review.headers()["cache-control"]).toContain("no-store");
  expect(await review.json()).toEqual({ error: "Sign in required" });
  const decision = await page.request.post("/api/admin/venue-relevance", {
    headers: { origin: "https://untrusted.example" },
    data: {},
  });
  expect(decision.status()).toBe(403);
  expect(await decision.json()).toEqual({
    error: "Same-origin request required",
  });
});

test("current city discovery and accommodation navigation survive the audit release", async ({
  page,
}) => {
  await page.addInitScript(() => {
    document.cookie = "ak_consent_version=2; Path=/";
  });
  await page.goto("/en", { waitUntil: "domcontentloaded" });
  await expect(
    page.getByRole("heading", {
      name: "Your next plan starts here",
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: /Madrid —/ }).first(),
  ).toBeVisible();
  await page.goto("/en/map", { waitUntil: "domcontentloaded" });
  await expect(
    page.getByRole("heading", { name: "Event map", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Accommodation", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Accommodation", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.goto("/en/passports", { waitUntil: "domcontentloaded" });
  await expect(
    page.getByRole("main", { name: "Interactive passport" }),
  ).toBeVisible();
});
