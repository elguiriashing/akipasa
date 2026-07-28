import { expect, test } from "@playwright/test";

const publicRoutes = [
  "/en",
  "/es",
  "/en/map",
  "/es/map",
  "/en/passports",
  "/es/passports",
  "/en/events/cine-cobalto",
  "/es/events/cine-cobalto",
  "/en/venues/azotea-cobalto",
  "/es/venues/azotea-cobalto",
  "/en/auth",
  "/es/auth",
  "/en/privacy",
  "/es/privacy",
  "/en/terms",
  "/es/terms",
] as const;

test("root, invalid content and all guest gates resolve safely", async ({
  page,
}) => {
  const root = await page.request.get("/", { maxRedirects: 0 });
  expect(root.status()).toBe(307);
  expect(root.headers().location).toBe("/es");

  for (const route of [
    "/en/account",
    "/en/business",
    "/en/staff",
    "/en/staff/support",
    "/en/admin/users",
    "/en/admin",
    "/en/community",
    "/en/terms/accept",
  ]) {
    const response = await page.request.get(route, { maxRedirects: 0 });
    expect(response.status(), route).toBe(307);
    expect(response.headers().location, route).toContain("/en/auth?next=");
  }

  const legacyModeration = await page.request.get("/en/moderation", {
    maxRedirects: 0,
  });
  expect(legacyModeration.status()).toBe(307);
  expect(legacyModeration.headers().location).toBe("/en/staff/moderation");
  const moderationGate = await page.request.get("/en/staff/moderation", {
    maxRedirects: 0,
  });
  expect(moderationGate.status()).toBe(307);
  expect(moderationGate.headers().location).toContain("/en/auth?next=");

  expect(
    (await page.request.get("/en/check-in/not-a-real-token")).status(),
  ).toBe(404);
  expect((await page.request.get("/fr")).status()).toBe(404);
  expect((await page.request.get("/en/events/not-a-real-event")).status()).toBe(
    404,
  );
  expect((await page.request.get("/en/venues/not-a-real-venue")).status()).toBe(
    404,
  );
});

test("every public screen renders without overflow or unnamed controls", async ({
  page,
}) => {
  for (const route of publicRoutes) {
    const response = await page.goto(route, { waitUntil: "domcontentloaded" });
    expect(response?.status(), route).toBe(200);
    await expect(page.locator("main"), route).toBeVisible();

    const audit = await page.evaluate(() => {
      const htmlElements = (selector: string) =>
        Array.from(document.querySelectorAll(selector)).filter(
          (element): element is HTMLElement => element instanceof HTMLElement,
        );
      const visible = (element: HTMLElement) =>
        Boolean(element.offsetWidth || element.offsetHeight);
      const name = (element: HTMLElement) =>
        (
          element.getAttribute("aria-label") ||
          element.getAttribute("title") ||
          element.textContent ||
          ""
        ).trim();
      const unnamedActions = htmlElements("a,button")
        .filter(visible)
        .filter((element) => !name(element))
        .map((element) => element.outerHTML.slice(0, 160));
      const unlabeledFields = htmlElements(
        "input:not([type=hidden]),select,textarea",
      )
        .filter(visible)
        .filter((element) => {
          if (element.getAttribute("aria-label")) return false;
          if (
            element.id &&
            document.querySelector(`label[for="${CSS.escape(element.id)}"]`)
          )
            return false;
          return !element.closest("label");
        })
        .map((element) => element.outerHTML.slice(0, 160));
      return {
        unnamedActions,
        unlabeledFields,
        horizontalOverflow:
          document.documentElement.scrollWidth >
          document.documentElement.clientWidth + 1,
      };
    });

    expect(audit.unnamedActions, `${route}: unnamed action`).toEqual([]);
    expect(audit.unlabeledFields, `${route}: unlabeled field`).toEqual([]);
    expect(audit.horizontalOverflow, `${route}: horizontal overflow`).toBe(
      false,
    );
  }
});

test("all internal links exposed on public screens return successfully", async ({
  page,
}) => {
  test.setTimeout(120_000);
  const paths = new Set<string>();

  for (const route of publicRoutes) {
    await page.goto(route, { waitUntil: "domcontentloaded" });
    const links = await page
      .locator('a[href^="/"]')
      .evaluateAll((elements) =>
        elements.map((element) => (element as HTMLAnchorElement).href),
      );
    links.forEach((href) => {
      const url = new URL(href);
      paths.add(`${url.pathname}${url.search}`);
    });
  }

  for (const path of paths) {
    const response = await page.request.get(path);
    expect(response.status(), path).toBeLessThan(400);
  }
});

test("authentication forms expose safe browser contracts", async ({ page }) => {
  await page.goto("/en/auth");

  const newEmail = page.getByLabel("Email", { exact: true }).first();
  const newPassword = page.getByLabel("Password", { exact: true }).first();
  const signInEmail = page.getByLabel("Email", { exact: true }).nth(1);
  const signInPassword = page.getByLabel("Password", { exact: true }).nth(1);

  await expect(newEmail).toHaveAttribute("autocomplete", "email");
  await expect(newEmail).toHaveAttribute("required", "");
  await expect(newPassword).toHaveAttribute("autocomplete", "new-password");
  await expect(newPassword).toHaveAttribute("minlength", "12");
  await expect(signInEmail).toHaveAttribute("autocomplete", "email");
  await expect(signInPassword).toHaveAttribute(
    "autocomplete",
    "current-password",
  );
  const recovery = page
    .locator("details")
    .filter({ hasText: "Forgot my password" });
  await recovery.locator("summary").click();
  await expect(recovery.getByLabel("Email", { exact: true })).toHaveAttribute(
    "autocomplete",
    "email",
  );
  await expect(
    recovery.getByRole("button", { name: "Send recovery link" }),
  ).toBeVisible();
  const consentCheckboxes = page.locator('input[name="acceptTerms"]');
  expect(await consentCheckboxes.count()).toBe(2);
  await expect(consentCheckboxes.nth(0)).toHaveAttribute("required", "");
  await expect(consentCheckboxes.nth(1)).toHaveAttribute("required", "");

  await newEmail.fill("invalid");
  await newPassword.fill("short");
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page).toHaveURL(/\/en\/auth$/);
});

test("SEO, install and offline assets are coherent and public", async ({
  page,
}) => {
  const robots = await page.request.get("/robots.txt");
  expect(robots.ok()).toBeTruthy();
  const robotsText = await robots.text();
  expect(robotsText).toContain("Sitemap: https://akipasa.com/sitemap.xml");
  expect(robotsText).toContain("Disallow: /en/admin");

  const sitemap = await page.request.get("/sitemap.xml");
  expect(sitemap.ok()).toBeTruthy();
  const sitemapText = await sitemap.text();
  expect(sitemapText).toContain("https://akipasa.com/en");
  expect(sitemapText).toContain("https://akipasa.com/en/events/cine-cobalto");
  expect(sitemapText).not.toContain("/account");
  expect(sitemapText).not.toContain("/admin");

  const manifest = await page.request.get("/manifest.webmanifest");
  const manifestBody = await manifest.json();
  expect(manifestBody.name).toBe("AkiPasa");
  expect(manifestBody.start_url).toBe("/es");
  expect(manifestBody.scope).toBe("/");

  for (const asset of ["/icon.svg", "/offline.html", "/sw.js"]) {
    expect((await page.request.get(asset)).ok(), asset).toBeTruthy();
  }
});

test("locale pages publish canonical and alternate language metadata", async ({
  page,
}) => {
  for (const locale of ["en", "es"] as const) {
    await page.goto(`/${locale}`);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      "href",
      `https://akipasa.com/${locale}`,
    );
    await expect(
      page.locator(`link[rel="alternate"][hreflang="${locale}"]`),
    ).toHaveAttribute("href", `https://akipasa.com/${locale}`);
  }
});

test("analytics endpoint rejects malformed or personal payloads", async ({
  page,
}) => {
  const unsupported = await page.request.post("/api/analytics", {
    data: "not-json",
    headers: { "content-type": "text/plain" },
  });
  expect(unsupported.status()).toBe(415);

  const invalid = await page.request.post("/api/analytics", {
    data: {
      action: "event_view",
      eventId: "not-a-uuid",
      locale: "en",
      email: "must-not-be-collected@example.com",
    },
  });
  expect(invalid.status()).toBe(400);
});
