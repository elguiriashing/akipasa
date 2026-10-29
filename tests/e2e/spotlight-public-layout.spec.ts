import { writeFile } from "node:fs/promises";
import { expect, test, type Locator, type Page } from "@playwright/test";

type Locale = "en" | "es";
type Fixture = {
  venue: { id: string; slug: string; name: string };
  event: {
    id: string;
    slug: string;
    title: Record<Locale, string>;
    occurrenceId: string;
    startsAt: string;
    endsAt: string;
  };
  siteUrl: string;
};

const viewports = [
  { name: "small-phone", width: 360, height: 800 },
  { name: "phone", width: 390, height: 844 },
  { name: "split-window", width: 600, height: 500 },
  { name: "portrait-tablet", width: 820, height: 1312 },
  { name: "landscape-tablet", width: 1280, height: 800 },
  { name: "desktop", width: 1536, height: 960 },
] as const;

test.describe("Spotlight public route acceptance", () => {
  // The dedicated command runs in required tablet CI. Generic site acceptance
  // has an intentionally empty catalogue and cannot provide these detail rows.
  test.skip(
    process.env.SPOTLIGHT_E2E !== "1",
    "Run npm run test:spotlight:browser: it provisions isolated detail data and runs this required CI matrix.",
  );
  test.use({ isMobile: false, deviceScaleFactor: 1 });
  let fixture: Fixture;

  test.beforeAll(async ({ request }) => {
    const response = await request.get("/__spotlight_fixture");
    expect(response.status()).toBe(200);
    fixture = (await response.json()) as Fixture;
    expect(new URL(fixture.siteUrl).hostname).toBe("127.0.0.1");
  });

  test.beforeEach(async ({ page, context }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await context.addCookies([
      { name: "ak_consent_version", value: "2", url: fixture.siteUrl },
    ]);
    await page.route(/^https?:\/\//, (route) => {
      // Share, booking, directions and contact tests never contact real sites.
      return new URL(route.request().url()).origin === fixture.siteUrl
        ? route.continue()
        : route.abort();
    });
    await page.addInitScript(() => {
      localStorage.removeItem("akipasa.sidebar.collapsed");
      Object.defineProperty(navigator, "share", {
        configurable: true,
        value: undefined,
      });
      Object.defineProperty(navigator, "clipboard", {
        configurable: true,
        value: {
          writeText: async (value: string) => {
            document.documentElement.dataset.spotlightCopiedUrl = value;
          },
        },
      });
    });
  });

  test.afterEach(async ({ page }, info) => {
    if (info.status !== info.expectedStatus) {
      await page.screenshot({
        path: info.outputPath("failure.png"),
        fullPage: false,
        animations: "disabled",
      });
    }
  });

  async function fitsViewport(page: Page, root: Locator, width: number) {
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
      "The document must not scroll sideways",
    ).toBeLessThanOrEqual(width + 1);
    for (const element of [root, root.locator("h1")]) {
      const box = await element.boundingBox();
      expect(box).not.toBeNull();
      expect(box!.x).toBeGreaterThanOrEqual(-1);
      expect(box!.x + box!.width).toBeLessThanOrEqual(width + 1);
    }
    expect(await root.innerText()).not.toMatch(/\uFFFD|Ã[\u0080-\u00BF]/);
  }

  async function checkHero(page: Page, kind: "venue" | "event", width: number) {
    const art = page.locator(
      kind === "venue" ? ".venue-spotlight-art" : ".event-spotlight-poster",
    );
    const summary = page.locator(`.${kind}-spotlight-summary`);
    await expect(art).toBeVisible();
    await expect(summary).toBeVisible();
    const [a, s] = await Promise.all([
      art.boundingBox(),
      summary.boundingBox(),
    ]);
    expect(a).not.toBeNull();
    expect(s).not.toBeNull();
    if (width >= 1280) {
      expect(
        a!.x + a!.width,
        "Wide screens keep artwork beside details",
      ).toBeLessThanOrEqual(s!.x + 2);
      expect(Math.abs(a!.y - s!.y)).toBeLessThanOrEqual(30);
    } else {
      expect(
        a!.y + a!.height,
        "Portrait and split windows stack artwork above details",
      ).toBeLessThanOrEqual(s!.y + 2);
    }
    const heroImage = art.locator("img").first();
    await expect(heroImage).toBeVisible();
    await expect
      .poll(() =>
        heroImage.evaluate((image) => (image as HTMLImageElement).naturalWidth),
      )
      .toBeGreaterThan(0);
  }

  async function touchAction(action: Locator) {
    await expect(action).toBeVisible();
    await action.click({ trial: true });
    const box = await action.boundingBox();
    expect(box!.height).toBeGreaterThanOrEqual(43.5);
  }

  async function mobileActions(
    page: Page,
    kind: "venue" | "event",
    width: number,
    height: number,
  ) {
    if (width <= 850) {
      await expect(page.locator(".global-support-trigger")).toBeHidden();
    }
    if (width > 600 || height < 700) return;
    const actions = page.locator(`.${kind}-spotlight-mobile-actions`);
    await expect(actions).toBeInViewport();
    const actionBox = await actions.boundingBox();
    expect(actionBox!.x).toBeGreaterThanOrEqual(0);
    expect(actionBox!.x + actionBox!.width).toBeLessThanOrEqual(width + 1);
    const bottomNavigation = page.locator(".app-bottom-nav");
    if (await bottomNavigation.isVisible()) {
      const navBox = await bottomNavigation.boundingBox();
      expect(
        actionBox!.y + actionBox!.height,
        "Booking actions must stay above the app navigation",
      ).toBeLessThanOrEqual(navBox!.y + 1);
    }
    const links = actions.locator("a");
    await expect(links).toHaveCount(2);
    const boxes = [];
    for (const action of await links.all()) {
      await touchAction(action);
      boxes.push((await action.boundingBox())!);
      expect(
        await action.evaluate((element) => {
          const box = element.getBoundingClientRect();
          return [
            [box.x + box.width / 2, box.y + box.height / 2],
            [box.left + 8, box.top + 8],
            [box.right - 8, box.top + 8],
            [box.left + 8, box.bottom - 8],
            [box.right - 8, box.bottom - 8],
          ].every(([x, y]) =>
            element.contains(document.elementFromPoint(x, y)),
          );
        }),
        "Every mobile action stays unobstructed across its tap area",
      ).toBe(true);
    }
    expect(
      Math.abs(boxes[0].y - boxes[1].y),
      "Directions and booking share one compact phone row",
    ).toBeLessThanOrEqual(1);
    expect(boxes[0].x + boxes[0].width).toBeLessThanOrEqual(boxes[1].x);
    if (kind === "event") {
      const directions = await actions
        .locator(".event-spotlight-mobile-directions")
        .boundingBox();
      const reservation = await actions
        .locator(".event-spotlight-mobile-primary")
        .boundingBox();
      expect(directions).not.toBeNull();
      expect(reservation).not.toBeNull();
      expect(
        Math.abs(directions!.width - 44),
        "Icon-only directions keep a compact 44px tap target",
      ).toBeLessThanOrEqual(1);
      expect(
        reservation!.width,
        "Reservation gets the larger share of the event action bar",
      ).toBeGreaterThan(directions!.width);
    }
  }

  async function seo(page: Page, locale: Locale, kind: "venue" | "event") {
    const segment = kind === "venue" ? "venues" : "events";
    const slug = kind === "venue" ? fixture.venue.slug : fixture.event.slug;
    // Preview and loopback deployments retain the real public canonical host.
    const canonicalOrigin = "https://akipasa.com";
    await expect(page.locator("html")).toHaveAttribute("lang", locale);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      "href",
      `${canonicalOrigin}/${locale}/${segment}/${slug}`,
    );
    for (const language of ["en", "es"]) {
      await expect(
        page.locator(`link[rel="alternate"][hreflang="${language}"]`),
      ).toHaveAttribute(
        "href",
        `${canonicalOrigin}/${language}/${segment}/${slug}`,
      );
    }
    const documents = await page
      .locator('script[type="application/ld+json"]')
      .evaluateAll((nodes) =>
        nodes.map(
          (node) =>
            JSON.parse(node.textContent || "{}") as Record<string, unknown>,
        ),
      );
    const schema = documents.find(
      (document) =>
        document["@type"] === (kind === "venue" ? "Place" : "Event"),
    );
    expect(schema).toBeDefined();
    expect(schema!.name).toBe(
      kind === "venue" ? fixture.venue.name : fixture.event.title[locale],
    );
    if (kind === "event") {
      expect(schema!.startDate).toBe(fixture.event.startsAt);
      expect(schema!.endDate).toBe(fixture.event.endsAt);
      expect(schema!.eventStatus).toBe("https://schema.org/EventScheduled");
    }
  }

  async function capture(
    page: Page,
    locale: Locale,
    theme: string,
    viewport: (typeof viewports)[number],
    kind: "venue" | "event",
  ) {
    const representative =
      (locale === "en" && theme === "light" && viewport.name === "desktop") ||
      (locale === "es" && theme === "dark" && viewport.name === "phone") ||
      (locale === "es" &&
        theme === "light" &&
        viewport.name === "landscape-tablet" &&
        kind === "venue") ||
      (locale === "en" &&
        theme === "dark" &&
        viewport.name === "portrait-tablet" &&
        kind === "event");
    if (representative) {
      await page.screenshot({
        path: `test-results/spotlight-routes/${kind}-${locale}-${theme}-${viewport.name}.png`,
        fullPage: false,
        animations: "disabled",
      });
    }
  }

  for (const locale of ["en", "es"] as const) {
    for (const theme of ["light", "dark"] as const) {
      for (const viewport of viewports) {
        test(`${locale} ${theme} ${viewport.name}: venue and event recompose with working actions`, async ({
          page,
        }) => {
          test.setTimeout(90_000);
          const errors: string[] = [];
          page.on("pageerror", (error) => errors.push(error.message));
          await page.setViewportSize(viewport);
          await page.emulateMedia({ colorScheme: theme });
          await page.addInitScript(
            (value) => localStorage.setItem("akipasa.theme", value),
            theme,
          );
          const venuePath = `/${locale}/venues/${fixture.venue.slug}`;
          const venueResponse = await page.goto(venuePath, {
            waitUntil: "domcontentloaded",
          });
          expect(venueResponse!.status()).toBe(200);
          const venue = page.locator("main.spotlight-venue");
          await expect(page.locator("main")).toHaveCount(1);
          await expect(venue.getByRole("heading", { level: 1 })).toHaveText(
            fixture.venue.name,
          );
          await expect(page.locator("html")).toHaveAttribute(
            "data-theme",
            theme,
          );
          await checkHero(page, "venue", viewport.width);
          await fitsViewport(page, venue, viewport.width);
          await seo(page, locale, "venue");
          await mobileActions(page, "venue", viewport.width, viewport.height);
          await capture(page, locale, theme, viewport, "venue");

          const venueBooking = venue.locator(".venue-spotlight-book");
          await expect(venueBooking).toHaveAttribute(
            "href",
            `${venuePath}/book`,
          );
          await expect(venueBooking).toHaveAccessibleName(
            locale === "es" ? "Reservar" : "Book now",
          );
          await touchAction(venueBooking);
          const venueDirections = venue.locator(".venue-spotlight-directions");
          await expect(venueDirections).toHaveAccessibleName(
            locale === "es" ? "Cómo llegar" : "Directions",
          );
          await expect(venueDirections).toHaveAttribute(
            "href",
            /google\.com\/maps\/dir/,
          );
          await expect(
            venue.getByRole("link", {
              name: locale === "es" ? "Seguir local" : "Follow venue",
              exact: true,
            }),
          ).toHaveAttribute(
            "href",
            `/${locale}/auth?next=${encodeURIComponent(venuePath)}`,
          );
          await touchAction(
            venue.getByRole("button", {
              name: locale === "es" ? "Compartir" : "Share",
              exact: true,
            }),
          );

          const tabs = venue.getByRole("tablist");
          const menuTab = tabs.getByRole("tab", {
            name: locale === "es" ? "Carta" : "Menu",
            exact: true,
          });
          await expect(menuTab).toHaveAttribute("aria-selected", "true");
          const menuColumn = venue.locator(".venue-spotlight-menu");
          const upcoming = venue.locator(".venue-spotlight-next-events");
          const [menuBox, upcomingBox] = await Promise.all([
            menuColumn.boundingBox(),
            upcoming.boundingBox(),
          ]);
          expect(menuBox).not.toBeNull();
          expect(upcomingBox).not.toBeNull();
          if (viewport.width >= 1280) {
            expect(
              menuBox!.x + menuBox!.width,
              "Wide venue pages keep upcoming events beside the catalogue",
            ).toBeLessThanOrEqual(upcomingBox!.x + 1);
          } else {
            expect(
              menuBox!.y + menuBox!.height,
              "Compact venue pages stack the upcoming-event preview",
            ).toBeLessThanOrEqual(upcomingBox!.y + 1);
          }
          await expect(
            upcoming.locator(".venue-spotlight-events.is-preview > a:visible"),
          ).toHaveCount(2);
          const categories = venue.locator(
            ".venue-spotlight-categories button",
          );
          await expect(categories).toHaveCount(2);
          await categories.first().click();
          await expect(categories.first()).toHaveAttribute(
            "aria-expanded",
            "true",
          );
          const menu = venue.locator("details.venue-spotlight-menu-details");
          await expect(menu).toHaveAttribute("open", "");
          await expect(
            menu.getByText(
              locale === "es" ? "Burger de prueba" : "Test burger",
              { exact: true },
            ),
          ).toBeVisible();
          await expect(
            venue.getByText(/Hidden test item|Oculto de prueba/),
          ).toHaveCount(0);
          await expect(
            venue.getByText(/Empty section|Sección vacía/),
          ).toHaveCount(0);
          const allergens = menu.locator(".public-catalogue-item-details");
          await allergens.locator("summary").click();
          await expect(allergens).toHaveAttribute("open", "");
          const milkBadge = allergens.locator(
            '.public-catalogue-allergens [data-state="contains"]',
          );
          await expect(milkBadge).toBeVisible();
          await expect(milkBadge).toContainText(
            locale === "es" ? "Leche" : "Milk",
          );
          await expect(milkBadge).toHaveAttribute(
            "title",
            locale === "es" ? "Contiene" : "Contains",
          );
          await categories.nth(1).click();
          await expect(
            menu.getByText(
              locale === "es" ? "Batido de vainilla" : "Vanilla shake",
              { exact: true },
            ),
          ).toBeVisible();
          await fitsViewport(page, venue, viewport.width);

          await menuTab.focus();
          await page.keyboard.press("ArrowRight");
          const eventsTab = tabs.getByRole("tab", {
            name: locale === "es" ? /^Eventos/ : /^Events/,
          });
          await expect(eventsTab).toHaveAttribute("aria-selected", "true");
          await expect(eventsTab).toBeFocused();
          await expect(
            venue.locator(
              `.venue-spotlight-events.is-full a[href="/${locale}/events/${fixture.event.slug}"]`,
            ),
          ).toBeVisible();
          await expect(
            venue.locator('a[href$="spotlight-cancelled-event"]'),
          ).toHaveCount(0);
          await tabs
            .getByRole("tab", {
              name: locale === "es" ? "Información" : "Information",
              exact: true,
            })
            .click();
          await expect(
            venue.getByRole("link", {
              name: locale === "es" ? "Llamar" : "Call",
              exact: true,
            }),
          ).toHaveAttribute("href", "tel:+34000000000");
          await expect(
            venue.getByRole("link", { name: "WhatsApp", exact: true }),
          ).toHaveAttribute("href", "https://wa.me/34000000000");
          await expect(
            venue.getByRole("link", {
              name: locale === "es" ? "Sitio web" : "Website",
              exact: true,
            }),
          ).toHaveAttribute("href", "https://example.com/spotlight-venue");
          await fitsViewport(page, venue, viewport.width);

          const eventPath = `/${locale}/events/${fixture.event.slug}`;
          const selectedEventPath = `${eventPath}?occurrence=${fixture.event.occurrenceId}`;
          const eventResponse = await page.goto(eventPath, {
            waitUntil: "domcontentloaded",
          });
          expect(eventResponse!.status()).toBe(200);
          const event = page.locator("main.spotlight-event");
          await expect(page.locator("main")).toHaveCount(1);
          await expect(event.getByRole("heading", { level: 1 })).toHaveText(
            fixture.event.title[locale],
          );
          await checkHero(page, "event", viewport.width);
          await fitsViewport(page, event, viewport.width);
          await seo(page, locale, "event");
          await mobileActions(page, "event", viewport.width, viewport.height);
          await capture(page, locale, theme, viewport, "event");
          await expect(
            event.locator(".event-spotlight-primary-action a"),
          ).toHaveAttribute(
            "href",
            `${eventPath}/book?occurrence=${fixture.event.occurrenceId}`,
          );
          await touchAction(event.locator(".event-spotlight-primary-action a"));
          await expect(event.locator(".event-spotlight-host")).toHaveAttribute(
            "href",
            venuePath,
          );
          await expect(event.locator(".event-spotlight-save")).toHaveAttribute(
            "href",
            `/${locale}/auth?next=${encodeURIComponent(selectedEventPath)}`,
          );
          await expect(
            event.locator(".event-spotlight-social .event-spotlight-going"),
          ).toHaveAttribute(
            "href",
            `/${locale}/auth?next=${encodeURIComponent(selectedEventPath)}`,
          );
          await expect(
            event.locator(".event-spotlight-facts time").first(),
          ).toHaveAttribute("datetime", fixture.event.startsAt);
          const eventMenu = event.locator(".event-spotlight-menu");
          await eventMenu.locator("summary").first().click();
          await expect(
            eventMenu.getByText(
              locale === "es" ? "Burger de prueba" : "Test burger",
              { exact: true },
            ),
          ).toBeVisible();
          await expect(
            eventMenu.getByText(
              /Shakes|Batidos|Hidden test item|Oculto de prueba/,
            ),
          ).toHaveCount(0);
          await fitsViewport(page, event, viewport.width);
          const share = event.getByRole("button", {
            name: locale === "es" ? "Compartir" : "Share",
            exact: true,
          });
          await share.click();
          await expect(
            event.getByRole("button", {
              name: locale === "es" ? "Enlace copiado" : "Link copied",
              exact: true,
            }),
          ).toBeVisible();
          await expect(page.locator("html")).toHaveAttribute(
            "data-spotlight-copied-url",
            `${fixture.siteUrl}${eventPath}`,
          );
          expect(errors).toEqual([]);
        });
      }
    }
  }

  test("sparse venues retain useful information without fabricated menu, hours or booking", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/es/venues/spotlight-empty");
    const venue = page.locator("main.spotlight-venue");
    await expect(venue.getByRole("heading", { level: 1 })).toHaveText(
      "Spotlight Community Space",
    );
    await expect(venue.getByRole("tab")).toHaveCount(1);
    await expect(
      venue.getByRole("tab", { name: "Información" }),
    ).toHaveAttribute("aria-selected", "true");
    await expect(venue.locator(".venue-spotlight-book")).toHaveCount(0);
    await expect(venue.locator(".venue-spotlight-art img")).toHaveCount(0);
    await expect(venue.getByText(/Abierto ahora|Open now/)).toHaveCount(0);
    const businessPrompt = venue.locator("details").filter({
      has: page.locator("summary", { hasText: "¿Gestionas un negocio?" }),
    });
    await businessPrompt.locator("summary").click();
    await expect(
      businessPrompt.getByRole("link", {
        name: "Reclamar con AkiHQ",
        exact: true,
      }),
    ).toHaveAttribute(
      "href",
      "https://akihq.app/es/business?view=claims&venueId=00000000-0000-4000-8000-000000000020",
    );
    await fitsViewport(page, venue, 390);
  });

  test("booking availability keeps external precedence and hides cancelled or sold-out booking actions", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/en/venues/spotlight-external");
    await expect(page.locator(".venue-spotlight-book")).toHaveAttribute(
      "href",
      "https://example.com/spotlight-venue-booking",
    );
    await page.goto("/en/events/spotlight-external-event");
    await expect(
      page.locator(".event-spotlight-primary-action a"),
    ).toHaveAttribute(
      "href",
      "https://example.com/spotlight-occurrence-booking",
    );
    for (const [slug, notice] of [
      ["spotlight-cancelled-event", "This event is cancelled."],
      ["spotlight-sold-out-event", "This event is sold out."],
    ]) {
      await page.goto(`/en/events/${slug}`);
      await expect(page.locator(".event-spotlight-status")).toHaveText(notice);
      await expect(page.locator(".event-spotlight-booking")).toHaveCount(0);
      await expect(
        page.locator(".event-spotlight-primary-action a"),
      ).toHaveAccessibleName("Directions");
    }
  });

  test("event locations, guest sign-in return paths and public not-found outcomes remain correct", async ({
    page,
    request,
  }) => {
    await page.goto("/es/events/spotlight-offsite-event");
    const href = await page
      .locator(".event-spotlight-directions-link")
      .getAttribute("href");
    expect(new URL(href!).searchParams.get("destination")).toContain(
      "Paseo de Prueba 24",
    );
    await page.locator(".event-spotlight-save").click();
    await expect(page).toHaveURL(
      /\/es\/auth\?next=%2Fes%2Fevents%2Fspotlight-offsite-event/,
    );
    for (const segment of ["venues", "events"]) {
      const response = await request.get(`/en/${segment}/spotlight-missing`);
      expect(response.status()).toBe(404);
    }
    const stay = await request.get("/en/venues/spotlight-stay", {
      maxRedirects: 0,
    });
    expect(stay.status()).toBe(307);
    expect(stay.headers().location).toBe(
      "https://akiduermo.akipasa.com/stays/spotlight-stay?lang=en",
    );
  });

  test("long bilingual venue names remain within a small phone layout", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 360, height: 800 });
    for (const locale of ["en", "es"]) {
      await page.goto(`/${locale}/venues/spotlight-long-name`);
      const venue = page.locator("main.spotlight-venue");
      await expect(venue.getByRole("heading", { level: 1 })).toContainText(
        "programación, exposiciones",
      );
      await fitsViewport(page, venue, 360);
      await touchAction(venue.locator(".venue-spotlight-book"));
    }
  });
  for (const locale of ["en", "es"] as const) {
    for (const theme of ["light", "dark"] as const) {
      for (const width of [360, 1440]) {
        test(`multi-section catalogue ${locale} ${theme} ${width}`, async ({
          page,
        }, info) => {
          await page.setViewportSize({ width, height: 900 });
          await page.emulateMedia({ colorScheme: theme });
          await page.addInitScript(
            (value) => localStorage.setItem("akipasa.theme", value),
            theme,
          );
          await page.goto(`/${locale}/events/spotlight-multi-menu`);
          const root = page.locator("main.spotlight-event");
          const menu = root.locator(".event-spotlight-menu");
          await menu.locator(":scope > summary").click();
          const sections = menu.locator(".public-catalogue-tab");
          await expect(sections).toHaveCount(2);
          const burgers = sections.nth(0);
          const shakes = sections.nth(1);
          await expect(burgers).toContainText("Burgers");
          await expect(shakes).toContainText(
            locale === "es" ? "Batidos" : "Shakes",
          );
          const burger = menu.getByText(
            locale === "es" ? "Burger de prueba" : "Test burger",
            { exact: true },
          );
          const shake = menu.getByText(
            locale === "es" ? "Batido de vainilla" : "Vanilla shake",
            { exact: true },
          );
          const styles = () =>
            sections.evaluateAll((buttons) =>
              buttons.map((button) => {
                const style = getComputedStyle(button);
                return {
                  background: style.backgroundColor,
                  border: style.borderTopColor,
                  badge: getComputedStyle(button.querySelector("small")!)
                    .backgroundColor,
                };
              }),
            );
          await expect(burgers).toHaveAttribute("aria-pressed", "true");
          await expect(shakes).toHaveAttribute("aria-pressed", "false");
          await expect(burger).toBeVisible();
          await expect(shake).toHaveCount(0);
          const initial = await styles();
          expect(initial[0].background).not.toBe(initial[1].background);
          expect(initial[0].border).not.toBe(initial[1].border);
          expect(initial[0].badge).not.toBe(initial[1].badge);

          await shakes.focus();
          await page.keyboard.press("Enter");
          await expect(shakes).toBeFocused();
          await expect(shakes).toHaveAttribute("aria-pressed", "true");
          await expect(burgers).toHaveAttribute("aria-pressed", "false");
          await expect(shake).toBeVisible();
          await expect(burger).toHaveCount(0);
          const switched = await styles();
          expect(switched).toEqual([initial[1], initial[0]]);
          await fitsViewport(page, root, width);
          await page.screenshot({
            path: `test-results/spotlight-routes/multi-section-${locale}-${theme}-${width}.png`,
            fullPage: true,
            animations: "disabled",
          });

          await burgers.click();
          await expect(burgers).toHaveAttribute("aria-pressed", "true");
          await expect(shakes).toHaveAttribute("aria-pressed", "false");
          await expect(burger).toBeVisible();
          await expect(shake).toHaveCount(0);
          expect(await styles()).toEqual(initial);
          await expect(
            menu.getByText(
              /Hidden test item|Oculto de prueba|Empty section|Sección vacía/,
            ),
          ).toHaveCount(0);
          await info.attach("catalogue-state-styles", {
            body: JSON.stringify({ initial, switched }, null, 2),
            contentType: "application/json",
          });
        });
        for (const kind of ["venue", "event"] as const) {
          test(`visual continuity ${locale} ${theme} ${width} ${kind}`, async ({
            page,
          }, info) => {
            await page.setViewportSize({ width, height: 900 });
            await page.emulateMedia({ colorScheme: theme });
            await page.addInitScript(
              (value) => localStorage.setItem("akipasa.theme", value),
              theme,
            );
            await page.goto(
              `/${locale}/${kind === "venue" ? "venues" : "events"}/${kind === "venue" ? fixture.venue.slug : fixture.event.slug}`,
            );
            const root = page.locator(`main.spotlight-${kind}`);
            await expect(root).toBeVisible();
            const contrastEvidence: Array<{
              text?: string;
              foreground: number[];
              backgrounds: number[][];
              ratios: number[];
            }> = [];
            const contrast = async (selector: string) => {
              for (const item of await root.locator(selector).all()) {
                if (!(await item.isVisible())) continue;
                const result = await item.evaluate((element) => {
                  const rgb = (value: string) => {
                    const values = (value.match(/[\d.]+/g) || []).map(Number);
                    return value.startsWith("color(srgb")
                      ? values.map((v, index) => (index < 3 ? v * 255 : v))
                      : values;
                  };
                  const foreground = rgb(getComputedStyle(element).color);
                  let node: Element | null = element;
                  let backgrounds: number[][] = [];
                  while (node) {
                    const style = getComputedStyle(node);
                    const color = rgb(style.backgroundColor);
                    if (style.backgroundImage.includes("gradient")) {
                      backgrounds = (
                        style.backgroundImage.match(/rgba?\([^)]+\)/g) || []
                      )
                        .map(rgb)
                        .filter((c) => c.length === 3 || c[3] === 1);
                      if (backgrounds.length) break;
                    }
                    if (color.length === 3 || color[3] === 1) {
                      backgrounds = [color];
                      break;
                    }
                    node = node.parentElement;
                  }
                  const luminance = (color: number[]) =>
                    color
                      .slice(0, 3)
                      .map((v) => {
                        const s = v / 255;
                        return s <= 0.04045
                          ? s / 12.92
                          : ((s + 0.055) / 1.055) ** 2.4;
                      })
                      .reduce(
                        (sum, v, i) => sum + v * [0.2126, 0.7152, 0.0722][i],
                        0,
                      );
                  const a = luminance(foreground);
                  return {
                    text: element.textContent?.trim(),
                    foreground,
                    backgrounds,
                    ratios: backgrounds.map((bg) => {
                      const b = luminance(bg);
                      return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
                    }),
                  };
                });
                contrastEvidence.push(result);
                expect(
                  result.ratios.length,
                  JSON.stringify(result),
                ).toBeGreaterThan(0);
                for (const ratio of result.ratios)
                  expect(ratio, JSON.stringify(result)).toBeGreaterThanOrEqual(
                    4.5,
                  );
              }
            };
            await contrast(
              kind === "event"
                ? ".event-spotlight-summary h1, .event-spotlight-facts dt span, .event-spotlight-facts dd, .event-spotlight-facts dd small, .event-spotlight-host-copy > *, .event-spotlight-host-action"
                : ".venue-spotlight-title h1, .venue-spotlight-location, .venue-spotlight-access, .venue-spotlight-section-heading h2, .venue-spotlight-event h3, .venue-spotlight-event p, .venue-spotlight-event-date",
            );
            if (kind === "venue") {
              await root
                .locator(".venue-spotlight-categories button")
                .first()
                .click();
            } else {
              const poster = root.locator(".event-spotlight-poster-image");
              await expect(poster).toHaveCSS("object-fit", "contain");
              expect(
                await poster.evaluate(
                  (img) =>
                    (img as HTMLImageElement).naturalHeight /
                    (img as HTMLImageElement).naturalWidth,
                ),
              ).toBeGreaterThan(1);
              await root.locator(".event-spotlight-menu > summary").click();
              const selected = root.locator(
                '.public-catalogue-tab[aria-pressed="true"]',
              );
              await expect(selected).toHaveCount(1);
              const state = await selected.evaluate((el) => ({
                color: getComputedStyle(el).color,
                background: getComputedStyle(el).backgroundColor,
              }));
              expect(state.background).not.toBe("rgba(0, 0, 0, 0)");
              await selected.focus();
              await page.keyboard.press("Enter");
              await expect(selected).toBeFocused();
              await expect(selected).toHaveAttribute("aria-pressed", "true");
            }
            await root
              .locator(".public-catalogue-item-details summary")
              .first()
              .click();
            await contrast(
              ".public-catalogue-item-head strong, .public-catalogue-item-head p, .public-catalogue-price, .public-catalogue-section-head h3",
            );
            await fitsViewport(page, root, width);
            await page.screenshot({
              path: `test-results/spotlight-routes/continuity-${kind}-${locale}-${theme}-${width}-menu.png`,
              fullPage: true,
              animations: "disabled",
            });
            if (kind === "venue") {
              for (const name of [
                locale === "es" ? "Información" : "Information",
                locale === "es" ? "Ventajas" : "Perks",
              ]) {
                const tab = root.getByRole("tab", { name, exact: true });
                await tab.focus();
                await page.keyboard.press("Enter");
                await expect(tab).toHaveAttribute("aria-selected", "true");
                await contrast(
                  ".venue-spotlight-information h2, .venue-spotlight-description, .venue-spotlight-perks h2, .venue-spotlight-perk h3, .venue-spotlight-perk p",
                );
                await page.screenshot({
                  path: `test-results/spotlight-routes/continuity-venue-${locale}-${theme}-${width}-${name}.png`,
                  fullPage: true,
                  animations: "disabled",
                });
              }
            }
            await writeFile(
              `test-results/spotlight-routes/contrast-${kind}-${locale}-${theme}-${width}.json`,
              JSON.stringify(contrastEvidence, null, 2),
            );
            await info.attach("computed-text-contrast", {
              body: JSON.stringify(contrastEvidence, null, 2),
              contentType: "application/json",
            });
            await info.attach("source-context", {
              body: "Actual Next Spotlight routes; disposable local synthetic public data. No authenticated booking/RLS or physical-device acceptance.",
              contentType: "text/plain",
            });
          });
        }
      }
    }
  }
});
