// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import { cleanup, render, waitFor } from "@testing-library/react";
import { safeAuthDestination } from "../src/lib/auth-security";
import { publicPagePaths, shouldNoindex } from "../src/lib/seo";
import { MapCompanion } from "../src/components/pals/MapCompanion";

beforeEach(() => {
  const NativeURL = URL;
  vi.stubGlobal(
    "URL",
    class extends NativeURL {
      static createObjectURL = vi.fn(() => "blob:private-test-portrait");
      static revokeObjectURL = vi.fn();
    },
  );
});
afterEach(() => {
  cleanup();
  document.body.innerHTML = "";
  vi.unstubAllGlobals();
});

describe("Private preview integration", () => {
  it("accepts only the exact non-localised preview sign-in destination", () => {
    expect(safeAuthDestination("en", "/pals")).toBe("/pals");
    expect(safeAuthDestination("es", "/pals")).toBe("/pals");
    expect(safeAuthDestination("en", "//example.com/pals")).toBe("/en/account");
    expect(safeAuthDestination("en", "/pals-elsewhere")).toBe("/en/account");
    expect(safeAuthDestination("en", "https://example.com/pals")).toBe(
      "/en/account",
    );
    expect(safeAuthDestination("en", "/en/account")).toBe("/en/account");
  });
  it("marks the preview tree noindex without advertising it in public pages", () => {
    for (const path of ["/pals", "/pals/api", "/pals/marker"])
      expect(shouldNoindex(path)).toBe(true);
    expect(shouldNoindex("/pals-elsewhere")).toBe(false);
    expect([...publicPagePaths]).not.toContain("/pals");
  });
  it("decorates only the existing location dot, preserving its accuracy circle and position", async () => {
    const dot = document.createElement("div");
    dot.className = "maplibregl-user-location-dot";
    dot.style.transform = "translate(123px, 456px)";
    const accuracy = document.createElement("div");
    accuracy.className = "maplibregl-user-location-accuracy-circle";
    accuracy.style.width = "90px";
    document.body.append(dot, accuracy);
    const { unmount } = render(
      createElement(MapCompanion, {
        portrait:
          '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 260 275"></svg>',
      }),
    );
    await waitFor(() => expect(dot.querySelector("button")).not.toBeNull());
    expect(dot.querySelector("button")?.getAttribute("aria-label")).toContain(
      "Your AkiPal location",
    );
    expect(dot.querySelectorAll("button")).toHaveLength(1);
    expect(dot.style.transform).toBe("translate(123px, 456px)");
    expect(accuracy.style.width).toBe("90px");
    expect(accuracy.children).toHaveLength(0);
    unmount();
    expect(dot.querySelector("button")).toBeNull();
    expect(dot.hasAttribute("data-akipals-location")).toBe(false);
    expect(URL.revokeObjectURL).toHaveBeenCalledWith(
      "blob:private-test-portrait",
    );
  });
  it("handles a location dot created after the map mounts without duplicating the companion", async () => {
    const { unmount } = render(
      createElement(MapCompanion, { portrait: "<svg></svg>" }),
    );
    const dot = document.createElement("div");
    dot.className =
      "maplibregl-user-location-dot maplibregl-user-location-dot-stale";
    document.body.appendChild(dot);
    await waitFor(() => expect(dot.querySelectorAll("button")).toHaveLength(1));
    dot.appendChild(document.createElement("span"));
    await waitFor(() => expect(dot.querySelectorAll("button")).toHaveLength(1));
    unmount();
    expect(dot.classList.contains("maplibregl-user-location-dot-stale")).toBe(
      true,
    );
    expect(dot.querySelector("span")).not.toBeNull();
  });
});
