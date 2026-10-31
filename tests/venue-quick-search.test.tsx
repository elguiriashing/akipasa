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

it.each(["en", "es"] as const)(
  "%s Home accepts typing in place and shows at most five real matching destinations",
  async (locale) => {
    vi.useFakeTimers();
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        rows: Array.from({ length: 8 }, (_, index) => row(String(index))),
        total: 8,
        nextOffset: 8,
      }),
    });
    vi.stubGlobal("fetch", fetchMock);
    render(<VenueQuickSearch locale={locale} variant="hero" />);
    const input = screen.getByRole("searchbox");
    expect(input).not.toHaveAttribute("popovertarget");
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: "Casa" } });
    await act(() => vi.advanceTimersByTimeAsync(300));
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(screen.getAllByRole("link")).toHaveLength(5);
    expect(screen.getAllByRole("link")[0]).toHaveAttribute(
      "href",
      `/${locale}/venues/casa-0`,
    );
    expect(screen.queryByText("Casa 5")).not.toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    fireEvent.scroll(
      screen.getByRole("region", {
        name: locale === "es" ? "Resultados de locales" : "Venue results",
      }),
    );
    await act(() => vi.advanceTimersByTimeAsync(300));
    expect(fetchMock).toHaveBeenCalledOnce();
    fireEvent.keyDown(input, { key: "Escape" });
    expect(
      screen.queryByRole("region", {
        name: locale === "es" ? "Resultados de locales" : "Venue results",
      }),
    ).not.toBeInTheDocument();
    expect(input).toHaveValue("Casa");
    fireEvent.focus(input);
    expect(screen.getAllByRole("link")).toHaveLength(5);
    fireEvent.change(input, { target: { value: "" } });
    expect(
      screen.queryByRole("region", {
        name: locale === "es" ? "Resultados de locales" : "Venue results",
      }),
    ).not.toBeInTheDocument();
  },
);

it("keeps Home and advanced-search labels/results distinct when both are mounted", () => {
  render(
    <>
      <VenueQuickSearch locale="en" variant="hero" />
      <VenueQuickSearch locale="en" />
    </>,
  );
  const [home, advanced] = screen.getAllByRole("searchbox");
  expect(home.getAttribute("aria-controls")).not.toBe(
    advanced.getAttribute("aria-controls"),
  );
});

it("Home reports unavailable search and retries without fictional or stale matches", async () => {
  vi.useFakeTimers();
  const fetchMock = vi
    .fn()
    .mockResolvedValueOnce({ ok: false })
    .mockResolvedValueOnce({
      ok: true,
      json: async () => ({ rows: [], total: 0, nextOffset: null }),
    });
  vi.stubGlobal("fetch", fetchMock);
  render(<VenueQuickSearch locale="en" variant="hero" />);
  fireEvent.change(screen.getByRole("searchbox"), {
    target: { value: "Casa" },
  });
  await act(() => vi.advanceTimersByTimeAsync(300));
  expect(screen.getByText("Could not load results.")).toBeInTheDocument();
  expect(screen.queryByRole("link")).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Retry" }));
  await act(() => vi.advanceTimersByTimeAsync(300));
  expect(screen.getByText("No venues found.")).toBeInTheDocument();
  expect(fetchMock).toHaveBeenCalledTimes(2);
});
