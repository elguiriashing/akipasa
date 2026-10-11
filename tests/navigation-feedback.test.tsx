// @vitest-environment jsdom
import React from "react";
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({ pending: false, pathname: "/en/map" }));
vi.mock("next/link", () => ({
  default: ({ children, ...props }: React.ComponentProps<"a">) => (
    <a {...props}>{children}</a>
  ),
  useLinkStatus: () => ({ pending: state.pending }),
}));
vi.mock("next/navigation", () => ({ usePathname: () => state.pathname }));
import { NavigationLink } from "../src/components/NavigationLink";
import { RouteLoading } from "../src/components/RouteLoading";

afterEach(() => {
  cleanup();
  state.pending = false;
  state.pathname = "/en/map";
});

describe("navigation feedback", () => {
  it("suppresses repeat activation while pending, retaining modified clicks and cancellation recovery", () => {
    const click = vi.fn();
    const element = () => (
      <NavigationLink href="#map" onClick={click}>
        Map
      </NavigationLink>
    );
    const view = render(element());
    const link = screen.getByRole("link", { name: "Map" });
    expect(fireEvent.click(link)).toBe(true);
    expect(click).toHaveBeenCalledTimes(1);
    state.pending = true;
    view.rerender(element());
    expect(link.querySelector('[data-nav-pending="true"]')).not.toBeNull();
    expect(fireEvent.click(link)).toBe(false);
    expect(click).toHaveBeenCalledTimes(1);
    expect(fireEvent.click(link, { ctrlKey: true })).toBe(true);
    expect(click).toHaveBeenCalledTimes(2);
    state.pending = false;
    view.rerender(element());
    expect(fireEvent.click(link)).toBe(true);
    expect(click).toHaveBeenCalledTimes(3);
  });

  it.each([
    ["/es/staff", "Cargando…"],
    ["/en/passports", "Loading…"],
  ])("announces loading for %s", (path, label) => {
    state.pathname = path;
    render(<RouteLoading />);
    expect(screen.getByRole("status")).toHaveAttribute("aria-busy", "true");
    expect(screen.getByText(label)).toBeInTheDocument();
  });
});
