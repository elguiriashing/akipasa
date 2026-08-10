import { expect, test } from "@playwright/test";

test("guest discovers and filters nationwide events", async ({ page }) => {
  await page.goto("/en");
  await expect(
    page.getByRole("heading", { name: "What’s happening?" }),
  ).toBeVisible();
  await page.getByLabel("Area").selectOption("barcelona");
  await page.getByLabel("Radius").selectOption("25");
  await page.getByRole("button", { name: "Show plans" }).click();
  await expect(page).toHaveURL(/locality=barcelona/);
  await expect(page.locator(".result-caption")).toContainText("in Barcelona");
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
    page.getByRole("heading", { name: "What’s happening?" }),
  ).toBeVisible();
});

test("public discovery, map and legal routes are functional", async ({
  page,
}) => {
  await page.goto("/en");
  await expect(page.locator("main")).toBeVisible();
  await page.goto("/en/map");
  await expect(page.getByRole("heading", { name: "Map" })).toBeVisible();
  await page.goto("/en/privacy");
  await expect(
    page.getByRole("heading", { name: "Your information, under control" }),
  ).toBeVisible();
  await page.goto("/en/terms", { waitUntil: "domcontentloaded" });
  await expect(
    page.getByRole("heading", { name: "Using AkiPasa responsibly" }),
  ).toBeVisible();
});

test("passport console renders one focused sub-page at a time", async ({
  page,
}) => {
  await page.goto("/en/passports");
  const openWorkspaceMenu = () =>
    page.getByRole("button", { name: /Passports menu/ }).click();
  await openWorkspaceMenu();
  await expect(page.getByRole("link", { name: /Progress/ })).toHaveAttribute(
    "aria-current",
    "page",
  );
  await expect(
    page.getByRole("heading", { name: "Explorer progress" }),
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: "Stamp cards" })).toHaveCount(
    0,
  );

  await page.getByRole("link", { name: /Stamps/ }).click();
  await expect(page).toHaveURL(/view=stamps/);
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
  const workspaceMenu = page.getByRole("button", {
    name: /Passports menu/,
  });
  await expect(workspaceMenu).toBeVisible();
  await workspaceMenu.click();
  const sectionNavigation = page.getByRole("navigation", {
    name: "Passports sections",
  });
  await expect(sectionNavigation).toBeVisible();
  await expect(page.locator(".workspace-drawer-layer")).toHaveCSS(
    "position",
    "static",
  );
  await expect(page.locator(".console-nav")).toHaveCount(0);

  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/en/passports");
  await expect(
    page.getByRole("complementary", { name: "Primary navigation" }),
  ).toBeVisible();
  await expect(bottomNavigation).toBeHidden();
  await expect(page.locator(".workspace-sidebar")).toBeVisible();
  await expect(workspaceMenu).toBeHidden();
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
  await expect(
    page.getByRole("link", { name: "View memberships" }),
  ).toHaveAttribute("href", "/en/membership#plans");
  await page.getByRole("link", { name: "View memberships" }).click();
  await expect(page).toHaveURL(/\/en\/membership#plans$/);
  await expect(
    page.getByRole("heading", {
      name: "More local value, without the clutter",
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Choose Personal Premium" }),
  ).toHaveAttribute(
    "href",
    "/en/auth?next=%2Fen%2Faccount%2Fsubscription%3Fplan%3Dpremium",
  );
  await expect(
    page.getByRole("link", { name: "Sign in to continue" }),
  ).toHaveAttribute("href", "/en/auth?next=%2Fen%2Faccount%2Fsubscription");
  const businessPlan = page.locator("#business-plan");
  await expect(
    businessPlan.getByRole("link", { name: "Start the free business review" }),
  ).toHaveAttribute("href", "/en/auth?next=%2Fen%2Fbusiness%2Fapply");
  await expect(
    businessPlan.getByText("No payment today. We review your business first."),
  ).toBeVisible();
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
  expect((await manifest.json()).icons[0].src).toBe("/icon.svg");
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
    mobileMenu.getByRole("link", { name: "Add your business" }),
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
    "mailto:support@akipasa.com",
  );
});

test("location is requested only after a user action and reduced to an area", async ({
  page,
  context,
}) => {
  await context.grantPermissions(["geolocation"]);
  await context.setGeolocation({ latitude: 40.4168, longitude: -3.7038 });
  await page.goto("/en?radius=25&time=all");
  await page.getByRole("button", { name: "Use my location" }).click();
  await expect(page).toHaveURL(/locality=madrid/);
  await expect(page.getByLabel("Area")).toHaveValue("madrid");
  expect(page.url()).not.toContain("40.4168");
});

test("denied location leaves manual discovery fully usable", async ({
  page,
  context,
}) => {
  await context.clearPermissions();
  await page.goto("/en");
  await page.getByRole("button", { name: "Use my location" }).click();
  await expect(
    page.getByText("Permission denied. Choose an area manually."),
  ).toBeVisible();
  await page.getByLabel("Area").selectOption("sevilla");
  await page.getByRole("button", { name: "Show plans" }).click();
  await expect(page).toHaveURL(/locality=sevilla/);
});

test("authentication controls and browser validation are usable", async ({
  page,
}) => {
  await page.goto("/en/auth");
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
  await page.getByText("Sign in without a password").click();
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
