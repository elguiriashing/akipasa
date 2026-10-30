// @vitest-environment jsdom
import React, { type ComponentProps, type ReactNode } from "react";
import "@testing-library/jest-dom/vitest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";

const mocks = vi.hoisted(() => ({
  recommend: vi.fn(),
  nearby: vi.fn(),
  discover: vi.fn(),
  requireUser: vi.fn(),
  rpc: vi.fn(),
  query: vi.fn(),
  flagUnavailable: false,
  mapProps: vi.fn(),
  review: vi.fn(),
  redirect: vi.fn((path: string): never => {
    throw new Error(`redirect:${path}`);
  }),
}));

vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("not-found");
  },
  redirect: mocks.redirect,
}));
vi.mock("next/link", () => ({
  default: ({
    prefetch: _prefetch,
    ...props
  }: ComponentProps<"a"> & { prefetch?: boolean }) => {
    void _prefetch;
    return <a {...props} />;
  },
}));
vi.mock("@/lib/personalisation/server", () => ({
  recommendDiscovery: mocks.recommend,
}));
vi.mock("@/lib/unclaimed-venues", () => ({ nearbyVenuePage: mocks.nearby }));
vi.mock("@/lib/repository", () => ({
  repository: { discover: mocks.discover },
}));
vi.mock("@/lib/pals/server", () => ({ mapPreviewPortrait: async () => null }));
vi.mock("@/lib/auth", () => ({ requireUser: mocks.requireUser }));
vi.mock("@/lib/feature-flags", () => ({
  loadFeatureFlagsState: async () => ({
    flags: { community_submissions: true },
    unavailable: mocks.flagUnavailable,
  }),
}));
vi.mock("@/lib/automatic-moderation", () => ({
  reviewPendingCatalogueItem: mocks.review,
}));
vi.mock("@/components/CityDiscovery", () => ({ CityDiscovery: () => null }));
vi.mock("@/components/DiscoveryIntentSignal", () => ({
  DiscoveryIntentSignal: () => null,
}));
vi.mock("@/components/ProductionMap", () => ({
  ProductionMap: (props: unknown) => {
    mocks.mapProps(props);
    return null;
  },
}));
vi.mock("@/components/MapResultsDrawer", () => ({
  MapResultsDrawer: ({ children }: { children: ReactNode }) => <>{children}</>,
}));
vi.mock("@/components/EventCard", () => ({ EventCard: () => null }));
vi.mock("@/components/SpainAddressAutocomplete", () => ({
  SpainAddressAutocomplete: () => null,
}));
vi.mock("@/components/WorkspaceShell", () => ({
  WorkspaceShell: ({ children }: { children: ReactNode }) => (
    <main>{children}</main>
  ),
  WorkspacePageHeader: ({
    title,
    description,
  }: {
    title: string;
    description: string;
  }) => (
    <header>
      <h1>{title}</h1>
      <p>{description}</p>
    </header>
  ),
}));
vi.mock("@/components/community/CreatorDirectoryPage", () => ({
  communityCreatorItems: () => [],
}));

import DiscoverPage from "../src/app/[locale]/page";
import MapPage from "../src/app/[locale]/map/page";
import { selectEventOccurrence } from "@/lib/event-occurrence";
import type { Occurrence } from "@/lib/domain";
import CommunityPage from "../src/app/[locale]/community/page";
import {
  submitCommunityEvent,
  submitReport,
} from "../src/app/[locale]/community/actions";

const targetId = "30000000-0000-4000-8000-000000000001";
const submissionId = "30000000-0000-4000-8000-000000000002";
const reportTarget = `venue:${targetId}`;
const reads: Record<string, unknown[]> = {
  events: [],
  venues: [{ id: targetId, name: "Report target venue" }],
  event_submissions: [],
  reports: [],
  categories: [],
};
const exactReads: Record<string, unknown> = {
  venues: { id: targetId, name: "Report target venue" },
};
let failedTable = "";

beforeEach(() => {
  vi.clearAllMocks();
  failedTable = "";
  mocks.flagUnavailable = false;
  reads.venues = [{ id: targetId, name: "Report target venue" }];
  mocks.recommend.mockResolvedValue({ items: [], requestId: "inert-request" });
  mocks.nearby.mockResolvedValue({ rows: [], total: 0, page: 1 });
  mocks.discover.mockResolvedValue([]);
  mocks.rpc.mockImplementation(async (name: string) => ({
    data: name === "submit_community_event" ? submissionId : null,
    error: null,
  }));
  mocks.requireUser.mockResolvedValue({
    user: { id: "30000000-0000-4000-8000-000000000003" },
    supabase: {
      rpc: mocks.rpc,
      from: (table: string) => {
        const result = () => ({
          data: reads[table] || [],
          error:
            failedTable === table ? { message: "private read failure" } : null,
        });
        const builder = {
          select: () => builder,
          eq: (field: string, value: unknown) => {
            mocks.query(table, "eq", field, value);
            return builder;
          },
          order: () => builder,
          limit: (value: number) => {
            mocks.query(table, "limit", value);
            return builder;
          },
          or: (value: string) => {
            mocks.query(table, "or", value);
            return builder;
          },
          ilike: (field: string, value: string) => {
            mocks.query(table, "ilike", field, value);
            return builder;
          },
          maybeSingle: () =>
            Promise.resolve({
              ...result(),
              data:
                failedTable === table
                  ? null
                  : (exactReads[table] ?? reads[table]?.[0] ?? null),
            }),
          then: (resolve: (value: unknown) => unknown) =>
            Promise.resolve(result()).then(resolve),
        };
        return builder;
      },
    },
  });
});
afterEach(cleanup);

function pageProps(
  locale: "en" | "es",
  query: Record<string, string | string[] | undefined> = {},
) {
  return {
    params: Promise.resolve({ locale }),
    searchParams: Promise.resolve(query),
  };
}

function communityProps(
  locale: "en" | "es",
  query: Record<string, string | undefined>,
) {
  return {
    params: Promise.resolve({ locale }),
    searchParams: Promise.resolve(query),
  };
}

describe("public discovery date parity", () => {
  const civilDays = [
    ["2026-01-23", "2026-01-22T23:00:00.000Z", "2026-01-23T22:59:59.999Z", 24],
    ["2026-07-23", "2026-07-22T22:00:00.000Z", "2026-07-23T21:59:59.999Z", 24],
    ["2026-03-29", "2026-03-28T23:00:00.000Z", "2026-03-29T21:59:59.999Z", 23],
    ["2026-10-25", "2026-10-24T22:00:00.000Z", "2026-10-25T22:59:59.999Z", 25],
  ] as const;
  for (const locale of ["en", "es"] as const) {
    it.each(civilDays)(
      "uses the same Madrid bounds for %s in " + locale,
      async (day, from, to, hours) => {
        await DiscoverPage(pageProps(locale, { dateFrom: day, dateTo: day }));
        await MapPage(pageProps(locale, { dateFrom: day, dateTo: day }));
        const discovery = mocks.recommend.mock.calls[0][0].query;
        const map = mocks.recommend.mock.calls[1][0].query;
        expect(map.dateFrom).toEqual(discovery.dateFrom);
        expect(map.dateTo).toEqual(discovery.dateTo);
        expect(map.dateFrom.toISOString()).toBe(from);
        expect(map.dateTo.toISOString()).toBe(to);
        expect(
          (map.dateTo.getTime() - map.dateFrom.getTime() + 1) / 3_600_000,
        ).toBe(hours);
      },
    );
    it.each([
      ["2026-02-30"],
      ["2026-13-01"],
      ["not-a-date"],
      [["2026-01-23", "2026-07-23"]],
    ])("ignores impossible or malformed dates %s in " + locale, async (day) => {
      await DiscoverPage(pageProps(locale, { dateFrom: day, dateTo: day }));
      await MapPage(pageProps(locale, { dateFrom: day, dateTo: day }));
      for (const [request] of mocks.recommend.mock.calls) {
        expect(request.query.dateFrom).toBeUndefined();
        expect(request.query.dateTo).toBeUndefined();
      }
    });
  }
});

it("uses the filtered recommendation set for map pins", async () => {
  mocks.recommend.mockResolvedValueOnce({
    requestId: "filtered-map",
    items: [
      {
        reasonCodes: [],
        result: {
          event: {
            id: "event-filtered",
            slug: "filtered-event",
            title: { es: "Evento filtrado", en: "Filtered event" },
            category: "music",
            location: null,
            priceCents: 0,
            currency: "EUR",
            priceDisplayMode: "show",
            source: "official",
            venueId: "venue-filtered",
          },
          venue: {
            id: "venue-filtered",
            name: "Filtered venue",
            latitude: 40.42,
            longitude: -3.7,
          },
          occurrence: {
            id: "occurrence-filtered",
            startsAt: new Date("2026-11-01T18:00:00Z"),
          },
        },
      },
    ],
  });

  render(
    await MapPage(
      pageProps("en", {
        locality: "madrid",
        category: "music",
        price: "free",
      }),
    ),
  );

  expect(mocks.discover).not.toHaveBeenCalled();
  expect(mocks.mapProps).toHaveBeenCalledWith(
    expect.objectContaining({
      points: [
        expect.objectContaining({
          id: "event-filtered",
          href: "/en/events/filtered-event?occurrence=occurrence-filtered",
          category: "music",
        }),
      ],
    }),
  );
});

it.each(["en", "es"] as const)(
  "opens the date-filtered recurring event occurrence from its %s map pin",
  async (locale) => {
    const occurrences: Occurrence[] = [
      {
        id: "first-night",
        startsAt: "2026-11-01T18:00:00Z",
        endsAt: "2026-11-01T21:00:00Z",
        status: "scheduled",
      },
      {
        id: "selected-night",
        startsAt: "2026-11-08T18:00:00Z",
        endsAt: "2026-11-08T21:00:00Z",
        status: "scheduled",
      },
    ];
    mocks.recommend.mockResolvedValueOnce({
      requestId: "synthetic-filtered-recurring-event",
      items: [
        {
          reasonCodes: [],
          result: {
            event: {
              id: "recurring-event",
              slug: "recurring-show",
              title: { en: "Synthetic recurring show", es: "Evento de prueba" },
              category: "music",
              priceCents: 0,
              currency: "EUR",
              source: "verified_venue",
              venueId: "synthetic-venue",
            },
            venue: {
              name: "Synthetic venue",
              latitude: 36.72,
              longitude: -4.42,
            },
            occurrence: occurrences[1],
          },
        },
      ],
    });
    render(
      await MapPage(
        pageProps(locale, {
          dateFrom: "2026-11-08",
          dateTo: "2026-11-08",
          category: "music",
        }),
      ),
    );
    const point = mocks.mapProps.mock.calls[0][0].points[0];
    const destination = new URL(point.href, "https://example.test");
    expect(destination.pathname).toBe(`/${locale}/events/recurring-show`);
    expect(destination.searchParams.get("occurrence")).toBe("selected-night");
    expect(point.startsAt).toBe(occurrences[1].startsAt);
    const now = new Date("2026-10-30T12:00:00Z");
    // The real detail selector defaults to the earlier night without context.
    expect(selectEventOccurrence(occurrences, undefined, now)?.id).toBe(
      "first-night",
    );
    expect(
      selectEventOccurrence(
        occurrences,
        destination.searchParams.get("occurrence"),
        now,
      ),
    ).toBe(occurrences[1]);
    expect(mocks.recommend.mock.calls[0][0].query.dateFrom.toISOString()).toBe(
      "2026-11-07T23:00:00.000Z",
    );
    expect(mocks.discover).not.toHaveBeenCalled();
  },
);

it("keeps every active filter in the empty-state Map handoff", async () => {
  render(
    await DiscoverPage(
      pageProps("en", {
        locality: "madrid",
        locationName: "Madrid Centro",
        latitude: "40.4168",
        longitude: "-3.7038",
        radius: "15",
        time: "weekend",
        category: "music",
        price: "paid",
        minPrice: "5",
        maxPrice: "25",
        dateFrom: "2026-11-01",
        dateTo: "2026-11-02",
        accessible: "on",
      }),
    ),
  );

  const href = screen
    .getByRole("link", { name: "Explore map" })
    .getAttribute("href")!;
  const destination = new URL(href, "https://akipasa.com");
  expect(destination.pathname).toBe("/en/map");
  expect(destination.searchParams.get("category")).toBe("music");
  expect(destination.searchParams.get("price")).toBe("paid");
  expect(destination.searchParams.get("minPrice")).toBe("5");
  expect(destination.searchParams.get("maxPrice")).toBe("25");
  expect(destination.searchParams.get("dateFrom")).toBe("2026-11-01");
  expect(destination.searchParams.get("dateTo")).toBe("2026-11-02");
  expect(destination.searchParams.get("accessible")).toBe("on");
});

it("offers an area reset instead of a no-op radius action at 100 km", async () => {
  render(await DiscoverPage(pageProps("en", { radius: "100" })));

  expect(
    screen.queryByRole("link", { name: "Expand radius" }),
  ).not.toBeInTheDocument();
  expect(
    screen.getByRole("link", { name: "Change area and reset filters" }),
  ).toHaveAttribute("href", "/en");
});

describe("truthful homepage venue status", () => {
  it.each(["en", "es"] as const)(
    "keeps claimed and unclaimed rows distinct in %s",
    async (locale) => {
      mocks.nearby.mockResolvedValue({
        total: 2,
        page: 1,
        rows: ["claimed", "unclaimed"].map((claimStatus) => ({
          id: claimStatus,
          name: `${claimStatus} business`,
          slug: `${claimStatus}-business`,
          address: "Synthetic address",
          distanceKm: 1,
          claimStatus,
        })),
      });
      render(await DiscoverPage(pageProps(locale)));
      const claimed = screen.getByText("claimed business").closest("a")!;
      const unclaimed = screen.getByText("unclaimed business").closest("a")!;
      expect(
        within(claimed).getByText(locale === "es" ? "Local" : "Venue"),
      ).toBeInTheDocument();
      expect(
        within(unclaimed).getByText(
          locale === "es" ? "No reclamado" : "Unclaimed",
        ),
      ).toBeInTheDocument();
      expect(claimed).toHaveAttribute(
        "href",
        `/${locale}/venues/claimed-business`,
      );
      expect(unclaimed).toHaveAttribute(
        "href",
        `/${locale}/venues/unclaimed-business`,
      );
      expect(mocks.nearby.mock.calls[0][0]).not.toHaveProperty(
        "unclaimedOnly",
        true,
      );
    },
  );
});

function reportForm(
  locale: string,
  target = reportTarget,
  details = "Incorrect opening information",
) {
  const form = new FormData();
  Object.entries({ locale, target, reason: "incorrect", details }).forEach(
    ([name, value]) => form.set(name, value),
  );
  return form;
}

function suggestionForm(locale: string) {
  const form = new FormData();
  Object.entries({
    locale,
    venueName: "Synthetic venue",
    venueAddress: "Synthetic address, Málaga",
    addressSelection: "selected",
    locality: "Málaga",
    province: "Málaga",
    postalCode: "29001",
    latitude: "36.72",
    longitude: "-4.42",
    addressProviderId: "synthetic-location",
    categoryId: targetId,
    title: "Synthetic community event",
    description: "A synthetic description used only by inert test adapters.",
    startsAt: "2026-11-02T18:00",
    endsAt: "2026-11-02T20:00",
    sourceUrl: "",
  }).forEach(([name, value]) => form.set(name, value));
  return form;
}

async function redirectedQuery(
  action: (form: FormData) => Promise<unknown>,
  form: FormData,
) {
  await expect(action(form)).rejects.toThrow("redirect:");
  return new URL(mocks.redirect.mock.lastCall![0], "https://akipasa.com");
}

describe("community workflow return paths", () => {
  for (const locale of ["en", "es"] as const) {
    it("shows report success in its history in " + locale, async () => {
      const destination = await redirectedQuery(
        submitReport,
        reportForm(locale),
      );
      expect(destination.pathname).toBe(`/${locale}/community`);
      expect(destination.searchParams.get("view")).toBe("reports");
      expect(destination.searchParams.get("created")).toBe("report");
      expect(mocks.rpc).toHaveBeenCalledWith("submit_report", {
        target_type: "venue",
        target_id: targetId,
        reason: "incorrect",
        details: "Incorrect opening information",
      });
      expect(mocks.requireUser).toHaveBeenCalledWith(
        locale,
        `/${locale}/community?view=report&target=${encodeURIComponent(reportTarget)}`,
      );
      render(
        await CommunityPage({
          params: Promise.resolve({ locale }),
          searchParams: Promise.resolve(
            Object.fromEntries(destination.searchParams),
          ),
        }),
      );
      expect(
        screen.getByText(
          locale === "es"
            ? "Consulta abajo el estado actual de tu envío."
            : "Check your submission’s current status below.",
        ),
      ).toBeInTheDocument();
      expect(
        screen.getByText(
          locale === "es" ? "Problemas comunicados" : "Reported problems",
        ),
      ).toBeInTheDocument();
    });
    it(
      "shows suggestion success without dropping moderation in " + locale,
      async () => {
        const destination = await redirectedQuery(
          submitCommunityEvent,
          suggestionForm(locale),
        );
        expect(destination.searchParams.get("view")).toBe("suggestions");
        expect(destination.searchParams.get("created")).toBe("submission");
        expect(mocks.review).toHaveBeenCalledWith({
          targetType: "submission",
          targetId: submissionId,
          requesterId: "30000000-0000-4000-8000-000000000003",
        });
        expect(mocks.requireUser).toHaveBeenCalledWith(
          locale,
          `/${locale}/community?view=suggest`,
        );
        render(
          await CommunityPage({
            params: Promise.resolve({ locale }),
            searchParams: Promise.resolve(
              Object.fromEntries(destination.searchParams),
            ),
          }),
        );
        expect(
          screen.getByText(
            locale === "es"
              ? "Consulta abajo el estado actual de tu envío."
              : "Check your submission’s current status below.",
          ),
        ).toBeInTheDocument();
        expect(
          screen.getByText(
            locale === "es" ? "Tus eventos propuestos" : "Your proposed events",
          ),
        ).toBeInTheDocument();
      },
    );
    it(
      "retains a valid report target after validation failure in " + locale,
      async () => {
        const destination = await redirectedQuery(
          submitReport,
          reportForm(locale, reportTarget, "short"),
        );
        expect(destination.searchParams.get("view")).toBe("report");
        expect(destination.searchParams.get("target")).toBe(reportTarget);
        expect(destination.searchParams.get("error")).toBe("report");
        expect(mocks.rpc).not.toHaveBeenCalled();
        render(
          await CommunityPage({
            params: Promise.resolve({ locale }),
            searchParams: Promise.resolve(
              Object.fromEntries(destination.searchParams),
            ),
          }),
        );
        expect(
          screen.getByText(
            locale === "es"
              ? "No se pudo enviar. Revisa los datos o si ya mandaste el mismo aviso."
              : "Could not submit. Check the details or whether you already sent the same report.",
          ),
        ).toBeInTheDocument();
        expect(
          screen.getByLabelText(locale === "es" ? "Elemento" : "Item"),
        ).toHaveValue(reportTarget);
      },
    );
    it.each(["rate limit exceeded", "unavailable"])(
      "shows RPC report errors on the form (%s) in " + locale,
      async (message) => {
        mocks.rpc.mockResolvedValue({ data: null, error: { message } });
        const destination = await redirectedQuery(
          submitReport,
          reportForm(locale),
        );
        expect(destination.searchParams.get("view")).toBe("report");
        expect(destination.searchParams.get("target")).toBe(reportTarget);
        expect(destination.searchParams.get("error")).toBe(
          message.includes("rate limit") ? "rate-limit" : "report",
        );
      },
    );
    it("returns invalid suggestions to their form in " + locale, async () => {
      const form = suggestionForm(locale);
      form.set("endsAt", "2026-11-02T17:00");
      const destination = await redirectedQuery(submitCommunityEvent, form);
      expect(destination.searchParams.get("view")).toBe("suggest");
      expect(destination.searchParams.get("error")).toBe("submission");
      expect(mocks.rpc).not.toHaveBeenCalled();
    });
    it.each(["rate limit exceeded", "unavailable"])(
      "returns suggestion RPC errors to their form (%s) in " + locale,
      async (message) => {
        mocks.rpc.mockResolvedValue({ data: null, error: { message } });
        const destination = await redirectedQuery(
          submitCommunityEvent,
          suggestionForm(locale),
        );
        expect(destination.searchParams.get("view")).toBe("suggest");
        expect(destination.searchParams.get("error")).toBe(
          message.includes("rate limit") ? "rate-limit" : "submission",
        );
        expect(mocks.review).not.toHaveBeenCalled();
      },
    );
    it(
      "preserves the selected page and report target through the auth guard in " +
        locale,
      async () => {
        await CommunityPage({
          params: Promise.resolve({ locale }),
          searchParams: Promise.resolve({ target: reportTarget }),
        });
        expect(mocks.requireUser).toHaveBeenCalledWith(
          locale,
          `/${locale}/community?view=report&target=${encodeURIComponent(reportTarget)}`,
        );
        await CommunityPage({
          params: Promise.resolve({ locale }),
          searchParams: Promise.resolve({ view: "suggest" }),
        });
        expect(mocks.requireUser).toHaveBeenLastCalledWith(
          locale,
          `/${locale}/community?view=suggest`,
        );
      },
    );
    it.each([
      `venue:${targetId}:extra`,
      "https://example.invalid",
      "venue:not-a-uuid",
      `profile:${targetId}`,
    ])(
      "does not copy invalid report targets %s into return paths in " + locale,
      async (target) => {
        const destination = await redirectedQuery(
          submitReport,
          reportForm(locale, target),
        );
        expect(destination.searchParams.has("target")).toBe(false);
        if (!target.endsWith(":extra"))
          expect(mocks.rpc).not.toHaveBeenCalled();
        await CommunityPage({
          params: Promise.resolve({ locale }),
          searchParams: Promise.resolve({ view: "report", target }),
        });
        expect(mocks.requireUser).toHaveBeenLastCalledWith(
          locale,
          `/${locale}/community?view=report`,
        );
      },
    );
    it(
      "renders a public Community landing rather than redirecting in " + locale,
      async () => {
        const landing = await CommunityPage({
          params: Promise.resolve({ locale }),
          searchParams: Promise.resolve({}),
        });
        render(landing);
        expect(
          screen.getByRole("link", {
            name: locale === "es" ? /Explorar creadores/ : /Explore creators/,
          }),
        ).toHaveAttribute("href", `/${locale}/community/creators`);
        expect(mocks.redirect).not.toHaveBeenCalled();
        expect(mocks.requireUser).not.toHaveBeenCalled();
      },
    );
  }
});

describe("community catalogue recovery", () => {
  it("withholds suggestions when feature availability cannot be confirmed", async () => {
    mocks.flagUnavailable = true;
    render(await CommunityPage(communityProps("en", { view: "suggest" })));

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Suggestion availability cannot be confirmed right now.",
    );
    expect(
      screen.queryByRole("button", { name: "Submit for review" }),
    ).not.toBeInTheDocument();
  });

  it.each([
    ["categories", "suggest", "Categories are unavailable right now."],
    ["events", "report", "Published report targets are unavailable right now."],
    [
      "event_submissions",
      "suggestions",
      "Your suggestions are unavailable right now.",
    ],
    ["reports", "reports", "Your reports are unavailable right now."],
  ] as const)(
    "does not present a failed %s read as empty",
    async (table, view, message) => {
      failedTable = table;
      render(await CommunityPage(communityProps("en", { view })));

      expect(screen.getByRole("alert")).toHaveTextContent(message);
      expect(
        screen.queryByText("private read failure"),
      ).not.toBeInTheDocument();
      if (table === "categories") {
        expect(
          screen.queryByRole("button", { name: "Submit for review" }),
        ).not.toBeInTheDocument();
      }
      if (table === "events") {
        expect(screen.queryByLabelText("Item")).not.toBeInTheDocument();
      }
    },
  );

  it("bounds and escapes report-target search while loading a linked target exactly", async () => {
    reads.venues = [];
    render(
      await CommunityPage(
        communityProps("en", {
          view: "report",
          target: reportTarget,
          target_q: 'Café, 100% "central"',
        }),
      ),
    );

    expect(mocks.query).toHaveBeenCalledWith("events", "limit", 50);
    expect(mocks.query).toHaveBeenCalledWith("venues", "limit", 50);
    expect(mocks.query).toHaveBeenCalledWith("venues", "eq", "id", targetId);
    expect(mocks.requireUser).toHaveBeenCalledWith(
      "en",
      `/en/community?view=report&target=${encodeURIComponent(reportTarget)}&target_q=Caf%C3%A9%2C+100%25+%22central%22`,
    );
    const eventFilter = mocks.query.mock.calls.find(
      ([table, operation]) => table === "events" && operation === "or",
    )?.[2] as string;
    expect(eventFilter).toContain("title_es.ilike");
    expect(eventFilter).toContain("\\\\%");
    expect(eventFilter).toContain('\\"central\\"');
    expect(screen.getByLabelText("Item")).toHaveValue(reportTarget);
  });
});

describe("community workflow presentation", () => {
  afterEach(() => {
    reads.reports = [];
    reads.event_submissions = [];
  });
  it.each(["en", "es"] as const)(
    "renders one task heading and localized history labels in %s without changing source values",
    async (locale) => {
      reads.reports = [
        {
          id: "report-a",
          target_type: "event",
          reason: "incorrect",
          state: "open",
          created_at: "2026-10-29T12:00:00Z",
        },
      ];
      render(await CommunityPage(communityProps(locale, { view: "reports" })));
      expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
      expect(
        screen.getByRole("heading", {
          level: 1,
          name: locale === "es" ? "Problemas comunicados" : "Reported problems",
        }),
      ).toBeInTheDocument();
      expect(
        screen.getByText(
          locale === "es"
            ? "Evento · Datos incorrectos"
            : "Event · Incorrect details",
        ),
      ).toBeInTheDocument();
      expect(
        screen.getByText(locale === "es" ? "Abierto" : "Open"),
      ).toBeInTheDocument();
      expect(reads.reports[0]).toMatchObject({
        target_type: "event",
        reason: "incorrect",
        state: "open",
      });
    },
  );
  it("localizes Spanish report options while preserving the submitted enum values", async () => {
    render(
      await CommunityPage(
        communityProps("es", { view: "report", target: reportTarget }),
      ),
    );
    expect(screen.getByRole("option", { name: "Estafa" })).toHaveValue("scam");
    expect(screen.getByLabelText("Elemento")).toHaveValue(reportTarget);
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
  });
  it("does not turn an untrusted created query into a successful submission claim", async () => {
    render(
      await CommunityPage(
        communityProps("en", { view: "reports", created: "report" }),
      ),
    );
    expect(screen.getByRole("status")).toHaveTextContent(
      "Check your submission’s current status below.",
    );
    expect(screen.getByText("No reports submitted yet.")).toBeInTheDocument();
    expect(
      screen.queryByText("Submitted successfully for review."),
    ).not.toBeInTheDocument();
  });
  it("describes suggestion review without promising publication", async () => {
    render(await CommunityPage(communityProps("es", { view: "suggest" })));
    expect(
      screen.getByText(/La publicación depende de su aprobación/),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Título del evento")).toBeInTheDocument();
    expect(screen.getByLabelText("Descripción")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Enviar a revisión" }),
    ).toBeInTheDocument();
  });
});
