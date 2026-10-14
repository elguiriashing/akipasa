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
import { afterEach, describe, expect, it, vi } from "vitest";
import { UserSearch } from "../src/app/[locale]/admin/users/UserSearch";

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("administrator user search", () => {
  const user = (profileId: string, displayName: string) => ({
    profile_id: profileId,
    display_name: displayName,
    app_role: "consumer" as const,
    primary_email: `${displayName.toLowerCase()}@example.com`,
    google_email: null,
    account_status: "active" as const,
    email_confirmed: true,
    last_sign_in_at: null,
    created_at: "2026-01-01T00:00:00.000Z",
    venue_memberships: 0,
  });

  it("does not load a default user and debounces server-side search", async () => {
    vi.useFakeTimers();
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ users: [] }),
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<UserSearch locale="en" />);
    expect(screen.queryByRole("link")).not.toBeInTheDocument();

    fireEvent.change(
      screen.getByRole("searchbox", { name: "Search accounts" }),
      {
        target: { value: "alex@example.com" },
      },
    );
    expect(fetchMock).not.toHaveBeenCalled();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(350);
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      "/api/admin/users?q=alex%40example.com",
    );
  });

  it("clears stale results as soon as a new query starts", async () => {
    vi.useFakeTimers();
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ users: [user("first-id", "Alex")] }),
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<UserSearch locale="en" />);
    const search = screen.getByRole("searchbox", { name: "Search accounts" });
    fireEvent.change(search, { target: { value: "alex" } });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(350);
    });
    expect(screen.getByText("Alex")).toBeInTheDocument();

    fireEvent.change(search, { target: { value: "bea" } });
    expect(screen.queryByText("Alex")).not.toBeInTheDocument();
    expect(screen.getByText("Searching…")).toBeInTheDocument();
  });

  it("ignores a superseded response even when fetch does not honor abort", async () => {
    vi.useFakeTimers();
    let resolveFirst: ((value: unknown) => void) | undefined;
    let resolveSecond: ((value: unknown) => void) | undefined;
    const fetchMock = vi
      .fn()
      .mockReturnValueOnce(
        new Promise((resolve) => {
          resolveFirst = resolve;
        }),
      )
      .mockReturnValueOnce(
        new Promise((resolve) => {
          resolveSecond = resolve;
        }),
      );
    vi.stubGlobal("fetch", fetchMock);

    render(<UserSearch locale="en" />);
    const search = screen.getByRole("searchbox", { name: "Search accounts" });
    fireEvent.change(search, { target: { value: "alex" } });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(350);
    });
    fireEvent.change(search, { target: { value: "bea" } });
    await vi.advanceTimersByTimeAsync(350);

    await act(async () => {
      resolveFirst?.({
        ok: true,
        json: async () => ({ users: [user("first-id", "Alex")] }),
      });
      await Promise.resolve();
    });
    expect(screen.queryByText("Alex")).not.toBeInTheDocument();

    await act(async () => {
      resolveSecond?.({
        ok: true,
        json: async () => ({ users: [user("second-id", "Bea")] }),
      });
      await Promise.resolve();
    });
    expect(screen.getByText("Bea")).toBeInTheDocument();
  });

  it("offers an explicit retry after a failed search", async () => {
    vi.useFakeTimers();
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValueOnce({ ok: true, json: async () => ({ users: [] }) });
    vi.stubGlobal("fetch", fetchMock);

    render(<UserSearch locale="es" />);
    fireEvent.change(
      screen.getByRole("searchbox", { name: "Buscar cuentas" }),
      { target: { value: "alex" } },
    );
    await act(async () => {
      await vi.advanceTimersByTimeAsync(350);
    });
    const retryButton = screen.getByRole("button", {
      name: "Reintentar",
    });
    fireEvent.click(retryButton);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(350);
    });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(screen.getByText("No hay coincidencias.")).toBeInTheDocument();
  });
});
