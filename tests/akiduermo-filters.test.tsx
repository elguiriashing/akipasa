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
    target: { value: "2026-10-10" },
  });
  fireEvent.change(screen.getByLabelText("Check out"), {
    target: { value: "2026-10-14" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Find a stay" }));
  await waitFor(() =>
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("checkIn=2026-10-10"),
      expect.anything(),
    ),
  );
  expect(
    fetchMock.mock.calls.some(
      ([url]) =>
        url.includes("q=Fuengirola") &&
        url.includes("checkOut=2026-10-14") &&
        url.includes("guests=2"),
    ),
  ).toBe(true);
  await waitFor(() =>
    expect(
      screen.getByText(/Availability checked for your dates/),
    ).toBeVisible(),
  );
});
