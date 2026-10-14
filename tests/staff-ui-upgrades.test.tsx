// @vitest-environment jsdom

import React from "react";
import "@testing-library/jest-dom/vitest";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { createClient } from "@supabase/supabase-js";

const fixture = vi.hoisted(() => ({
  failedTable: "",
  tables: {} as Record<string, unknown>,
  counts: {} as Record<string, number | null>,
  supabase: null as unknown,
}));

vi.mock("@/lib/auth", () => ({
  requireUser: async () => ({
    user: { id: "staff-ui-fixture" },
    supabase: fixture.supabase || {
      from: (table: string) => {
        const result = () => ({
          data: fixture.tables[table] ?? [],
          count: fixture.counts[table] ?? null,
          error:
            fixture.failedTable === table
              ? { message: "Private failed read" }
              : null,
        });
        const query = {
          select: () => query,
          eq: () => query,
          in: () => query,
          order: () => query,
          limit: () => query,
          ilike: () => query,
          or: () => query,
          maybeSingle: async () => result(),
          then: (resolve: (value: ReturnType<typeof result>) => unknown) =>
            Promise.resolve(result()).then(resolve),
        };
        return query;
      },
    },
  }),
}));
vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("not-found");
  },
  redirect: () => {
    throw new Error("redirect");
  },
}));
vi.mock("@/components/SpainAddressAutocomplete", () => ({
  SpainAddressAutocomplete: () => <input aria-label="Address" />,
}));
vi.mock("../src/app/[locale]/moderation/actions", () => ({
  resolveReport: vi.fn(),
}));
vi.mock("../src/app/[locale]/staff/creators/actions", () => ({
  moderateCreator: vi.fn(),
}));
vi.mock("../src/app/[locale]/staff/catalogue/actions", () => ({
  operatorDeleteCatalogueItem: vi.fn(),
  operatorUpdateEvent: vi.fn(),
  operatorUpdateVenue: vi.fn(),
  reviewBusinessApplication: vi.fn(),
}));

import SupportPage from "../src/app/[locale]/staff/support/page";
import CreatorModerationPage from "../src/app/[locale]/staff/creators/page";
import StaffCataloguePage from "../src/app/[locale]/staff/catalogue/page";
import StaffVenueRecord from "../src/app/[locale]/staff/catalogue/venues/[id]/page";
import AdminOverview from "../src/app/[locale]/admin/page";

const venueId = "10000000-0000-4000-8000-000000000001";
const eventId = "20000000-0000-4000-8000-000000000001";
const event = {
  id: eventId,
  venue_id: venueId,
  title_es: "Concierto de verano",
  title_en: "Summer concert",
  description_es: "Descripción del evento de ejemplo",
  description_en: "Description of the sample event",
  status: "published",
  price_cents: 0,
  booking_url: "",
  venues: { id: venueId, name: "Fixture venue" },
};
const params = (locale: "en" | "es") => Promise.resolve({ locale });

beforeEach(() => {
  fixture.failedTable = "";
  fixture.tables = {};
  fixture.counts = {
    profiles: 0,
    venues: 0,
    account_deletion_requests: 0,
    promotion_requests: 0,
    business_applications: 0,
  };
  fixture.supabase = null;
});
afterEach(cleanup);

for (const locale of ["en", "es"] as const) {
  const es = locale === "es";
  it.each([
    [
      "reports",
      SupportPage,
      "/staff/support",
      es ? "Sin casos abiertos" : "No open cases",
    ],
    [
      "creator_profiles",
      CreatorModerationPage,
      "/staff/creators",
      es ? "No hay solicitudes pendientes." : "No pending requests.",
    ],
    [
      "venues",
      StaffCataloguePage,
      "/staff/catalogue?kind=venues",
      es ? "Sin resultados" : "No results",
    ],
  ] as const)(
    `distinguishes failed %s reads from an empty queue (${locale})`,
    async (table, Page, retrySuffix, emptyTitle) => {
      fixture.failedTable = table;
      fixture.tables[table] =
        table === "reports"
          ? [{ id: "report", details: "Partial stale report" }]
          : [];
      render(
        await Page({
          params: params(locale),
          searchParams: Promise.resolve({}),
        }),
      );
      expect(screen.getByRole("alert")).toBeVisible();
      expect(screen.queryByText(emptyTitle)).not.toBeInTheDocument();
      expect(screen.queryByText("Private failed read")).not.toBeInTheDocument();
      expect(
        screen.getByRole("link", { name: es ? "Reintentar" : "Retry" }),
      ).toHaveAttribute("href", `/${locale}${retrySuffix}`);
      expect(
        screen.queryByRole("button", { name: es ? "Resolver" : "Resolve" }),
      ).not.toBeInTheDocument();
    },
  );

  it.each([
    [SupportPage, es ? "Sin casos abiertos" : "No open cases"],
    [
      CreatorModerationPage,
      es ? "No hay solicitudes pendientes." : "No pending requests.",
    ],
    [StaffCataloguePage, es ? "Sin resultados" : "No results"],
  ] as const)(
    `keeps genuine successful empty states (${locale}, %#)`,
    async (Page, emptyTitle) => {
      render(
        await Page({
          params: params(locale),
          searchParams: Promise.resolve({}),
        }),
      );
      expect(screen.getByText(emptyTitle)).toBeVisible();
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    },
  );

  it(`makes failed creator decisions visible and retains original review inputs (${locale})`, async () => {
    fixture.tables.creator_profiles = [
      {
        profile_id: "creator",
        display_name: "Fixture creator",
        headline_es: "Creator headline",
        bio_es: "Creator biography",
      },
    ];
    const { container } = render(
      await CreatorModerationPage({
        params: params(locale),
        searchParams: Promise.resolve({ error: "moderation" }),
      }),
    );
    expect(screen.getByRole("alert")).toHaveTextContent(
      es ? "No se pudo guardar la decisión" : "Could not save the decision",
    );
    expect(container.querySelector('[name="profileId"]')).toHaveValue(
      "creator",
    );
    expect(container.querySelector('[name="locale"]')).toHaveValue(locale);
    expect(
      screen.getByRole("button", { name: es ? "Verificar" : "Verify" }),
    ).toHaveAttribute("value", "verified");
    expect(
      screen.getByRole("button", { name: es ? "Rechazar" : "Reject" }),
    ).toHaveAttribute("value", "rejected");
  });

  it(`retains catalogue filters when retrying a failed event search (${locale})`, async () => {
    fixture.failedTable = "events";
    render(
      await StaffCataloguePage({
        params: params(locale),
        searchParams: Promise.resolve({
          kind: "events",
          q: "Summer & sun",
          status: "published",
        }),
      }),
    );
    const href = screen
      .getByRole("link", { name: es ? "Reintentar" : "Retry" })
      .getAttribute("href")!;
    const url = new URL(href, "https://example.test");
    expect(url.searchParams.get("kind")).toBe("events");
    expect(url.searchParams.get("q")).toBe("Summer & sun");
    expect(url.searchParams.get("status")).toBe("published");
  });

  it(`opens only the selected already-loaded event and retains audited inputs (${locale})`, async () => {
    fixture.tables.venues = {
      id: venueId,
      name: "Fixture venue",
      slug: "fixture-venue",
      address: "Fixture street",
      status: "published",
      verified: true,
      description_es: "Description of the sample venue",
    };
    fixture.tables.events = [
      event,
      { ...event, id: "20000000-0000-4000-8000-000000000002" },
    ];
    const { container, unmount } = render(
      await StaffVenueRecord({
        params: Promise.resolve({ locale, id: venueId }),
        searchParams: Promise.resolve({ event: eventId }),
      }),
    );
    expect(container.querySelectorAll("details[open]")).toHaveLength(1);
    const selected = container.querySelector(`#event-${eventId}`)!;
    expect(selected).toHaveAttribute("open");
    expect(selected.querySelector('[name="eventId"]')).toHaveValue(eventId);
    expect(selected.querySelector('[name="venueId"]')).toHaveValue(venueId);
    unmount();
    const unknown = render(
      await StaffVenueRecord({
        params: Promise.resolve({ locale, id: venueId }),
        searchParams: Promise.resolve({
          event: "30000000-0000-4000-8000-000000000001",
        }),
      }),
    );
    expect(unknown.container.querySelectorAll("details[open]")).toHaveLength(0);
  });

  it(`deep-links Manage event to its existing venue editor (${locale})`, async () => {
    fixture.tables.events = [event];
    render(
      await StaffCataloguePage({
        params: params(locale),
        searchParams: Promise.resolve({ kind: "events" }),
      }),
    );
    expect(
      screen.getByRole("link", {
        name: es ? "Gestionar evento →" : "Manage event →",
      }),
    ).toHaveAttribute(
      "href",
      `/${locale}/staff/catalogue/venues/${venueId}?event=${eventId}#event-${eventId}`,
    );
  });

  it.each([
    "profiles",
    "venues",
    "account_deletion_requests",
    "promotion_requests",
    "business_applications",
  ])(
    `never reports stable operations for an unavailable %s count (${locale})`,
    async (table) => {
      fixture.failedTable = table;
      fixture.counts[table] = 17;
      render(
        await AdminOverview({
          params: params(locale),
          searchParams: Promise.resolve({}),
        }),
      );
      expect(
        screen.getByRole("heading", {
          name: es
            ? "Estado operativo no disponible"
            : "Operational status unavailable",
        }),
      ).toBeVisible();
      expect(
        screen.queryByText(es ? "Operación estable" : "Operations are stable"),
      ).not.toBeInTheDocument();
      expect(screen.getByRole("alert")).toBeVisible();
      if (table === "profiles" || table === "venues") {
        expect(document.querySelector(".operations-hero p")).toHaveTextContent(
          "—",
        );
      } else {
        expect(
          screen.getAllByLabelText(es ? "No disponible" : "Unavailable"),
        ).toHaveLength(2);
      }
    },
  );

  it(`keeps a confirmed zero stable and selects the real pending privacy priority (${locale})`, async () => {
    const empty = render(
      await AdminOverview({
        params: params(locale),
        searchParams: Promise.resolve({}),
      }),
    );
    expect(
      screen.getByRole("heading", {
        name: es ? "Operación estable" : "Operations are stable",
      }),
    ).toBeVisible();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    empty.unmount();
    fixture.counts.account_deletion_requests = 2;
    fixture.failedTable = "business_applications";
    render(
      await AdminOverview({
        params: params(locale),
        searchParams: Promise.resolve({}),
      }),
    );
    expect(
      screen.getByRole("heading", {
        name: es
          ? "2 asuntos conocidos requieren atención; faltan datos"
          : "2 known items need attention; some data is unavailable",
      }),
    ).toBeVisible();
    expect(
      screen.getByRole("link", {
        name: es ? "Atender prioridad" : "Open priority",
      }),
    ).toHaveAttribute("href", `/${locale}/admin/privacy`);
  });

  it(`distinguishes failed recent audit read from no activity (${locale})`, async () => {
    fixture.failedTable = "moderation_actions";
    render(
      await AdminOverview({
        params: params(locale),
        searchParams: Promise.resolve({}),
      }),
    );
    expect(
      screen.queryByText(
        es ? "Aún no hay cambios recientes." : "No recent changes yet.",
      ),
    ).not.toBeInTheDocument();
    expect(
      screen.getByText(
        es
          ? "No se pudieron cargar los cambios recientes."
          : "Could not load recent changes.",
      ),
    ).toBeVisible();
    expect(
      screen.queryByText(es ? "Operación estable" : "Operations are stable"),
    ).not.toBeInTheDocument();
  });

  it(`prioritizes business applications when privacy is clear and retains its queue link (${locale})`, async () => {
    fixture.counts.business_applications = 3;
    fixture.counts.promotion_requests = 5;
    render(
      await AdminOverview({
        params: params(locale),
        searchParams: Promise.resolve({}),
      }),
    );
    expect(
      screen.getByRole("link", {
        name: es ? "Atender prioridad" : "Open priority",
      }),
    ).toHaveAttribute("href", `/${locale}/admin/business-applications`);
    expect(
      screen.getByRole("link", {
        name: es ? /Solicitudes de negocio/ : /Business applications/,
      }),
    ).toHaveAttribute("href", `/${locale}/admin/business-applications`);
  });

  it(`uses both localized titles through the installed client and quotes filter punctuation (${locale})`, async () => {
    const requests: URL[] = [];
    fixture.supabase = createClient(
      "https://staff-query-fixture.invalid",
      "fixture-key",
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          storageKey: `staff-query-fixture-${locale}`,
        },
        global: {
          fetch: async (input) => {
            requests.push(new URL(String(input)));
            return Response.json([event]);
          },
        },
      },
    );
    const q = 'Summer, "(sun)" 100%_\\';
    render(
      await StaffCataloguePage({
        params: params(locale),
        searchParams: Promise.resolve({
          kind: "events",
          q,
          status: "published",
        }),
      }),
    );
    expect(requests).toHaveLength(1);
    expect(requests[0].searchParams.get("or")).toBe(
      '(title_es.ilike."%Summer, \\"(sun)\\" 100\\\\%\\\\_\\\\\\\\%",title_en.ilike."%Summer, \\"(sun)\\" 100\\\\%\\\\_\\\\\\\\%")',
    );
    expect(requests[0].searchParams.get("status")).toBe("eq.published");
    expect(requests[0].searchParams.get("limit")).toBe("100");
    expect([...requests[0].searchParams.keys()].sort()).toEqual([
      "limit",
      "or",
      "order",
      "select",
      "status",
    ]);
    expect(
      screen.getByRole("heading", {
        name: es ? event.title_es : event.title_en,
      }),
    ).toBeVisible();
  });
}
