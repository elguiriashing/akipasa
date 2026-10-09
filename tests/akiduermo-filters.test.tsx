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
    expect(screen.getByRole("link", { name: "Saved (2)" })).toBeInTheDocument(),
  );
  fireEvent.click(screen.getByRole("button", { name: "Hotels" }));
  expect(screen.getByRole("link", { name: "Saved (2)" })).toHaveAttribute(
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
});
