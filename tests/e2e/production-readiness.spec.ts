import { expect, test } from "@playwright/test";

const publicRoutes = [
  "/en",
  "/es",
  "/en/map",
  "/es/map",
  "/en/passports",
  "/es/passports",
  "/en/membership",
  "/es/membership",
  "/en/auth",
  "/es/auth",
  "/en/privacy",
  "/es/privacy",
  "/en/terms",
  "/es/terms",
] as const;

function canonicalServerUrl(path: string, base: string) {
  const url = new URL(path, base);
  // The local Next server uses localhost in middleware and Route Handler URLs.
  // Keep the request origin consistent when the runner connects over loopback.
  if (url.hostname === "127.0.0.1") url.hostname = "localhost";
  return url;
}

test("root, invalid content and all guest gates resolve safely", async ({
  page,
}) => {
  const root = await page.request.get("/", { maxRedirects: 0 });
  expect(root.status()).toBe(308);
  expect(new URL(root.headers().location, root.url()).href).toBe(
    new URL("/es", root.url()).href,
  );

  for (const route of [
    "/en/account",
    "/en/staff",
    "/en/staff/support",
    "/en/admin/users",
    "/en/admin/venue-relevance",
    "/en/admin",
    "/en/community?view=suggest",
    "/en/community?view=report",
    "/en/terms/accept",
  ]) {
    const response = await page.request.get(route, { maxRedirects: 0 });
    expect(response.status(), route).toBe(307);
    expect(response.headers().location, route).toContain("/en/auth?next=");
  }

  for (const route of ["/en/business", "/en/business/apply"]) {
    const canonical = await page.request.get(route, { maxRedirects: 0 });
    expect(canonical.status(), route).toBe(307);
    expect(canonical.headers().location, route).toBe(
      `https://business.akipasa.com${route}`,
    );
    // Exercise the real Business host through this deployment, without sending
    // the local acceptance run to the live site.
    const gate = await page.request.get(route, {
      headers: { host: "business.akipasa.com" },
      maxRedirects: 0,
    });
    expect(gate.status(), route).toBe(307);
    expect(gate.headers().location, route).toContain("/en/auth?next=");
    expect(gate.headers()["x-robots-tag"], route).toBe("noindex, nofollow");
  }

  const community = await page.request.get("/en/community", {
    maxRedirects: 0,
  });
  expect(community.status()).toBe(200);
  expect((await page.request.get("/en/community/creators")).status()).toBe(200);
  const suggestion = await page.request.get("/en/community?view=suggest", {
    maxRedirects: 0,
  });
  expect(suggestion.status()).toBe(307);
  const auth = new URL(suggestion.headers().location, "https://akipasa.com");
  expect(auth.pathname).toBe("/en/auth");
  expect(auth.searchParams.get("next")).toBe("/en/community?view=suggest");

  const relevanceApi = await page.request.get("/api/admin/venue-relevance");
  expect(relevanceApi.status()).toBe(401);
  expect(relevanceApi.headers()["cache-control"]).toContain("no-store");
  const crossOriginDecision = await page.request.post(
    "/api/admin/venue-relevance",
    {
      headers: { origin: "https://untrusted.example" },
      data: {},
    },
  );
  expect(crossOriginDecision.status()).toBe(403);

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
    const businessPath = /^\/(en|es)\/business(?:\/|\?|$)/.test(path);
    if (businessPath) {
      const canonical = await page.request.get(path, { maxRedirects: 0 });
      expect(canonical.status(), path).toBe(307);
      expect(canonical.headers().location, path).toBe(
        `https://business.akipasa.com${path}`,
      );
    }
    const response = await page.request.get(path, {
      headers: businessPath ? { host: "business.akipasa.com" } : {},
    });
    expect(response.status(), path).toBe(200);
  }
});

test("authentication forms expose safe browser contracts", async ({
  page,
  baseURL,
}) => {
  // The notice has been acknowledged; optional consent remains at its defaults.
  await page
    .context()
    .addCookies([{ name: "ak_consent_version", value: "2", url: baseURL! }]);
  await page.goto("/en/auth");

  const signIn = page.locator("form").filter({
    has: page.getByRole("button", { name: "Sign in", exact: true }),
  });
  const signInEmail = signIn.getByLabel("Email", { exact: true });
  const signInPassword = signIn.getByLabel(/^Password/);
  await expect(signInEmail).toHaveAttribute("autocomplete", "email");
  await expect(signInEmail).toHaveAttribute("required", "");
  await expect(signInPassword).toHaveAttribute(
    "autocomplete",
    "current-password",
  );
  await expect(signInPassword).toHaveAttribute("required", "");

  await page.getByRole("link", { name: "Forgot it?", exact: true }).click();
  await expect(page).toHaveURL(/\/en\/auth\?mode=recover$/);
  const recovery = page.locator("form").filter({
    has: page.getByRole("button", { name: "Send recovery link" }),
  });
  await expect(recovery.getByLabel("Email", { exact: true })).toHaveAttribute(
    "autocomplete",
    "email",
  );
  await expect(recovery.getByLabel("Email", { exact: true })).toHaveAttribute(
    "required",
    "",
  );
  await expect(
    recovery.getByRole("button", { name: "Send recovery link" }),
  ).toBeVisible();

  await page
    .getByRole("navigation", { name: "Access options" })
    .getByRole("link", { name: "Create account", exact: true })
    .click();
  await expect(page).toHaveURL(/\/en\/auth\?mode=signup$/);
  const registration = page.locator("form").filter({
    has: page.getByRole("button", { name: "Create account", exact: true }),
  });
  const newEmail = registration.getByLabel("Email", { exact: true });
  const newPassword = registration.getByLabel("Password", { exact: true });
  const confirmation = registration.getByLabel("Confirm password", {
    exact: true,
  });
  await expect(newEmail).toHaveAttribute("autocomplete", "email");
  await expect(newEmail).toHaveAttribute("required", "");
  for (const password of [newPassword, confirmation]) {
    await expect(password).toHaveAttribute("autocomplete", "new-password");
    await expect(password).toHaveAttribute("minlength", "12");
    await expect(password).toHaveAttribute("required", "");
  }
  const consentCheckboxes = page.locator('input[name="acceptTerms"]');
  await expect(consentCheckboxes).toHaveCount(2);
  await expect(consentCheckboxes.nth(0)).toHaveAttribute("required", "");
  await expect(consentCheckboxes.nth(1)).toHaveAttribute("required", "");

  const submittedRequests: string[] = [];
  await page.route("**/en/auth**", (route) => {
    if (route.request().method() === "POST") {
      submittedRequests.push(route.request().url());
      return route.abort();
    }
    return route.continue();
  });
  await newEmail.fill("invalid");
  await newPassword.fill("short");
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(newEmail).toBeFocused();
  await expect(page).toHaveURL(/\/en\/auth\?mode=signup$/);
  expect(submittedRequests).toEqual([]);
});

test("SEO, install and offline assets are coherent and public", async ({
  page,
}) => {
  const robots = await page.request.get("/robots.txt");
  expect(robots.ok()).toBeTruthy();
  const robotsText = await robots.text();
  expect(robotsText).toContain("Sitemap: https://akipasa.com/sitemap.xml");
  expect(robotsText).toContain("Disallow: /api/");
  // Private pages can be crawled to read their explicit noindex headers.
  const auth = await page.request.get("/en/auth");
  expect(auth.headers()["x-robots-tag"]).toBe("noindex, nofollow");

  const sitemap = await page.request.get("/sitemap.xml");
  expect(sitemap.ok()).toBeTruthy();
  expect(await sitemap.text()).toContain(
    "https://akipasa.com/sitemap-pages.xml",
  );
  expect(sitemap.headers()["set-cookie"]).toBeUndefined();
  const pagesSitemap = await page.request.get("/sitemap-pages.xml");
  expect(pagesSitemap.ok()).toBeTruthy();
  const sitemapText = await pagesSitemap.text();
  expect(sitemapText).toContain("https://akipasa.com/en");
  expect(sitemapText).toContain("https://akipasa.com/en/membership");
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
  baseURL,
}) => {
  const analyticsUrl = canonicalServerUrl("/api/analytics", baseURL!);
  const origin = analyticsUrl.origin;
  const crossOrigin = await page.request.post(analyticsUrl.href, {
    headers: { origin: "https://untrusted.example" },
    data: {},
  });
  expect(crossOrigin.status()).toBe(403);

  const unsupported = await page.request.post(analyticsUrl.href, {
    data: "not-json",
    headers: { "content-type": "text/plain", origin },
  });
  expect(unsupported.status()).toBe(415);

  const invalid = await page.request.post(analyticsUrl.href, {
    headers: { origin },
    data: {
      action: "event_view",
      eventId: "not-a-uuid",
      locale: "en",
      email: "must-not-be-collected@example.com",
    },
  });
  expect(invalid.status()).toBe(400);
});
