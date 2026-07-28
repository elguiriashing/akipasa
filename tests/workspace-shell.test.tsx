// @vitest-environment jsdom

import React from "react";
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  usePathname: () => "/en/admin/users",
}));

import { WorkspaceShell } from "../src/components/WorkspaceShell";

afterEach(cleanup);

describe("progressive disclosure workspace shell", () => {
  it("uses route navigation and exposes an accessible mobile drawer trigger", () => {
    render(
      <WorkspaceShell
        title="Administration"
        eyebrow="Platform control"
        description="Focused workflows"
        homeHref="/en/admin"
        items={[
          { href: "/en/admin", label: "Overview", icon: "home" },
          { href: "/en/admin/users", label: "Users and roles", icon: "users" },
        ]}
      >
        <p>Selected workflow</p>
      </WorkspaceShell>,
    );

    expect(
      screen.getByRole("link", { name: "Users and roles" }),
    ).toHaveAttribute("href", "/en/admin/users");
    expect(
      screen.getByRole("link", { name: "Users and roles" }),
    ).toHaveAttribute("aria-current", "page");
    expect(
      screen.getByRole("button", {
        name: /Platform control Administration menu/i,
      }),
    ).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByText("?view=")).not.toBeInTheDocument();
  });

  it("opens and closes the mobile navigation drawer", () => {
    render(
      <WorkspaceShell
        title="Account"
        eyebrow="AkiPasa account"
        description="Focused account"
        homeHref="/en/account"
        items={[{ href: "/en/account", label: "Overview", icon: "home" }]}
      >
        <p>Content</p>
      </WorkspaceShell>,
    );
    fireEvent.click(
      screen.getByRole("button", {
        name: /AkiPasa account Account menu/i,
      }),
    );
    expect(
      screen.getByRole("dialog", { name: "Account navigation" }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(
      screen.queryByRole("dialog", { name: "Account navigation" }),
    ).not.toBeInTheDocument();
  });
});
