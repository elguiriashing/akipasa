// @vitest-environment jsdom

import React from "react";
import "@testing-library/jest-dom/vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  usePathname: () => "/en/admin/users",
  useSearchParams: () => new URLSearchParams(),
}));

import { AppShell } from "../src/components/AppShell";
import { WorkspaceShell } from "../src/components/WorkspaceShell";

afterEach(() => {
  cleanup();
  window.localStorage.clear();
  delete document.documentElement.dataset.theme;
  delete document.body.dataset.theme;
  document.documentElement.className = "";
  document.body.className = "";
});

describe("progressive disclosure workspace shell", () => {
  it("uses route navigation and exposes an accessible mobile menu trigger", () => {
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
    const shell = screen.getByRole("main", { name: "Administration" });
    expect(shell).toHaveClass("consumer-workspace", "workspace-grid-system");
    expect(shell.querySelector(".workspace-grid-body")).toBeInTheDocument();
    expect(shell).not.toHaveClass("is-collapsed");
    fireEvent.click(screen.getByRole("button", { name: "Collapse sidebar" }));
    expect(shell).toHaveClass("is-collapsed");
  });

  it("opens and closes the in-flow mobile navigation", () => {
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
      screen.getByRole("complementary", { name: "Account navigation" }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(
      screen.queryByRole("complementary", { name: "Account navigation" }),
    ).not.toBeInTheDocument();
  });
});

it("uses one persistent rail state and a real light/dark icon control", () => {
  window.localStorage.setItem("akipasa.theme", "dark");

  const first = render(
    <AppShell locale="en" signedIn={true}>
      <main>Console content</main>
    </AppShell>,
  );

  const rail = screen.getByRole("complementary", {
    name: "Primary navigation",
  });
  expect(rail).not.toHaveClass("app-rail--compact");
  expect(screen.getByRole("link", { name: "CRM" })).toBeInTheDocument();

  const themeToggle = screen.getByRole("button", {
    name: "Switch to light mode",
  });
  expect(themeToggle).toHaveClass("theme-toggle--compact");
  expect(themeToggle.querySelector("svg")).toBeInTheDocument();
  expect(screen.queryByText(/premium|standard/i)).not.toBeInTheDocument();

  fireEvent.click(screen.getByRole("button", { name: "Collapse sidebar" }));
  expect(rail).toHaveClass("app-rail--compact");
  expect(window.localStorage.getItem("akipasa.sidebar.collapsed")).toBe("true");
  expect(
    screen.getByRole("button", { name: "Expand sidebar" }),
  ).toBeInTheDocument();

  fireEvent.click(themeToggle);
  expect(document.documentElement.dataset.theme).toBe("light");
  expect(
    screen.getByRole("button", { name: "Switch to dark mode" }),
  ).toBeInTheDocument();

  first.unmount();
  render(
    <AppShell locale="en" signedIn={true}>
      <main>Another console page</main>
    </AppShell>,
  );
  expect(
    screen.getByRole("complementary", { name: "Primary navigation" }),
  ).toHaveClass("app-rail--compact");
});
it("puts every authorized workspace in the main mobile menu", () => {
  render(
    <AppShell locale="en" signedIn={true} role="administrator">
      <main>Account content</main>
    </AppShell>,
  );

  fireEvent.click(screen.getByRole("button", { name: "More options" }));
  const dialog = screen.getByRole("dialog", { name: "More options" });
  const workspaces = within(dialog).getByRole("navigation", {
    name: "Switch workspace",
  });

  expect(
    within(workspaces).getByRole("link", { name: "Account" }),
  ).toHaveAttribute("href", "/en/account");
  expect(
    within(workspaces).getByRole("link", { name: "Business" }),
  ).toHaveAttribute("href", "/en/business");
  expect(
    within(workspaces).getByRole("link", { name: "Staff" }),
  ).toHaveAttribute("href", "/en/staff");
  expect(
    within(workspaces).getByRole("link", { name: "Admin" }),
  ).toHaveAttribute("href", "/en/admin");
});
