// @vitest-environment jsdom
import React from "react";
import "@testing-library/jest-dom/vitest";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";

const navigation = vi.hoisted(() => ({
  search: "",
  replace: vi.fn(),
}));
vi.mock("next/navigation", () => ({
  usePathname: () => "/en",
  useRouter: () => ({ replace: navigation.replace }),
  useSearchParams: () => new URLSearchParams(navigation.search),
}));
vi.mock("@/components/SpainLocationPicker", () => ({
  SpainLocationPicker: () => null,
}));
vi.mock("@/components/UseMyLocation", () => ({ UseMyLocation: () => null }));
vi.mock("@/components/VenueQuickSearch", () => ({
  VenueQuickSearch: () => null,
}));
vi.mock("@/components/Icons", () => ({ Icon: () => null }));

import { GlobalSearch } from "@/components/GlobalSearch";

beforeEach(() => {
  vi.useFakeTimers();
  navigation.search = "";
  navigation.replace.mockReset();
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

it("blocks an inverted price range and explains how to fix it", async () => {
  render(<GlobalSearch locale="en" />);
  fireEvent.change(screen.getByLabelText(/^Minimum price/), {
    target: { value: "20" },
  });
  fireEvent.change(screen.getByLabelText(/^Maximum price/), {
    target: { value: "10" },
  });
  await act(() => vi.advanceTimersByTimeAsync(150));

  expect(navigation.replace).not.toHaveBeenCalled();
  expect(screen.getByRole("alert")).toHaveTextContent(
    "Minimum price cannot be greater than maximum price.",
  );
});

it("navigates once a price range is valid", async () => {
  render(<GlobalSearch locale="en" />);
  fireEvent.change(screen.getByLabelText(/^Minimum price/), {
    target: { value: "10" },
  });
  fireEvent.change(screen.getByLabelText(/^Maximum price/), {
    target: { value: "20" },
  });
  await act(() => vi.advanceTimersByTimeAsync(150));

  expect(navigation.replace).toHaveBeenCalledWith(
    expect.stringContaining("minPrice=10&maxPrice=20"),
    { scroll: false },
  );
  expect(screen.queryByRole("alert")).toBeNull();
});

it("shows removable active filters and a deliberate clear-all action", () => {
  navigation.search =
    "locality=madrid&locationName=Madrid+Centro&category=music&accessible=on&eventPage=3";
  render(<GlobalSearch locale="en" />);

  fireEvent.click(
    screen.getByRole("button", { name: "Remove Category: music" }),
  );
  const categoryDestination = String(navigation.replace.mock.calls[0][0]);
  expect(categoryDestination).not.toContain("category=");
  expect(categoryDestination).not.toContain("eventPage=");
  expect(categoryDestination).toContain("locality=madrid");

  fireEvent.click(screen.getByRole("button", { name: "Clear filters" }));
  expect(navigation.replace).toHaveBeenLastCalledWith("/en", {
    scroll: false,
  });
});
