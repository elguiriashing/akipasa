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
import { afterEach, describe, expect, it, vi } from "vitest";
import { AccountWorkspacePortals } from "../src/components/AccountWorkspacePortals";
import { PersonalisationSettings } from "../src/components/PersonalisationSettings";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  for (const cookie of document.cookie.split("; "))
    document.cookie = `${cookie.split("=")[0]}=; Max-Age=0; Path=/`;
});

describe("account progressive navigation", () => {
  it("keeps infrequent personal tasks available without exposing internal operations", () => {
    render(<AccountWorkspacePortals locale="en" role="consumer" />);
    expect(
      screen.getByRole("link", { name: /Followed venues/ }),
    ).toHaveAttribute("href", "/en/account/following");
    expect(
      screen.getByRole("link", { name: /Recent activity/ }),
    ).toHaveAttribute("href", "/en/account/activity");
    expect(
      screen.getByRole("link", { name: /Privacy and data/ }),
    ).toHaveAttribute("href", "/en/account/privacy");
    expect(
      screen.queryByRole("link", { name: /Open AkiBusiness/ }),
    ).not.toBeInTheDocument();
  });

  it("offers the operations workspace only to staff", () => {
    render(<AccountWorkspacePortals locale="en" role="moderator" />);
    expect(
      screen.getByRole("link", { name: /Open AkiBusiness/ }),
    ).toHaveAttribute("href", "https://akibusiness.com/?locale=en");
  });

  it("offers the operations workspace to administrators", () => {
    render(<AccountWorkspacePortals locale="en" role="administrator" />);
    expect(
      screen.getByRole("heading", { name: "AkiBusiness operations" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /Open AkiBusiness/ }),
    ).toBeInTheDocument();
  });
});

describe("account advertising consent", () => {
  it("changes recommendations without enabling measurement or advertising", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetchMock);
    render(<PersonalisationSettings locale="en" initialEnabled={false} />);
    fireEvent.click(
      screen.getByRole("checkbox", {
        name: /personalise recommendations/i,
      }),
    );
    await waitFor(() => expect(fetchMock).toHaveBeenCalledOnce());
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({
      analytics: false,
      personalisation: true,
      marketing: false,
    });
    expect(
      screen.getByText(/measurement and advertising have separate choices/i),
    ).toBeInTheDocument();
  });

  it("keeps a failed withdrawal visibly off and retries only the account sync", async () => {
    document.cookie = "ak_analytics=granted; Path=/";
    document.cookie = "ak_personalisation=granted; Path=/";
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: false })
      .mockResolvedValueOnce({ ok: true });
    vi.stubGlobal("fetch", fetchMock);
    render(<PersonalisationSettings locale="en" initialEnabled />);

    const checkbox = screen.getByRole("checkbox", {
      name: /personalise recommendations/i,
    });
    fireEvent.click(checkbox);
    await waitFor(() => expect(fetchMock).toHaveBeenCalledOnce());
    expect(checkbox).not.toBeChecked();
    expect(document.cookie).toContain("ak_personalisation=denied");
    expect(document.cookie).toContain("ak_analytics=granted");
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Personalisation is off on this device",
    );

    fireEvent.click(screen.getByRole("button", { name: "Retry account sync" }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    expect(JSON.parse(fetchMock.mock.calls[1][1].body)).toEqual({
      analytics: true,
      personalisation: false,
      marketing: false,
    });
    expect(checkbox).not.toBeChecked();
    expect(await screen.findByRole("status")).toHaveTextContent(
      "Preferences updated",
    );
  });
});
