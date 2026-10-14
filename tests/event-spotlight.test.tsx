// @vitest-environment jsdom
import React, { type ComponentProps } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import type { Event, Venue } from "../src/lib/domain";
import { blankCatalogue, blankCatalogueItem } from "../src/lib/venue-catalogue";

const mocks = vi.hoisted(() => ({
  eventBySlug: vi.fn(),
  venueById: vi.fn(),
  optionalUser: vi.fn(),
  setEventPreference: vi.fn(),
  toggleSavedEvent: vi.fn(),
  catalogue: vi.fn(),
}));

vi.mock("@/lib/repository", () => ({
  repository: {
    eventBySlug: mocks.eventBySlug,
    venueById: mocks.venueById,
  },
}));
vi.mock("@/lib/auth", () => ({ optionalUser: mocks.optionalUser }));
vi.mock("../src/app/[locale]/engagement/actions", () => ({
  setEventPreference: mocks.setEventPreference,
  toggleSavedEvent: mocks.toggleSavedEvent,
}));
vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("not-found");
  },
}));
vi.mock("next/link", () => ({
  default: (props: ComponentProps<"a">) => <a {...props} />,
}));
vi.mock("@/components/AnalyticsSignal", () => ({
  AnalyticsView: () => null,
  TrackedLink: ({
    action,
    href,
    className,
    children,
    target,
    rel,
  }: ComponentProps<"a"> & {
    action: string;
    venueId?: string;
    eventId?: string;
    locale: string;
  }) => (
    <a
      href={href}
      className={className}
      target={target}
      rel={rel}
      data-analytics-action={action}
    >
      {children}
    </a>
  ),
}));
vi.mock("@/components/ShareButton", () => ({
  ShareButton: ({ label }: { label: string }) => (
    <button type="button">{label}</button>
  ),
}));
vi.mock("@/components/PublicVenueCatalogue", () => ({
  PublicVenueCatalogue: (props: unknown) => {
    mocks.catalogue(props);
    return <div data-testid="published-event-menu" />;
  },
}));

import EventPage, {
  generateMetadata,
} from "../src/app/[locale]/events/[slug]/page";

const eventId = "30000000-0000-4000-8000-000000000001";
const venueId = "30000000-0000-4000-8000-000000000002";
const userId = "30000000-0000-4000-8000-000000000003";
let event: Event;
let venue: Venue;
let rows: Record<string, unknown>;
let rpcRows: Record<string, unknown>;
let user: { id: string } | null;
let recentView: ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-10-12T12:00:00Z"));
  event = {
    id: eventId,
    venueId,
    slug: "almuerzo-local",
    title: { es: "Almuerzo", en: "Lunch gathering" },
    description: {
      es: "Música y menú del local.",
      en: "Music and venue menu.",
    },
    category: "food",
    priceCents: 0,
    currency: "EUR",
    priceDisplayMode: "show",
    source: "verified_venue",
    sponsored: false,
    bannerImage: {
      id: "event-poster",
      url: "/published-event-poster.webp",
      alt: { es: "Cartel del almuerzo", en: "Lunch event poster" },
    },
    occurrences: [
      {
        id: "selected-occurrence",
        startsAt: "2026-10-17T10:22:00Z",
        endsAt: "2026-10-30T20:30:00Z",
        status: "scheduled",
      },
    ],
  };
  venue = {
    id: venueId,
    name: "Local Test Venue",
    slug: "local-test-venue",
    description: { es: "Local de prueba", en: "Test venue" },
    locality: "fuengirola",
    address: "Example Street, Fuengirola, Málaga",
    latitude: 36.539,
    longitude: -4.624,
    verified: true,
    accessible: true,
    coverImage: {
      id: "venue-cover",
      url: "/published-venue-cover.webp",
      alt: { es: "Imagen del local", en: "Venue photograph" },
    },
  };
  rows = {
    venue_booking_settings: { mode: "request" },
    events: { catalogue_section_ids: [] },
    saved_event_refs: null,
    user_event_preferences: null,
  };
  rpcRows = {
    event_public_engagement: { going: 4 },
    public_venue_catalogue: null,
    has_active_entitlement: false,
  };
  user = null;
  recentView = vi.fn().mockResolvedValue({ error: null });
  mocks.eventBySlug.mockImplementation(async () => event);
  mocks.venueById.mockImplementation(async () => venue);
  mocks.optionalUser.mockImplementation(async () => ({
    user,
    supabase: {
      from: (table: string) => {
        const query = {
          select: () => query,
          eq: () => query,
          maybeSingle: async () => ({ data: rows[table] ?? null, error: null }),
          upsert: recentView,
        };
        return query;
      },
      rpc: async (name: string) => ({
        data: rpcRows[name] ?? null,
        error: null,
      }),
    },
  }));
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

async function page(locale: "en" | "es" = "en", occurrence?: string) {
  return EventPage({
    params: Promise.resolve({ locale, slug: event.slug }),
    searchParams: Promise.resolve({ occurrence }),
  });
}

function formValues(form: HTMLFormElement) {
  return Object.fromEntries(new FormData(form));
}

describe("Aki Spotlight event detail", () => {
  it.each(["en", "es"] as const)(
    "keeps real artwork, multi-day dates, localized actions and the venue link in %s",
    async (locale) => {
      const { container } = render(await page(locale));
      expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(
        event.title[locale],
      );
      expect(
        container
          .querySelector(".event-spotlight-poster-image")
          ?.getAttribute("src"),
      ).toBe(event.bannerImage?.url);
      expect(
        container.querySelector(".event-spotlight-date-badge")?.textContent,
      ).toMatch(/17–30/);
      const facts = container.querySelector(".event-spotlight-facts")!;
      expect(facts.textContent).toContain("12:22");
      expect(facts.textContent).toContain(
        locale === "en" ? "09:30 PM" : "21:30",
      );
      expect(
        facts.querySelector(
          `time[datetime="${event.occurrences[0].startsAt}"]`,
        ),
      ).not.toBeNull();
      expect(
        facts.querySelector(`time[datetime="${event.occurrences[0].endsAt}"]`),
      ).not.toBeNull();
      expect(
        container.querySelector(".event-spotlight-host")?.getAttribute("href"),
      ).toBe(`/${locale}/venues/${venue.slug}`);
      const actions = container.querySelectorAll(".event-spotlight-booking");
      expect(actions).toHaveLength(2);
      for (const action of actions)
        expect(action.getAttribute("href")).toBe(
          `/${locale}/events/${event.slug}/book?occurrence=${event.occurrences[0].id}`,
        );
      expect(recentView).not.toHaveBeenCalled();
    },
  );

  it("keeps external booking precedence and analytics for both responsive actions", async () => {
    event.bookingUrl = "https://booking.example.test/event";
    event.occurrences[0].bookingUrl = "https://booking.example.test/occurrence";
    const { container } = render(await page());
    const actions = container.querySelectorAll(".event-spotlight-booking");
    expect(actions).toHaveLength(2);
    for (const action of actions) {
      expect(action.getAttribute("href")).toBe(event.occurrences[0].bookingUrl);
      expect(action.getAttribute("target")).toBe("_blank");
      expect(action.getAttribute("data-analytics-action")).toBe(
        "booking_click",
      );
    }
  });

  it.each(["cancelled", "sold_out"] as const)(
    "does not show a booking action for a %s occurrence",
    async (status) => {
      event.occurrences[0].status = status;
      event.bookingUrl = "https://booking.example.test/closed";
      const { container } = render(await page());
      expect(
        container.querySelectorAll(".event-spotlight-booking"),
      ).toHaveLength(0);
      expect(screen.getByRole("status").textContent).toContain(
        status === "cancelled" ? "cancelled" : "sold out",
      );
      expect(
        container.querySelector(".event-spotlight-directions-primary"),
      ).not.toBeNull();
    },
  );

  it("uses the next valid occurrence without turning recurrence into a continuous date range", async () => {
    event.occurrences.unshift({
      id: "cancelled-earlier",
      startsAt: "2026-10-14T10:00:00Z",
      endsAt: "2026-10-14T12:00:00Z",
      status: "cancelled",
    });
    const { container } = render(await page());
    const schema = JSON.parse(
      container.querySelector("#event-jsonld")!.textContent!,
    );
    expect(schema.startDate).toBe("2026-10-17T10:22:00Z");
    expect(schema.endDate).toBe("2026-10-30T20:30:00Z");
    expect(schema.eventStatus).toBe("https://schema.org/EventScheduled");
  });

  it("keeps a selected recurrence through booking, calendar, saved state and stay planning", async () => {
    event.occurrences.push({
      id: "chosen-occurrence",
      startsAt: "2026-11-07T18:00:00Z",
      endsAt: "2026-11-07T22:00:00Z",
      status: "scheduled",
    });
    event.location = {
      label: "Custom event site",
      latitude: 40.4168,
      longitude: -3.7038,
    };
    user = { id: userId };
    rpcRows.has_active_entitlement = true;
    const { container } = render(await page("en", "chosen-occurrence"));

    for (const action of container.querySelectorAll(".event-spotlight-booking"))
      expect(action.getAttribute("href")).toBe(
        "/en/events/almuerzo-local/book?occurrence=chosen-occurrence",
      );
    expect(
      container.querySelector(
        'a[href="/en/events/almuerzo-local/calendar?occurrence=chosen-occurrence"]',
      ),
    ).not.toBeNull();
    expect(
      formValues(
        screen.getByRole("button", { name: "Save event" }).closest("form")!,
      ).returnTo,
    ).toBe("/en/events/almuerzo-local?occurrence=chosen-occurrence");
    const stay = screen.getByRole("link", {
      name: "Find a stay for this event",
    });
    const stayUrl = new URL(stay.getAttribute("href")!);
    expect(stayUrl.searchParams.get("latitude")).toBe("40.4168");
    expect(stayUrl.searchParams.get("longitude")).toBe("-3.7038");
    expect(container.querySelector("#event-jsonld")?.textContent).toContain(
      "2026-11-07T18:00:00Z",
    );
  });

  it("falls back safely for an invalid occurrence and removes expired actions", async () => {
    event.occurrences[0] = {
      ...event.occurrences[0],
      startsAt: "2026-10-10T10:00:00Z",
      endsAt: "2026-10-10T12:00:00Z",
      status: "scheduled",
    };
    user = { id: userId };
    rpcRows.has_active_entitlement = true;
    const { container } = render(await page("en", "unknown-occurrence"));

    expect(screen.getByRole("status").textContent).toContain(
      "This event has ended.",
    );
    expect(container.querySelector(".event-spotlight-booking")).toBeNull();
    expect(
      screen.queryByRole("link", { name: "Find a stay for this event" }),
    ).toBeNull();
    expect(screen.queryByRole("link", { name: "Add to calendar" })).toBeNull();
  });

  it("keeps hidden pricing, no-media fallback, disabled booking and official locations honest", async () => {
    event.priceDisplayMode = "hide";
    event.bannerImage = undefined;
    event.source = "akipasa_selection";
    event.location = {
      label: "Plaza de la Constitución, Málaga",
      latitude: 36.7215,
      longitude: -4.4211,
      directionsAddress: "Plaza de la Constitución, Málaga, España",
    };
    rows.venue_booking_settings = { mode: "disabled" };
    const { container } = render(await page("es"));
    expect(
      container.querySelector(".event-spotlight-poster-placeholder"),
    ).not.toBeNull();
    expect(container.querySelector(".event-spotlight-price")).toBeNull();
    expect(container.querySelector(".event-spotlight-booking")).toBeNull();
    expect(
      container.querySelector(".event-spotlight-facts")?.textContent,
    ).toContain(event.location.label);
    const directions = container.querySelector(
      ".event-spotlight-directions-link",
    )!;
    expect(
      decodeURIComponent(directions.getAttribute("href")!.replace(/\+/g, " ")),
    ).toContain(event.location.directionsAddress);
    const schema = JSON.parse(
      container.querySelector("#event-jsonld")!.textContent!,
    );
    expect(schema).not.toHaveProperty("offers");
    expect(schema.location.address).toBe(event.location.directionsAddress);
  });

  it("retains authenticated saved, going, dislike, recent-view and premium calendar contracts", async () => {
    user = { id: userId };
    rows.saved_event_refs = { event_key: eventId };
    rows.user_event_preferences = { state: "going", reason: null };
    rpcRows.has_active_entitlement = true;
    const { container } = render(await page());
    const saved = screen.getByRole("button", { name: "Remove favorite" });
    const going = screen.getByRole("button", { name: "No longer going" });
    expect(saved.getAttribute("aria-pressed")).toBe("true");
    expect(going.getAttribute("aria-pressed")).toBe("true");
    expect(formValues(saved.closest("form")!)).toMatchObject({
      locale: "en",
      key: eventId,
      intent: "remove",
      returnTo: `/en/events/${event.slug}?occurrence=${event.occurrences[0].id}`,
    });
    expect(formValues(going.closest("form")!)).toMatchObject({
      locale: "en",
      eventId,
      state: "clear",
      returnTo: `/en/events/${event.slug}?occurrence=${event.occurrences[0].id}`,
    });
    expect(
      container.querySelector(
        'select[name="reason"] option[value="wrong_time"]',
      ),
    ).not.toBeNull();
    expect(
      container.querySelector(
        `a[href="/en/events/${event.slug}/calendar?occurrence=${event.occurrences[0].id}"]`,
      ),
    ).not.toBeNull();
    expect(recentView).toHaveBeenCalledWith(
      expect.objectContaining({ profile_id: userId, event_key: eventId }),
      { onConflict: "profile_id,event_key" },
    );
  });

  it("passes only currently published linked sections, with original allergen data, to the menu", async () => {
    const menu = blankCatalogue("en");
    const item = blankCatalogueItem();
    item.visible = true;
    item.name = { es: "Tarta", en: "Cake" };
    item.mediaId = "visible-item-media";
    item.allergens.states.milk = "contains";
    const hiddenItem = {
      ...blankCatalogueItem(),
      visible: false,
      mediaId: "hidden-item-media",
    };
    const unlinkedItem = {
      ...blankCatalogueItem(),
      visible: true,
      mediaId: "unlinked-item-media",
    };
    menu.sections = [
      {
        id: "linked",
        title: { es: "Postres", en: "Desserts" },
        items: [item, hiddenItem],
      },
      {
        id: "unlinked",
        title: { es: "Otra carta", en: "Other menu" },
        items: [unlinkedItem],
      },
    ];
    venue.media = [
      "visible-item-media",
      "hidden-item-media",
      "unlinked-item-media",
      "unreferenced-media",
    ].map((id) => ({
      id,
      url: `/test/${id}.webp`,
      alt: { es: "Imagen de la carta", en: "Menu image" },
    }));
    rpcRows.public_venue_catalogue = { document: menu };
    rows.events = { catalogue_section_ids: ["deleted-section", "linked"] };
    render(await page());
    expect(mocks.catalogue).toHaveBeenCalled();
    const passed = mocks.catalogue.mock.calls[0][0];
    expect(passed.document.sections).toHaveLength(1);
    expect(passed.document.sections[0].id).toBe("linked");
    expect(passed.document.sections[0].items[0].allergens.states.milk).toBe(
      "contains",
    );
    expect(passed.media).toEqual([
      {
        id: "visible-item-media",
        url: "/test/visible-item-media.webp",
        alt: "Menu image",
      },
    ]);
    cleanup();
    mocks.catalogue.mockClear();
    rpcRows.public_venue_catalogue = null;
    render(await page());
    expect(mocks.catalogue).not.toHaveBeenCalled();
  });

  it("keeps localized canonical metadata and fails missing/unpublished detail data", async () => {
    const metadata = await generateMetadata({
      params: Promise.resolve({ locale: "es", slug: event.slug }),
    });
    expect(metadata.alternates?.canonical).toBe(
      `https://akipasa.com/es/events/${event.slug}`,
    );
    mocks.venueById.mockResolvedValue(null);
    await expect(page()).rejects.toThrow("not-found");
    mocks.venueById.mockImplementation(async () => venue);
    event.occurrences = [];
    await expect(page()).rejects.toThrow("not-found");
  });
});
