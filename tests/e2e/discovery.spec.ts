import { expect, test, type Page } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    document.cookie = "ak_consent_version=2; Path=/";
  });
});

async function openPassportChapters(page: Page) {
  if ((page.viewportSize()?.width ?? 0) <= 700) {
    const menu = page.getByRole("button", {
      name: "Open passport menu",
      exact: true,
    });
    await expect(menu).toBeVisible();
    if ((await menu.getAttribute("aria-expanded")) !== "true") {
      await menu.click();
    }
    await expect(menu).toHaveAttribute("aria-expanded", "true");
  }
  const chapters = page.getByRole("navigation", { name: "Passport chapters" });
  await expect(chapters).toBeVisible();
  return chapters;
}

test("guest discovers and filters nationwide events", async ({ page }) => {
  await page.goto("/en");
  await expect(
    page.getByRole("heading", { name: "Your next plan starts here" }),
  ).toBeVisible();
  await page
    .locator('section[aria-labelledby="city-discovery-title"]')
    .getByRole("link")
    .filter({
      has: page.getByRole("heading", { name: "Barcelona", exact: true }),
    })
    .click();
  await expect(page).toHaveURL(/locality=barcelona/);
  await expect(page.locator("#results .result-caption")).toContainText(
    "in Barcelona",
  );
  await page
    .getByRole("button", { name: "Search AkiPasa", exact: true })
    .click();
  const search = page.getByRole("search", { name: "Search AkiPasa" });
  await expect(search.locator("#global-search-filters")).toHaveAttribute(
    "data-auto-submit-ready",
    "true",
  );
  await expect(
    search.getByRole("combobox", { name: "Area", exact: true }),
  ).toHaveValue("Barcelona");
  await search.getByLabel("Radius", { exact: true }).selectOption("50");
  await expect(page).toHaveURL(/radius=50/);
  await expect(page).toHaveURL(/locality=barcelona/);
  await expect(page.locator("#results .result-caption")).toContainText(
    "in Barcelona",
  );
});

test("language switch preserves route and filters", async ({ page }) => {
  await page.goto("/es?locality=barcelona&radius=25&time=all");
  await page.getByRole("button", { name: "Más opciones" }).click();
  await page
    .getByRole("dialog", { name: "Más opciones" })
    .getByRole("link", { name: "Switch to English" })
    .click();
  await expect(page).toHaveURL(/\/en\?locality=barcelona&radius=25&time=all/);
  await expect(
    page.getByRole("heading", { name: "Your next plan starts here" }),
  ).toBeVisible();
});

test("public discovery, map and legal routes are functional", async ({
  page,
}) => {
  await page.goto("/en");
  await expect(page.locator("main")).toBeVisible();
  await page.goto("/en/map");
  await expect(
    page.getByRole("application", { name: "Interactive map" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "List", exact: true }).click();
  const mapList = page.getByRole("dialog", { name: "Nearby here" });
  await expect(mapList).toBeVisible();
  await mapList
    .getByRole("button", { name: "Close list", exact: true })
    .click();
  await expect(mapList).toBeHidden();
  await page.goto("/en/privacy");
  await expect(
    page.getByRole("heading", { name: "Your information, under control" }),
  ).toBeVisible();
  await page.goto("/en/terms", { waitUntil: "domcontentloaded" });
  await expect(
    page.getByRole("heading", { name: "Using AkiPasa responsibly" }),
  ).toBeVisible();
});

test("passport notebook opens chapters in place", async ({ page }) => {
  await page.goto("/en/passports");
  await page
    .getByRole("button", { name: "Open passport", exact: true })
    .click();
  await expect(
    page.getByRole("searchbox", { name: "Find a city" }),
  ).toBeVisible();
  await (await openPassportChapters(page))
    .getByRole("button", { name: /My journey/ })
    .click();
  await expect(
    page.getByRole("heading", { name: "Explorer progress" }),
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: "Stamp cards" })).toHaveCount(
    0,
  );
  await (await openPassportChapters(page))
    .getByRole("button", { name: /Loyalty/ })
    .click();
  await expect(
    page.getByRole("heading", { name: "Stamp cards" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Explorer progress" }),
  ).toHaveCount(0);
});

test("mobile navigation is compact and opens section links in place", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/en");

  const bottomNavigation = page.getByRole("navigation", {
    name: "Navigation",
  });
  await expect(bottomNavigation).toBeVisible();
  await expect(
    page.getByRole("complementary", { name: "Primary navigation" }),
  ).toBeHidden();
  await page.getByRole("button", { name: "More options" }).click();
  await expect(
    page.getByRole("dialog", { name: "More options" }),
  ).toBeVisible();
  await expect(
    page
      .getByRole("dialog", { name: "More options" })
      .getByRole("link", { name: "Membership" }),
  ).toHaveAttribute("href", "/en/membership");

  await page.goto("/en/passports");
  const chapters = page.getByRole("navigation", { name: "Passport chapters" });
  await expect(chapters).toBeHidden();
  await openPassportChapters(page);
  await expect(chapters.locator(":scope > button")).toHaveCount(6);
  await chapters.getByRole("button", { name: /Cities/ }).click();
  await expect(
    page.getByRole("searchbox", { name: "Find a city" }),
  ).toBeVisible();
  await expect(chapters).toBeHidden();
  await expect(page.locator(".console-nav")).toHaveCount(0);
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/en/passports");
  await expect(
    page.getByRole("complementary", { name: "Primary navigation" }),
  ).toBeVisible();
  await expect(bottomNavigation).toBeHidden();
  await expect(chapters).toBeVisible();
});

test("membership offer is reachable before sign in", async ({ page }) => {
  await page.goto("/en");
  await expect(page.locator(".owner-entry")).toHaveCount(0);
  const ownerEntry = page.locator(".owner-nudge");
  await expect(
    ownerEntry.getByRole("link", { name: "List it on AkiPasa" }),
  ).toHaveAttribute("href", "/en/business/apply");
  await expect(ownerEntry.getByText("Run a business?")).toBeVisible();
  await expect(page.locator("#results ~ .owner-nudge")).toBeVisible();
  await page.getByRole("button", { name: "More options" }).click();
  const membershipLink = page
    .getByRole("dialog", { name: "More options" })
    .getByRole("link", { name: "Membership", exact: true });
  await expect(membershipLink).toHaveAttribute("href", "/en/membership");
  await membershipLink.click();
  await expect(page).toHaveURL(/\/en\/membership$/);
  await expect(
    page.getByRole("heading", {
      name: "Membership",
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Aki Enterprise" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "AkiBusiness Premium", exact: true }),
  ).toBeVisible();
  const catalogue = page.locator(
    'section[aria-labelledby="akisuite-catalogue-title"]',
  );
  await expect(catalogue.locator("article")).toHaveCount(7);
  await expect(catalogue.locator("article button[type=submit]").first()).toBeDisabled();
});

test("business intent survives account creation", async ({ page }) => {
  await page.goto("/en/auth?next=%2Fen%2Fbusiness%2Fapply");
  await expect(
    page.getByRole("heading", { name: "First, create your free account" }),
  ).toBeVisible();
  await expect(page.getByText("Next: business details")).toBeVisible();
  await expect(page.locator('input[name="next"]').first()).toHaveValue(
    "/en/business/apply",
  );
});

test("account-only actions redirect guests safely", async ({ page }) => {
  await page.goto("/en/auth?next=%2Fen%2Fbusiness%2Fapply", {
    waitUntil: "domcontentloaded",
  });
  await expect(
    page.getByRole("heading", { name: "First, create your free account" }),
  ).toBeVisible();
  const response = await page.request.get("/en/account/export");
  expect(response.status()).toBe(401);
});

test("manifest and favicon are served", async ({ page }) => {
  const manifest = await page.request.get("/manifest.webmanifest");
  expect(manifest.ok()).toBeTruthy();
  expect((await manifest.json()).icons[0].src).toBe("/pwa-icon.svg");
  const appIcon = await page.request.get("/pwa-icon.svg");
  expect(appIcon.ok()).toBeTruthy();
  expect(appIcon.headers()["content-type"]).toContain("image/svg+xml");
  const icon = await page.request.get("/icon.svg");
  expect(icon.ok()).toBeTruthy();
  expect(icon.headers()["content-type"]).toContain("image/svg+xml");
});

test("primary navigation, footer and document language are correct", async ({
  page,
}) => {
  await page.goto("/en");
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  const primary = page.getByRole("navigation", { name: "Navigation" });
  await expect(primary.getByRole("link", { name: "Discover" })).toHaveAttribute(
    "href",
    "/en",
  );
  await expect(primary.getByRole("link", { name: "Map" })).toHaveAttribute(
    "href",
    "/en/map",
  );
  await expect(
    primary.getByRole("link", { name: "Community" }),
  ).toHaveAttribute("href", "/en/community");
  await expect(primary.getByRole("link", { name: "Account" })).toHaveAttribute(
    "href",
    "/en/account",
  );
  for (const name of ["Discover", "Map", "Community", "Account"]) {
    await expect(primary.getByRole("link", { name })).toBeVisible();
  }
  await page.getByRole("button", { name: "More options" }).click();
  const mobileMenu = page.getByRole("dialog", { name: "More options" });
  await expect(
    mobileMenu.getByRole("link", { name: "Passports" }),
  ).toHaveAttribute("href", "/en/passports");
  await expect(
    mobileMenu.getByRole("link", { name: "Membership" }),
  ).toHaveAttribute("href", "/en/membership");
  await expect(
    page
      .locator(".owner-nudge")
      .getByRole("link", { name: "List it on AkiPasa" }),
  ).toHaveAttribute("href", "/en/business/apply");
  await expect(mobileMenu.getByRole("link", { name: "Sign in" })).toBeVisible();
  await expect(
    mobileMenu.getByRole("link", { name: "Cambiar a español" }),
  ).toBeVisible();
  const legal = page.getByRole("navigation", { name: "Legal information" });
  await expect(legal.getByRole("link", { name: "Privacy" })).toHaveAttribute(
    "href",
    "/en/privacy",
  );
  await expect(legal.getByRole("link", { name: "Terms" })).toHaveAttribute(
    "href",
    "/en/terms",
  );
  await expect(legal.getByRole("link", { name: "Contact" })).toHaveAttribute(
    "href",
    "mailto:support@akipasa.com?subject=Help%20with%20AkiPasa",
  );
});

test("location is requested only after a user action and reduced to an area", async ({
  page,
  context,
}) => {
  await context.clearPermissions();
  await context.setGeolocation({ latitude: 40.4168123, longitude: -3.7038123 });
  await page.addInitScript(() => {
    const getCurrentPosition = navigator.geolocation.getCurrentPosition.bind(
      navigator.geolocation,
    );
    const observedWindow = Object.assign(window, { locationRequests: 0 });
    navigator.geolocation.getCurrentPosition = (...args) => {
      observedWindow.locationRequests += 1;
      getCurrentPosition(...args);
    };
  });
  await page.goto("/en?radius=25&time=all");
  const nearby = page.locator('section[aria-labelledby="nearby-cities-title"]');
  const locate = nearby.getByRole("button", {
    name: "Use my location",
    exact: true,
  });
  await expect(locate).toBeEnabled();
  expect(
    await page.evaluate(() => Reflect.get(window, "locationRequests")),
  ).toBe(0);
  await context.grantPermissions(["geolocation"]);
  await locate.click();
  await expect(
    nearby.getByRole("heading", { name: "Cities near you", exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(() => Reflect.get(window, "locationRequests")),
  ).toBe(1);
  expect(page.url()).not.toContain("40.4168123");
  expect(page.url()).not.toContain("-3.7038123");
  await nearby
    .getByRole("link")
    .filter({ has: page.getByRole("heading", { name: "Madrid", exact: true }) })
    .click();
  await expect(page).toHaveURL(/locality=madrid/);
  await expect(page.locator("#results .result-caption")).toContainText(
    "in Madrid",
  );
  expect(page.url()).not.toContain("40.4168123");
  expect(page.url()).not.toContain("-3.7038123");
});

test("denied location leaves manual discovery fully usable", async ({
  page,
  context,
}) => {
  await context.clearPermissions();
  await page.addInitScript(() => {
    navigator.geolocation.getCurrentPosition = (_success, error) => {
      error?.({
        code: 1,
        message: "Permission denied",
        PERMISSION_DENIED: 1,
        POSITION_UNAVAILABLE: 2,
        TIMEOUT: 3,
      });
    };
  });
  await page.goto("/en");
  await page
    .locator('section[aria-labelledby="nearby-cities-title"]')
    .getByRole("button", { name: "Use my location", exact: true })
    .click();
  await expect(
    page.getByText("Permission denied. You can choose an area in search."),
  ).toBeVisible();
  await page
    .locator('section[aria-labelledby="city-discovery-title"]')
    .getByRole("link")
    .filter({
      has: page.getByRole("heading", { name: "Seville", exact: true }),
    })
    .click();
  await expect(page).toHaveURL(/locality=sevilla/);
  await expect(page.locator("#results .result-caption")).toContainText(
    "in Seville",
  );
});

test("authentication controls and browser validation are usable", async ({
  page,
}) => {
  await page.goto("/en/auth");
  await page
    .getByRole("navigation", { name: "Access options" })
    .getByRole("link", { name: "Create account", exact: true })
    .click();
  await expect(page).toHaveURL(/mode=signup/);
  await expect(
    page.getByRole("button", { name: "Continue with Google" }),
  ).toBeVisible();
  const create = page.getByRole("button", { name: "Create account" });
  await expect(create).toBeVisible();
  const password = page.getByLabel("Password", { exact: true }).first();
  await expect(password).toHaveAttribute("minlength", "12");
  await expect(password).toHaveAttribute("autocomplete", "new-password");
  await expect(
    page.getByText("12+ characters with uppercase, lowercase, and a number."),
  ).toBeVisible();
  const termsConsent = page.locator('input[name="acceptTerms"]');
  expect(await termsConsent.count()).toBe(2);
  await expect(termsConsent.nth(0)).toHaveAttribute("required", "");
  await expect(termsConsent.nth(1)).toHaveAttribute("required", "");
  await page
    .getByRole("link", { name: "Use a sign-in link", exact: true })
    .click();
  await expect(page).toHaveURL(/mode=magic/);
  await expect(
    page.getByRole("heading", {
      name: "Sign in without a password",
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Send sign-in link" }),
  ).toBeVisible();
});

test("public responses include baseline security headers", async ({ page }) => {
  const response = await page.request.get("/en");
  expect(response.headers()["content-security-policy"]).toContain(
    "default-src 'self'",
  );
  expect(response.headers()["x-frame-options"]).toBe("DENY");
  expect(response.headers()["x-content-type-options"]).toBe("nosniff");
  expect(response.headers()["referrer-policy"]).toBe(
    "strict-origin-when-cross-origin",
  );
});
