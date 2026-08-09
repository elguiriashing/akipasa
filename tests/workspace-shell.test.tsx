// @vitest-environment jsdom

import React from "react";
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  usePathname: () => "/en/admin/users",
  useSearchParams: () => new URLSearchParams(),
}));

import { AppShell } from "../src/components/AppShell";
import { WorkspaceShell } from "../src/components/WorkspaceShell";

afterEach(cleanup);

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

it("uses the compact application rail on console routes", () => {
  render(
    <AppShell locale="en" signedIn={true}>
      <main>Console content</main>
    </AppShell>,
  );

  const rail = screen.getByRole("complementary", {
    name: "Primary navigation",
  });
  expect(rail).toHaveClass("app-rail--compact");
  expect(screen.getByRole("link", { name: "CRM" })).toBeInTheDocument();
  expect(
    screen.getByRole("button", { name: /Switch to premium theme/i }),
  ).toHaveClass("theme-toggle--compact");
});
