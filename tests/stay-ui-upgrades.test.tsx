// @vitest-environment jsdom
import React, { type ReactNode } from "react";
import "@testing-library/jest-dom/vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  locale: "en",
  requireUser: vi.fn(),
}));
vi.mock("next/headers", () => ({
  headers: async () => new Headers({ "x-akipasa-locale": mocks.locale }),
}));
vi.mock("@/lib/auth", () => ({ requireUser: mocks.requireUser }));
vi.mock("@/lib/suite-welcome", () => ({
  queueSuitePortalWelcome: async () => {},
}));
vi.mock("../src/app/akiduermo/bookings/actions", () => ({
  cancelStayRequest: async () => {},
}));
vi.mock("next/link", () => ({
  default: ({ children, ...props }: React.ComponentProps<"a">) => (
    <a {...props}>{children}</a>
  ),
}));
vi.mock("next/image", () => ({ default: () => null }));
vi.mock("@/components/StayAppShell", () => ({
  StayAppShell: ({ children }: { children: ReactNode }) => (
    <main>{children}</main>
  ),
}));
vi.mock("../src/components/StayHeader", () => ({ StayHeader: () => null }));
vi.mock("../src/components/StayNavigation", () => ({
  StayNavigation: () => null,
}));

import StayBookingsPage from "../src/app/akiduermo/bookings/page";
import { AccommodationBookingWorkspace } from "../src/components/AccommodationBookingWorkspace";
import { StayBookingPanel } from "../src/components/StayBookingPanel";
import { StayProperty } from "../src/components/StayProperty";
import { stayReservationStatusLabel } from "../src/lib/stay-reservation-status";

beforeEach(() => {
  window.history.replaceState(null, "", "/");
  localStorage.clear();
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

const actualStatuses = [
  "requested",
  "confirmed",
  "checked_in",
  "completed",
  "cancelled",
  "declined",
];

function historyFixture() {
  const records = actualStatuses.map((status) => ({
    id: status,
    profile_id: "customer",
    check_in: "2027-03-20",
    check_out: "2027-03-25",
    status,
    guests: 2,
    quoted_total_cents: 30000,
    quote_snapshot: { room_name: `Room ${status}` },
  }));
  const filters: Array<[string, unknown]> = [];
  const query = {
    select: () => query,
    eq: (key: string, value: unknown) => {
      filters.push([key, value]);
      return query;
    },
    in: (key: string, value: unknown) => {
      filters.push([key, value]);
      return query;
    },
    gt: (key: string, value: unknown) => {
      filters.push([`gt:${key}`, value]);
      return query;
    },
    lte: (key: string, value: unknown) => {
      filters.push([`lte:${key}`, value]);
      return query;
    },
    or: (value: string) => {
      filters.push(["or", value]);
      return query;
    },
    order: () => query,
    range: async () => {
      const or = filters.find(([key]) => key === "or")?.[1] as
        | string
        | undefined;
      const states = filters.find(([key]) => key === "status")?.[1] as
        | string[]
        | undefined;
      const data = records.filter((row) =>
        or
          ? or.includes(`status.eq.${row.status}`)
          : states?.includes(row.status),
      );
      return { data, count: data.length, error: null };
    },
  };
  mocks.requireUser.mockResolvedValue({
    user: { id: "customer" },
    supabase: { from: () => query },
  });
  return filters;
}

describe("customer stay history", () => {
  it.each(["en", "es"] as const)(
    "keeps declined and completed future stays visible in Past in %s",
    async (locale) => {
      mocks.locale = locale;
      vi.useFakeTimers({ toFake: ["Date"] });
      vi.setSystemTime(new Date("2026-10-14T12:00:00Z"));
      const filters = historyFixture();
      render(
        await StayBookingsPage({
          searchParams: Promise.resolve({ tab: "past" }),
        }),
      );
      expect(screen.getByText("Room declined")).toBeVisible();
      expect(screen.getByText("Room completed")).toBeVisible();
      expect(screen.getByText("Room cancelled")).toBeVisible();
      expect(screen.queryByText("Room confirmed")).not.toBeInTheDocument();
      expect(screen.getByText(/Rechazada|Declined/)).toBeVisible();
      expect(filters).toContainEqual(["profile_id", "customer"]);
      expect(screen.queryByRole("button")).not.toBeInTheDocument();
    },
  );

  it("retains the upcoming active-state filter and future cancellation", async () => {
    mocks.locale = "en";
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-10-14T12:00:00Z"));
    const filters = historyFixture();
    render(await StayBookingsPage({ searchParams: Promise.resolve({}) }));
    expect(screen.getByText("Room requested")).toBeVisible();
    expect(screen.getByText("Room confirmed")).toBeVisible();
    expect(screen.queryByText("Room declined")).not.toBeInTheDocument();
    expect(
      screen.getAllByRole("button", { name: "Cancel request" }),
    ).toHaveLength(2);
    expect(filters).toContainEqual([
      "status",
      ["requested", "confirmed", "checked_in"],
    ]);
    expect(filters).toContainEqual(["gt:check_in", "2026-10-14"]);
  });
});

const stay = {
  id: "00000000-0000-4000-8000-000000000001",
  slug: "example-stay",
  name: "Example stay",
  address: "Málaga",
  city: "Málaga",
  website: null,
  accommodationType: "hotel",
  descriptionEs: "",
  descriptionEn: "",
  photos: [],
  bookingMode: "request" as const,
};

describe("search-to-stay booking handoff", () => {
  it.each(["en", "es"] as const)(
    "carries URL dates and guests into editable booking defaults in %s without fetching automatically",
    async (locale) => {
      window.history.replaceState(
        null,
        "",
        "/stays/example-stay?checkIn=2027-03-20&checkOut=2027-03-25&guests=4",
      );
      const fetchMock = vi.fn(async (url: string) => {
        expect(url).toMatch(/^\/api\/stays\/bookings\?/);
        return Response.json({ rooms: [] });
      });
      vi.stubGlobal("fetch", fetchMock);
      render(<StayProperty stay={stay} initialLocale={locale} />);
      expect(
        screen.getByLabelText(locale === "es" ? "Entrada" : "Check in"),
      ).toHaveValue("2027-03-20");
      expect(
        screen.getByLabelText(locale === "es" ? "Salida" : "Check out"),
      ).toHaveValue("2027-03-25");
      const guests = screen.getByRole("spinbutton", {
        name: locale === "es" ? "Huéspedes" : "Guests",
      });
      expect(guests).toHaveValue(4);
      expect(fetchMock).not.toHaveBeenCalled();
      fireEvent.change(guests, { target: { value: "3" } });
      fireEvent.click(
        screen.getByRole("button", {
          name:
            locale === "es" ? "Consultar disponibilidad" : "Check availability",
        }),
      );
      await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
      const href = String(fetchMock.mock.calls[0]?.[0]);
      const params = new URL(href, "https://example.com").searchParams;
      expect(params.get("venue")).toBe(stay.id);
      expect(params.get("checkIn")).toBe("2027-03-20");
      expect(params.get("checkOut")).toBe("2027-03-25");
      expect(params.get("guests")).toBe("3");
      expect(
        screen.queryByRole("button", {
          name: /Request stay|Solicitar estancia/,
        }),
      ).not.toBeInTheDocument();
    },
  );

  it.each([
    ["2027-02-30", "2027-03-05", "-5", "", "", 2],
    ["2027-03-20", "2027-03-19", "99", "2027-03-20", "", 2],
    ["junk", "2027-03-25", "2", "", "", 2],
  ])(
    "rejects malformed trip defaults (%s, %s, %s)",
    (
      arrival,
      departure,
      count,
      expectedArrival,
      expectedDeparture,
      expectedGuests,
    ) => {
      window.history.replaceState(
        null,
        "",
        `/stays/example-stay?${new URLSearchParams({ checkIn: String(arrival), checkOut: String(departure), guests: String(count) })}`,
      );
      render(<StayProperty stay={stay} initialLocale="en" />);
      expect(screen.getByLabelText("Check in")).toHaveValue(expectedArrival);
      expect(screen.getByLabelText("Check out")).toHaveValue(expectedDeparture);
      expect(screen.getByRole("spinbutton", { name: "Guests" })).toHaveValue(
        expectedGuests,
      );
      expect(
        screen.getByRole("button", { name: "Check availability" }),
      ).toBeDisabled();
    },
  );

  it("does not overwrite the customer's edits on subsequent prop renders", () => {
    const initialTrip = {
      q: "",
      checkIn: "2027-03-20",
      checkOut: "2027-03-25",
      guests: 4,
    };
    const view = render(
      <StayBookingPanel
        venueId={stay.id}
        locale="en"
        initialTrip={initialTrip}
      />,
    );
    fireEvent.change(screen.getByRole("spinbutton", { name: "Guests" }), {
      target: { value: "3" },
    });
    view.rerender(
      <StayBookingPanel
        venueId={stay.id}
        locale="es"
        initialTrip={{ ...initialTrip }}
      />,
    );
    expect(screen.getByRole("spinbutton", { name: "Huéspedes" })).toHaveValue(
      3,
    );
  });
});

it("uses the new trip when navigating to a different property", () => {
  window.history.replaceState(
    null,
    "",
    "/stays/example-stay?checkIn=2027-03-20&checkOut=2027-03-25&guests=4",
  );
  const view = render(<StayProperty stay={stay} initialLocale="en" />);
  fireEvent.change(screen.getByRole("spinbutton", { name: "Guests" }), {
    target: { value: "3" },
  });
  window.history.replaceState(
    null,
    "",
    "/stays/another-stay?checkIn=2027-04-10&checkOut=2027-04-12&guests=2",
  );
  view.rerender(
    <StayProperty
      stay={{ ...stay, id: "another-property", slug: "another-stay" }}
      initialLocale="en"
    />,
  );
  expect(screen.getByLabelText("Check in")).toHaveValue("2027-04-10");
  expect(screen.getByLabelText("Check out")).toHaveValue("2027-04-12");
  expect(screen.getByRole("spinbutton", { name: "Guests" })).toHaveValue(2);
});

const reservations = actualStatuses.map((status) => ({
  id: status,
  unit_id: "unit",
  check_in: "2027-03-20",
  check_out: "2027-03-25",
  guests: 2,
  status,
  contact_name: `Guest ${status}`,
  contact_email: `${status}@example.com`,
  quoted_total_cents: 30000,
}));

describe("accommodation inbox", () => {
  it.each(["en", "es"] as const)(
    "localizes statuses and explains unmatched filters in %s",
    (locale) => {
      const es = locale === "es";
      render(
        <AccommodationBookingWorkspace
          locale={locale}
          venueId={stay.id}
          reservations={reservations}
        />,
      );
      const select = screen.getByRole("combobox", {
        name: es ? "Estado" : "Status",
      });
      actualStatuses.forEach((status) => {
        expect(
          within(select).getByRole("option", {
            name: stayReservationStatusLabel(status, locale),
          }),
        ).toHaveValue(status);
      });
      fireEvent.change(select, { target: { value: "checked_in" } });
      expect(screen.getByText("Guest checked_in")).toBeVisible();
      expect(screen.queryByText("Guest requested")).not.toBeInTheDocument();
      expect(window.location.search).toContain("stayStatus=checked_in");
      fireEvent.change(
        screen.getByRole("searchbox", { name: es ? "Buscar" : "Search" }),
        { target: { value: "no matching guest" } },
      );
      expect(
        screen.getByText(
          es
            ? "Ninguna reserva coincide con estos filtros."
            : "No reservations match these filters.",
        ),
      ).toHaveAttribute("role", "status");
      fireEvent.change(screen.getByRole("searchbox"), {
        target: { value: "" },
      });
      expect(screen.getByText("Guest checked_in")).toBeVisible();
    },
  );

  it("retains manager transition values and fallback for an unknown status", () => {
    const action = async () => {};
    render(
      <AccommodationBookingWorkspace
        locale="es"
        venueId={stay.id}
        reservations={[reservations[0]]}
        actions={{
          createRoomType: action,
          updateRoomType: action,
          createUnit: action,
          updateUnit: action,
          createRate: action,
          deleteRate: action,
          createBlock: action,
          deleteBlock: action,
          changeStatus: action,
        }}
      />,
    );
    expect(screen.getByRole("button", { name: "Confirmar" })).toHaveAttribute(
      "value",
      "confirmed",
    );
    expect(screen.getByRole("button", { name: "Rechazar" })).toHaveAttribute(
      "value",
      "declined",
    );
    expect(screen.getByRole("button", { name: "Cancelar" })).toHaveAttribute(
      "value",
      "cancelled",
    );
    expect(stayReservationStatusLabel("future_state", "es")).toBe(
      "future_state",
    );
  });
});
