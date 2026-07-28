// @vitest-environment jsdom

import React from "react";
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { UserSearch } from "../src/app/[locale]/admin/users/UserSearch";

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("administrator user search", () => {
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

    await vi.advanceTimersByTimeAsync(350);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      "/api/admin/users?q=alex%40example.com",
    );
  });
});
