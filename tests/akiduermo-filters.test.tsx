import { readFileSync } from "node:fs";
import { join } from "node:path";
// @vitest-environment jsdom
import React from "react";
import "@testing-library/jest-dom/vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { AkiDuermo } from "../src/components/AkiDuermo";
vi.mock("next/navigation", () => ({ usePathname: () => "/saved" }));
vi.mock("../src/app/akiduermo/account/actions", () => ({
  signOutStay: vi.fn(),
}));
vi.mock("next/dynamic", () => ({
  default: () =>
    function TestMap({
      stayFilters,
    }: {
      stayFilters: { type: string; q: string };
    }) {
      return <div data-testid="stay-map">{stayFilters.type}</div>;
    },
}));
vi.mock("../src/components/ThemeModeControls", () => ({
  ThemeToggle: () => null,
}));
afterEach(() => {
  cleanup();
  localStorage.clear();
  vi.unstubAllGlobals();
});
it("shows saved stays on their own route with local filters and dedicated navigation", async () => {
  vi.stubGlobal("React", React);
  const hotel = {
    id: "00000000-0000-4000-8000-000000000001",
    slug: "hotel",
    name: "Test hotel",
    address: "Málaga",
    city: "Málaga",
    website: null,
    accommodationType: "hotel",
  };
  const apartment = {
    ...hotel,
    id: "00000000-0000-4000-8000-000000000002",
    slug: "apartment",
    name: "Test apartment",
    accommodationType: "apartment",
  };
  localStorage.setItem(
    "akiduermo-saved-v1",
    JSON.stringify([hotel, apartment]),
  );
  Element.prototype.scrollIntoView = vi.fn();
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string) =>
      url.startsWith("/api/map/stays")
        ? Response.json({ ids: [hotel.id], total: 1 })
        : Response.json({ rows: [hotel, apartment], total: 2 }),
    ),
  );
  render(<AkiDuermo initialLocale="en" initialView="saved" />);
  await waitFor(() =>
    expect(screen.getByRole("link", { name: "Saved" })).toBeInTheDocument(),
  );
  expect(screen.queryByRole("region", { name: "Plan your stay" })).toBeNull();
  expect(
    screen.getByRole("searchbox", { name: "Search saved stays" }),
  ).toBeVisible();
  fireEvent.click(screen.getByRole("button", { name: "Hotels" }));
  expect(screen.getByRole("link", { name: "Saved" })).toHaveAttribute(
    "aria-current",
    "page",
  );
  expect(
    screen.getByRole("heading", { name: "Test hotel" }),
  ).toBeInTheDocument();
  expect(
    screen.queryByRole("heading", { name: "Test apartment" }),
  ).not.toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Map" })).toHaveAttribute(
    "href",
    "/map?lang=en",
  );
  fireEvent.click(screen.getByRole("button", { name: "Apartments" }));
  expect(
    screen
      .getByRole("navigation", { name: "AkiDuermo navigation" })
      .querySelector('a[href="/bookings?lang=en"]'),
  ).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Apartments" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  expect(
    screen.getByRole("heading", { name: "Test apartment" }),
  ).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Explore" })).toHaveAttribute(
    "href",
    "/?lang=en",
  );
  expect(
    Array.from(
      screen.getByRole("navigation", { name: "AkiDuermo navigation" }).children,
    ).map((link) => link.textContent),
  ).toEqual(["Explore", "Map", "Saved", "Bookings", "Account"]);
});

it("sends trip dates and guests to live availability search", async () => {
  vi.stubGlobal("React", React);
  const checkIn = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);
  const checkOut = new Date(Date.now() + 5 * 86_400_000)
    .toISOString()
    .slice(0, 10);
  Element.prototype.scrollIntoView = vi.fn();
  const fetchMock = vi.fn(async (url: string) =>
    Response.json({
      rows: [],
      total: 1,
      availabilityChecked: url.includes("checkIn="),
    }),
  );
  vi.stubGlobal("fetch", fetchMock);
  render(<AkiDuermo initialLocale="en" />);
  fireEvent.change(screen.getByRole("textbox", { name: "Destination" }), {
    target: { value: "Fuengirola" },
  });
  fireEvent.change(screen.getByLabelText("Check in"), {
    target: { value: checkIn },
  });
  fireEvent.change(screen.getByLabelText("Check out"), {
    target: { value: checkOut },
  });
  fireEvent.click(screen.getByRole("button", { name: "Find a stay" }));
  await waitFor(() =>
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining(`checkIn=${checkIn}`),
      expect.anything(),
    ),
  );
  expect(
    fetchMock.mock.calls.some(
      ([url]) =>
        url.includes("q=Fuengirola") &&
        url.includes(`checkOut=${checkOut}`) &&
        url.includes("guests=2"),
    ),
  ).toBe(true);
  await waitFor(() =>
    expect(
      screen.getByText(/Availability checked for your dates/),
    ).toBeVisible(),
  );
});

it.each(["en", "es"] as const)(
  "filters device-saved stays without catalogue requests and retains account sync in %s",
  async (locale) => {
    vi.stubGlobal("React", React);
    const es = locale === "es";
    const hotel = {
      id: "00000000-0000-4000-8000-000000000011",
      slug: "saved-hotel",
      name: "Saved hotel",
      address: "Málaga",
      city: "Málaga",
      website: null,
      accommodationType: "hotel",
    };
    const apartment = {
      ...hotel,
      id: "00000000-0000-4000-8000-000000000012",
      slug: "saved-apartment",
      name: "Saved apartment",
      accommodationType: "apartment",
    };
    localStorage.setItem(
      "akiduermo-saved-v1",
      JSON.stringify([hotel, apartment]),
    );
    const fetchMock = vi.fn(async (url: string) => {
      if (url === "/api/stays/saved")
        return Response.json({ authenticated: true, reminders: true });
      throw new Error("Catalogue unavailable");
    });
    vi.stubGlobal("fetch", fetchMock);
    const { unmount } = render(
      <AkiDuermo initialLocale={locale} initialView="saved" />,
    );
    await waitFor(() =>
      expect(
        screen.getByRole("checkbox", {
          name: es ? "Activar emails" : "Email me",
        }),
      ).toBeChecked(),
    );
    expect(screen.getByRole("heading", { name: hotel.name })).toBeVisible();
    fireEvent.click(
      screen.getByRole("button", { name: es ? "Hoteles" : "Hotels" }),
    );
    expect(
      screen.queryByRole("heading", { name: apartment.name }),
    ).not.toBeInTheDocument();
    const search = screen.getByRole("searchbox", {
      name: es ? "Buscar guardados" : "Search saved stays",
    });
    fireEvent.change(search, { target: { value: "unmatched" } });
    expect(screen.queryByRole("heading", { name: hotel.name })).toBeNull();
    fireEvent.change(search, { target: { value: "malaga" } });
    expect(screen.getByRole("heading", { name: hotel.name })).toBeVisible();
    expect(
      fetchMock.mock.calls.filter(([url]) => url.startsWith("/api/stays?")),
    ).toHaveLength(0);
    fireEvent.click(
      screen.getByRole("button", {
        name: `${es ? "Dejar de guardar" : "Unsave"} ${hotel.name}`,
      }),
    );
    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith("/api/stays/saved", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "set-saved",
          venueId: hotel.id,
          saved: false,
          locale,
        }),
      }),
    );
    expect(JSON.parse(localStorage.getItem("akiduermo-saved-v1")!)).toEqual([
      apartment,
    ]);
    unmount();
    fetchMock.mockClear();
    fetchMock.mockImplementation(async (url: string) =>
      url.startsWith("/api/stays?")
        ? Response.json({
            rows: [{ ...hotel, ownerPreview: true }],
            total: 0,
          })
        : Response.json({ authenticated: true, reminders: true }),
    );
    render(<AkiDuermo initialLocale={locale} initialView="explore" />);
    await waitFor(() =>
      expect(screen.getByRole("heading", { name: hotel.name })).toBeVisible(),
    );
    expect(
      screen.getByText(
        es ? "Vista privada de propietario" : "Private owner preview",
      ),
    ).toBeVisible();
    expect(
      fetchMock.mock.calls.filter(([url]) => url.startsWith("/api/stays?")),
    ).toHaveLength(1);
  },
);


it("presents a scoped real-data AkiDuermo account overview without inventing saved counts", () => {
  const account = readFileSync(join(process.cwd(), "src/app/akiduermo/account/page.tsx"), "utf8");
  const style = readFileSync(join(process.cwd(), "src/app/akiduermo/account/account.module.css"), "utf8");
  expect(account).toContain('requireUser(locale, "/account")');
  expect(account).toContain('.eq("profile_id", user.id)');
  expect(account).toContain('.select("id", { count: "exact", head: true })');
  expect(account).toContain("stayReservationStatusLabel(stay.status, locale)");
  expect(account).toContain("signOutStay");
  expect(account).toContain("Favourites on this device");
  expect(account).not.toContain("saved.count");
  expect(style).toContain("@media (max-width: 620px)");
  expect(style).toContain(':global(html[data-theme="light"])');
});
