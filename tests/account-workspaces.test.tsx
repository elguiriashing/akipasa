// @vitest-environment jsdom

import React from "react";
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { AccountWorkspacePortals } from "../src/components/AccountWorkspacePortals";

afterEach(cleanup);

describe("account privileged workspace launchpads", () => {
  it("does not expose staff or administrator links to consumers", () => {
    render(<AccountWorkspacePortals locale="en" role="consumer" />);
    expect(
      screen.queryByRole("heading", { name: "Staff operations" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "Administration" }),
    ).not.toBeInTheDocument();
  });

  it("links staff directly to every operational submenu", () => {
    render(<AccountWorkspacePortals locale="en" role="moderator" />);
    expect(
      screen.getByRole("link", { name: /Customer support/ }),
    ).toHaveAttribute("href", "/en/staff/support");
    expect(screen.getByRole("link", { name: /Moderation/ })).toHaveAttribute(
      "href",
      "/en/staff/moderation",
    );
    expect(
      screen.getByRole("link", { name: /Venues and events/ }),
    ).toHaveAttribute("href", "/en/staff/catalogue");
    expect(
      screen.queryByRole("heading", { name: "Administration" }),
    ).not.toBeInTheDocument();
  });

  it("gives administrators direct staff and governance links", () => {
    render(<AccountWorkspacePortals locale="en" role="administrator" />);
    expect(screen.getByRole("link", { name: /Moderation/ })).toHaveAttribute(
      "href",
      "/en/staff/moderation",
    );
    expect(
      screen.getByRole("link", { name: /Users and roles/ }),
    ).toHaveAttribute("href", "/en/admin/users");
    expect(
      screen.getByRole("link", { name: /Platform settings/ }),
    ).toHaveAttribute("href", "/en/admin/settings");
  });
});
