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
      screen.queryByRole("link", { name: /Open AkiHQ/ }),
    ).not.toBeInTheDocument();
  });

  it("offers the operations workspace only to staff", () => {
    render(<AccountWorkspacePortals locale="en" role="moderator" />);
    expect(screen.getByRole("link", { name: /Open AkiHQ/ })).toHaveAttribute(
      "href",
      "https://crm.akipasa.com",
    );
  });

  it("offers the operations workspace to administrators", () => {
    render(<AccountWorkspacePortals locale="en" role="administrator" />);
    expect(
      screen.getByRole("heading", { name: "AkiHQ operations" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /Open AkiHQ/ }),
    ).toBeInTheDocument();
  });
});

describe("account advertising consent", () => {
  it("uses one explicit choice for personalisation and advertising", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetchMock);
    render(<PersonalisationSettings locale="en" initialEnabled={false} />);
    fireEvent.click(
      screen.getByRole("checkbox", {
        name: /personalise AkiPasa and advertising/i,
      }),
    );
    await waitFor(() => expect(fetchMock).toHaveBeenCalledOnce());
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({
      analytics: true,
      personalisation: true,
      marketing: true,
    });
    expect(
      screen.getByText(/one choice controls recommendations/i),
    ).toBeInTheDocument();
  });
});
