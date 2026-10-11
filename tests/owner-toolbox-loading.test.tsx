// @vitest-environment jsdom
import React from "react";
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { defaultOwnerPreferences } from "../src/lib/owner-console";

const panel = vi.hoisted(() => ({ renders: 0, initiallyOpen: false }));
vi.mock("next/dynamic", () => ({
  default: () => (props: { initiallyOpen: boolean }) => {
    panel.renders++;
    panel.initiallyOpen = props.initiallyOpen;
    return <div role="dialog">Toolbox</div>;
  },
}));
import { OwnerToolboxLauncher } from "../src/components/owner/OwnerToolboxLauncher";

afterEach(() => {
  cleanup();
  panel.renders = 0;
  panel.initiallyOpen = false;
});

it.each(["click", "keyboard"])(
  "loads the panel only on %s, applying the saved theme immediately",
  (activation) => {
    render(
      <OwnerToolboxLauncher
        locale="es"
        preferences={defaultOwnerPreferences}
        userId="disposable"
      />,
    );
    expect(panel.renders).toBe(0);
    expect(document.documentElement.dataset.ownerBackground).toBe(
      defaultOwnerPreferences.background,
    );
    if (activation === "click")
      fireEvent.click(screen.getByRole("button", { name: "DEV Toolbox" }));
    else fireEvent.keyDown(window, { key: "o", ctrlKey: true, shiftKey: true });
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(panel.initiallyOpen).toBe(true);
  },
);
