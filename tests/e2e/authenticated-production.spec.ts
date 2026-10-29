import { expect, test, type BrowserContext } from "@playwright/test";
import { installAuthenticatedLocalTransport } from "../helpers/authenticated-local-transport";

const email = process.env.AKIPASA_QA_EMAIL;
const password = process.env.AKIPASA_QA_PASSWORD;
const venueId = process.env.AKIPASA_QA_VENUE_ID;

// Browser interception cannot cover service-worker-owned requests.
test.use({ serviceWorkers: "block" });
const transportChecks = new WeakMap<BrowserContext, () => Promise<void>>();
test.afterEach(({ context }) => transportChecks.get(context)?.());

// Opt-in only: use a disposable, fully onboarded administrator with current
// terms accepted and owner membership of a non-accommodation QA venue. Seed
// at least one event/occurrence and enable community_submissions and
// promotion_requests in that staging environment. This read-only suite never
// submits business/admin/media forms;
// only the explicit password sign-in creates a session. Never supply customer
// credentials or use this suite as proof of consumer/staff-only role isolation.
test.describe("disposable authenticated production acceptance", () => {
  test.skip(
    !email || !password || !venueId,
    "Set disposable QA credentials and venue ID to run authenticated checks.",
  );

  test("administrator account and owned venue controls render safely", async ({
    page,
    context,
    baseURL,
  }) => {
    test.setTimeout(180_000);
    const transport = await installAuthenticatedLocalTransport(context, {
      baseURL: baseURL || "",
      projectRef: process.env.BOOKING_STAGING_PROJECT_REF || "",
      supabaseURL: process.env.NEXT_PUBLIC_SUPABASE_URL || "",
    });
    transportChecks.set(context, async () => {
      try {
        transport.assertSafe();
      } finally {
        await transport.close();
      }
    });
    const goto = (path: string, options?: Parameters<typeof page.goto>[1]) =>
      page.goto(new URL(path, transport.origin).href, options);
    await page.setViewportSize({ width: 1280, height: 900 });
    await goto("/en/auth?mode=signin&next=/en/account");
    await expect(
      page.getByRole("heading", { name: "Sign in to AkiPasa", exact: true }),
    ).toBeVisible();
    const signIn = page.locator("form").filter({
      has: page.locator('input[autocomplete="current-password"]'),
    });
    await signIn.locator('input[name="email"]').fill(email!);
    await signIn.locator('input[name="password"]').fill(password!);
    await signIn.getByRole("button", { name: "Sign in" }).click();
    await page.waitForURL("**/en/account");
    await expect(
      page.getByRole("heading", {
        name: "What do you feel like doing?",
        exact: true,
      }),
    ).toBeVisible();
    await expect(
      page.locator('a[href="/en/passports"]').filter({ hasText: "Passport" }),
    ).toBeVisible();

    await goto("/en/community?view=suggest");
    await expect(
      page.getByRole("button", { name: "Submit for review" }),
    ).toBeVisible();
    await goto("/en/business?view=growth");
    const promotion = page
      .locator("details")
      .filter({ hasText: "Request Commercial Promotion" });
    // The current growth panel is expanded by default.
    await expect(promotion).toHaveAttribute("open", "");
    await expect(
      promotion.getByRole("button", { name: "Send request", exact: true }),
    ).toBeVisible();

    for (const route of [
      "/en/account",
      "/en/account/profile",
      "/en/account/saved",
      "/en/account/following",
      "/en/account/rewards",
      "/en/account/activity",
      "/en/account/privacy",
      "/en/account/settings",
      "/en/business",
      "/en/staff",
      "/en/staff/moderation",
      "/en/staff/support",
      "/en/staff/catalogue",
      "/en/staff/promotions",
      "/en/staff/audit",
      "/en/admin",
      "/en/admin/users",
      "/en/admin/catalogue",
      "/en/admin/promotions",
      "/en/admin/privacy",
      "/en/admin/settings",
      "/en/admin/passports",
      "/en/admin/audit",
      `/en/business/venue/${venueId}`,
    ]) {
      const response = await goto(route, {
        waitUntil: "domcontentloaded",
      });
      expect(response?.status(), route).toBe(200);
      // A redirect to auth/onboarding/access-denied can also return HTTP 200.
      // The legacy rewards bookmark deliberately redirects to Passport.
      expect(new URL(page.url()).pathname, route).toBe(
        route === "/en/account/rewards" ? "/en/passports" : route,
      );
      await expect(page.locator("main"), route).toBeVisible();
      const audit = await page.evaluate(() => {
        const visible = (element: HTMLElement) =>
          Boolean(element.offsetWidth || element.offsetHeight);
        const unnamedActions = [
          ...document.querySelectorAll<HTMLElement>("a,button"),
        ]
          .filter(visible)
          .filter(
            (element) =>
              !(
                element.getAttribute("aria-label") ||
                element.getAttribute("title") ||
                element.textContent ||
                ""
              ).trim(),
          ).length;
        const unlabeledFields = [
          ...document.querySelectorAll<HTMLElement>(
            "input:not([type=hidden]),select,textarea",
          ),
        ]
          .filter(visible)
          .filter(
            (element) =>
              !element.getAttribute("aria-label") &&
              !element.closest("label") &&
              !(
                element.id &&
                document.querySelector(`label[for="${element.id}"]`)
              ),
          ).length;
        return {
          unnamedActions,
          unlabeledFields,
          horizontalOverflow:
            document.documentElement.scrollWidth >
            document.documentElement.clientWidth + 1,
        };
      });
      expect(audit, route).toEqual({
        unnamedActions: 0,
        unlabeledFields: 0,
        horizontalOverflow: false,
      });
    }

    await goto("/en/admin");
    await expect(
      page.getByRole("navigation", {
        name: "Administration sections",
        exact: true,
      }),
    ).toBeVisible();
    await goto("/en/admin/users");
    await expect(
      page.getByRole("searchbox", { name: "Search accounts" }),
    ).toBeVisible();
    expect(await page.locator(".user-search-result").count()).toBe(0);

    await goto("/en/admin/settings");
    await expect(
      page.getByRole("heading", { name: "Platform controls" }),
    ).toBeVisible();

    await page.setViewportSize({ width: 360, height: 800 });
    await goto("/en/account");
    await expect(
      page.getByRole("button", { name: "AkiPasa account Your account menu" }),
    ).toBeVisible();
    await page
      .getByRole("button", { name: "AkiPasa account Your account menu" })
      .click();
    await expect(
      page.getByRole("complementary", {
        name: "Your account navigation",
        exact: true,
      }),
    ).toBeVisible();
    expect(
      await page.evaluate(
        () =>
          document.documentElement.scrollWidth >
          document.documentElement.clientWidth + 1,
      ),
    ).toBe(false);
    await page
      .getByRole("button", {
        name: "AkiPasa account Your account menu",
        exact: true,
      })
      .click();
    await expect(
      page.getByRole("complementary", {
        name: "Your account navigation",
        exact: true,
      }),
    ).toBeHidden();
    await page.setViewportSize({ width: 1280, height: 900 });

    await goto(`/en/business/venue/${venueId}?section=events`);
    const event = page
      .locator("details[data-event-card]")
      .filter({
        has: page
          .locator("details > summary")
          .filter({ hasText: "Manage occurrences" }),
      })
      .first();
    await expect(event).toBeVisible();
    await event.locator(":scope > summary").click();
    const occurrences = event
      .locator("details")
      .filter({ hasText: "Manage occurrences" });
    // Each seeded event can have occurrences; inspect one without submitting.
    await expect(occurrences.first()).toBeVisible();
    await occurrences.first().locator("summary").click();

    await expect(
      occurrences
        .first()
        .getByRole("button", { name: "Save occurrence", exact: true })
        .first(),
    ).toBeVisible();
    await expect(
      occurrences
        .first()
        .getByLabel("Booking link for this occurrence", { exact: true })
        .first(),
    ).toBeVisible();
    // Media now uses a shared library and five placement pickers, rather than
    // legacy per-language alt/order forms. Opening/closing the picker is read-only;
    // choosing a library item would persist a placement and is intentionally absent.
    await goto(`/en/business/venue/${venueId}?section=profile`);
    await expect(
      page.getByRole("heading", {
        name: "Five surfaces, one media library.",
        exact: true,
      }),
    ).toBeVisible();
    for (const surface of [
      "Profile / logo",
      "Venue banner",
      "Menu",
      "Event fallback",
      "Explore",
    ]) {
      await expect(
        page.getByRole("button", {
          name: `Choose image: ${surface}`,
          exact: true,
        }),
      ).toBeVisible();
    }
    await page
      .getByRole("button", {
        name: "Choose image: Profile / logo",
        exact: true,
      })
      .click();
    const picker = page.getByRole("dialog", {
      name: "Choose image",
      exact: true,
    });
    await expect(picker).toBeVisible();
    await expect(
      picker.getByRole("searchbox", { name: "Search images", exact: true }),
    ).toBeVisible();
    await picker.getByRole("button", { name: "Close", exact: true }).click();
    await expect(picker).toBeHidden();
    const upload = page.locator("details.media-upload-drawer");
    if ((await upload.getAttribute("open")) === null) {
      await upload.locator("summary").click();
    }
    await expect(
      upload.getByLabel("Shared description (optional)", { exact: true }),
    ).toBeVisible();
    await expect(
      upload.locator('input[type="file"][name="image"]'),
    ).toHaveAttribute("multiple", "");
  });
});
