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
import { VenueQuickSearch } from "../src/components/VenueQuickSearch";

beforeEach(() => {
  vi.stubGlobal("React", React);
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});
const row = (id: string) => ({
  id,
  slug: `casa-${id}`,
  name: `Casa ${id}`,
  address: "Málaga",
});
it("appends pages on scroll, keeps a keyboard load button, and resets on query change", async () => {
  vi.useFakeTimers();
  const fetchMock = vi
    .fn()
    .mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        rows: [row("A"), row("B")],
        total: 3,
        nextOffset: 2,
      }),
    })
    .mockResolvedValueOnce({
      ok: true,
      json: async () => ({ rows: [row("Z")], total: 3, nextOffset: null }),
    })
    .mockResolvedValueOnce({
      ok: true,
      json: async () => ({ rows: [], total: 0, nextOffset: null }),
    });
  vi.stubGlobal("fetch", fetchMock);
  render(<VenueQuickSearch locale="en" />);
  fireEvent.change(screen.getByRole("searchbox"), {
    target: { value: "Casa" },
  });
  await act(() => vi.advanceTimersByTimeAsync(300));
  expect(
    screen.getByRole("button", { name: "Show more venues" }),
  ).toBeEnabled();
  const region = screen.getByRole("region", { name: "Venue results" });
  Object.defineProperties(region, {
    scrollHeight: { value: 500 },
    clientHeight: { value: 200 },
    scrollTop: { value: 300, writable: true },
  });
  fireEvent.scroll(region);
  await act(() => vi.advanceTimersByTimeAsync(10));
  expect(fetchMock.mock.calls[1][0]).toContain("offset=2");
  expect(screen.getAllByRole("link")).toHaveLength(3);
  expect(screen.getByText("Casa Z")).toBeInTheDocument();
  fireEvent.change(screen.getByRole("searchbox"), {
    target: { value: "Other" },
  });
  expect(screen.queryByText("Casa A")).not.toBeInTheDocument();
  await act(() => vi.advanceTimersByTimeAsync(300));
  expect(screen.getByText("No venues found.")).toBeInTheDocument();
});

it("does not replace a newer query with a late old response", async () => {
  vi.useFakeTimers();
  let resolveOld!: (value: unknown) => void;
  const fetchMock = vi
    .fn()
    .mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveOld = resolve;
        }),
    )
    .mockResolvedValueOnce({
      ok: true,
      json: async () => ({ rows: [row("New")], total: 1, nextOffset: null }),
    });
  vi.stubGlobal("fetch", fetchMock);
  render(<VenueQuickSearch locale="en" />);
  fireEvent.change(screen.getByRole("searchbox"), { target: { value: "Old" } });
  await act(() => vi.advanceTimersByTimeAsync(300));
  fireEvent.change(screen.getByRole("searchbox"), { target: { value: "New" } });
  await act(() => vi.advanceTimersByTimeAsync(300));
  await act(async () =>
    resolveOld({
      ok: true,
      json: async () => ({ rows: [row("Old")], total: 1, nextOffset: null }),
    }),
  );
  expect(screen.getByText("Casa New")).toBeInTheDocument();
  expect(screen.queryByText("Casa Old")).not.toBeInTheDocument();
});
