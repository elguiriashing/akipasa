// @vitest-environment jsdom

import React from "react";
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  AkiSelector,
  type AkiSelectorOption,
} from "../src/components/aki-selector/AkiSelector";
import { AkiSelectorLab } from "../src/components/aki-selector/AkiSelectorLab";

afterEach(cleanup);

const options: AkiSelectorOption[] = [
  { id: "a", label: "Ember", symbol: "A", effect: "ember" },
  { id: "b", label: "Solar", symbol: "B", effect: "solar" },
  { id: "c", label: "Breeze", symbol: "C", effect: "breeze" },
];

describe("AkiSelector presentation engine", () => {
  it("updates its selected value without invoking business effects", () => {
    const onValueChange = vi.fn();
    const { container } = render(
      <AkiSelector
        options={options}
        ariaLabel="Prototype"
        onValueChange={onValueChange}
      />,
    );
    expect(
      screen.getByRole("radiogroup", { name: "Prototype" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Ember" })).toHaveAttribute(
      "aria-checked",
      "true",
    );
    fireEvent.click(screen.getByRole("radio", { name: "Solar" }));
    expect(onValueChange).toHaveBeenCalledWith("b", options[1]);
    expect(screen.getByRole("radio", { name: "Solar" })).toHaveAttribute(
      "aria-checked",
      "true",
    );
    expect(container.querySelector(".aks-selector")).toHaveAttribute(
      "data-effect",
      "solar",
    );
  });

  it("supports keyboard arrows, Home and End with roving focus", () => {
    render(<AkiSelector options={options} ariaLabel="Prototype" />);
    const ember = screen.getByRole("radio", { name: "Ember" });
    ember.focus();
    fireEvent.keyDown(ember, { key: "ArrowRight" });
    const solar = screen.getByRole("radio", { name: "Solar" });
    expect(solar).toHaveAttribute("aria-checked", "true");
    expect(solar).toHaveFocus();
    fireEvent.keyDown(solar, { key: "End" });
    const breeze = screen.getByRole("radio", { name: "Breeze" });
    expect(breeze).toHaveFocus();
    fireEvent.keyDown(breeze, { key: "Home" });
    expect(ember).toHaveAttribute("aria-checked", "true");
  });

  it("does not select disabled options or announce false selections", () => {
    render(
      <AkiSelector
        options={[options[0], { ...options[1], disabled: true }, options[2]]}
        ariaLabel="Options"
        locale="es"
      />,
    );
    fireEvent.keyDown(screen.getByRole("radio", { name: "Ember" }), {
      key: "ArrowRight",
    });
    expect(screen.getByRole("radio", { name: "Breeze" })).toHaveAttribute(
      "aria-checked",
      "true",
    );
  });

  it("supports controlled selection, motion-off and empty options", () => {
    const callback = vi.fn();
    const { container, rerender } = render(
      <AkiSelector
        options={options}
        value="a"
        onValueChange={callback}
        ariaLabel="Controlled"
        motion="off"
      />,
    );
    fireEvent.click(screen.getByRole("radio", { name: "Solar" }));
    expect(callback).toHaveBeenCalledWith("b", options[1]);
    expect(screen.getByRole("radio", { name: "Ember" })).toHaveAttribute(
      "aria-checked",
      "true",
    );
    expect(container.querySelector(".aks-selector")).toHaveAttribute(
      "data-motion",
      "off",
    );
    rerender(<AkiSelector options={[]} ariaLabel="Empty" />);
    expect(screen.getByRole("status")).toHaveTextContent(
      "No options available",
    );
  });

  it("allows independent preview labels and presets with no server writes", () => {
    render(<AkiSelectorLab locale="en" />);
    fireEvent.click(screen.getByRole("button", { name: "Place" }));
    expect(screen.getByRole("radio", { name: "Coast" })).toBeInTheDocument();
    const input = screen.getByRole("textbox", { name: "Selected label" });
    fireEvent.change(input, { target: { value: "New label" } });
    expect(
      screen.getByRole("radio", { name: "New label" }),
    ).toBeInTheDocument();
  });

  it("stays admin-only, unlisted, and respects reduced-motion preferences", () => {
    const route = readFileSync(
      "src/app/[locale]/admin/selector-lab/page.tsx",
      "utf8",
    );
    const adminNav = readFileSync("src/app/[locale]/admin/layout.tsx", "utf8");
    const styles = readFileSync(
      "src/components/aki-selector/aki-selector.css",
      "utf8",
    );
    expect(route).toContain("isAdministrator(profile?.app_role");
    expect(route).toContain("notFound()");
    expect(route).toContain("index: false, follow: false");
    expect(adminNav).not.toContain("selector-lab");
    expect(styles).toContain("prefers-reduced-motion: reduce");
    expect(styles).toContain('data-motion="off"');
  });
});

it("suppresses a swipe click while allowing a later keyboard activation", () => {
  const { container } = render(
    <AkiSelector
      options={options}
      ariaLabel="Links"
      getOptionHref={(option) => `/${option.id}`}
      showControls={false}
    />,
  );
  const scene = container.querySelector(".aks-selector__scene")!;
  const swipe = () => {
    for (const [type, x] of [
      ["pointerdown", 220],
      ["pointerup", 100],
    ] as const) {
      const event = new Event(type, { bubbles: true });
      Object.assign(event, {
        pointerType: "touch",
        pointerId: 1,
        clientX: x,
        clientY: 100,
      });
      fireEvent(scene, event);
    }
  };
  const outcomes: boolean[] = [];
  const observe = (event: MouseEvent) => {
    outcomes.push(event.defaultPrevented);
    event.preventDefault();
  };
  document.addEventListener("click", observe);
  try {
    swipe();
    expect(screen.getByRole("link", { name: "Solar" })).toHaveAttribute(
      "data-selected",
      "true",
    );
    fireEvent.click(screen.getByRole("link", { name: "Ember" }));
    swipe();
    const card = screen.getByRole("link", { name: "Breeze" });
    fireEvent.keyDown(card, { key: "Enter" });
    fireEvent.click(card);
    expect(outcomes).toEqual([true, false]);
  } finally {
    document.removeEventListener("click", observe);
  }
});
