import React from "react";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import "@testing-library/jest-dom/vitest";
import { motionPreferenceEvent } from "../src/lib/passport-motion";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock("next/image", () => ({ default: () => <span /> }));
vi.mock("next/link", () => ({
  default: ({ children }: { children: React.ReactNode }) => (
    <span>{children}</span>
  ),
}));
import { PassportBook } from "../src/components/PassportBook";

let frames: Map<number, FrameRequestCallback>;
let id: number;
let time: number;
let hidden: boolean;
let reduced: boolean;
let mediaChange: () => void;
function tick() {
  act(() => {
    time += 16;
    const queued = [...frames.values()];
    frames.clear();
    queued.forEach((callback) => callback(time));
  });
}
function settle() {
  for (let i = 0; i < 100 && frames.size; i++) tick();
  expect(frames.size).toBe(0);
}
function book(locale: "en" | "es" = "en") {
  return render(
    <PassportBook
      locale={locale}
      initialView="cover"
      signedIn={false}
      totalXp={0}
      totalStamps={0}
      notices={null}
      progress={null}
      routes={null}
      stamps={null}
      badges={null}
    />,
  );
}
function sensor(beta: number, gamma: number) {
  const event = new Event("deviceorientation");
  Object.assign(event, { beta, gamma });
  act(() => window.dispatchEvent(event));
}
beforeEach(() => {
  frames = new Map();
  id = 0;
  time = 0;
  hidden = false;
  reduced = false;
  localStorage.clear();
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
    frames.set(++id, callback);
    return id;
  });
  vi.stubGlobal("cancelAnimationFrame", (frame: number) =>
    frames.delete(frame),
  );
  vi.spyOn(document, "hidden", "get").mockImplementation(() => hidden);
  vi.stubGlobal("matchMedia", () => ({
    get matches() {
      return reduced;
    },
    addEventListener: (_: string, callback: () => void) => {
      mediaChange = callback;
    },
    removeEventListener: vi.fn(),
  }));
  vi.stubGlobal("isSecureContext", true);
  vi.stubGlobal("DeviceOrientationEvent", class extends Event {});
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

it.each(["en", "es"] as const)(
  "%s sensor updates wake settled foil; hiding cancels and visibility resumes",
  (locale) => {
    const view = book(locale);
    settle();
    sensor(0, 0);
    settle();
    sensor(20, 15);
    expect(frames.size).toBe(1);
    hidden = true;
    act(() => document.dispatchEvent(new Event("visibilitychange")));
    expect(frames.size).toBe(0);
    sensor(30, 20);
    expect(frames.size).toBe(0);
    hidden = false;
    act(() => document.dispatchEvent(new Event("visibilitychange")));
    expect(frames.size).toBe(1);
    settle();
    const surface = view.container.querySelector(
      '[data-shine="true"]',
    ) as HTMLElement;
    expect(surface.style.getPropertyValue("--mx")).not.toBe("50%");
    fireEvent.click(
      screen.getByRole("button", {
        name: locale === "es" ? "Centrar inclinación" : "Recenter tilt",
      }),
    );
    settle();
    expect(surface.style.getPropertyValue("--mx")).toBe("50%");
    sensor(50, 30);
    expect(frames.size).toBe(1);
    view.unmount();
    expect(frames.size).toBe(0);
    sensor(60, 40);
    expect(frames.size).toBe(0);
  },
);

it("reduced motion cancels frames and ignores sensors, then foil wakes after reduction ends", () => {
  book();
  sensor(0, 0);
  sensor(15, 15);
  expect(frames.size).toBe(1);
  act(() => {
    reduced = true;
    mediaChange();
  });
  expect(frames.size).toBe(0);
  sensor(20, 20);
  expect(frames.size).toBe(0);
  act(() => {
    reduced = false;
    mediaChange();
  });
  expect(frames.size).toBe(1);
  settle();
});

it("revoking motion preference recenters once and removes sensor input", () => {
  const view = book();
  sensor(0, 0);
  sensor(20, 20);
  settle();
  act(() =>
    window.dispatchEvent(
      new CustomEvent(motionPreferenceEvent, { detail: false }),
    ),
  );
  settle();
  expect(
    (
      view.container.querySelector('[data-shine="true"]') as HTMLElement
    ).style.getPropertyValue("--mx"),
  ).toBe("50%");
  sensor(40, 40);
  expect(frames.size).toBe(0);
});

it("pointer fallback wakes idle foil, leaving recenters and foil off cancels work", () => {
  localStorage.setItem("akipasa:passport-motion", "off");
  vi.stubGlobal("PointerEvent", MouseEvent);
  const view = book();
  settle();
  const surface = view.container.querySelector(
    '[data-shine="true"]',
  ) as HTMLElement;
  vi.spyOn(surface, "getBoundingClientRect").mockReturnValue({
    x: 0,
    y: 0,
    left: 0,
    top: 0,
    right: 100,
    bottom: 100,
    width: 100,
    height: 100,
    toJSON: () => ({}),
  });
  fireEvent.pointerMove(surface, { clientX: 90, clientY: 20 });
  expect(frames.size).toBe(1);
  settle();
  expect(surface.style.getPropertyValue("--mx")).toBe("87.6%");
  fireEvent.pointerLeave(surface);
  settle();
  expect(surface.style.getPropertyValue("--mx")).toBe("50%");
  fireEvent.pointerMove(surface, { clientX: 90, clientY: 20 });
  fireEvent.click(screen.getByRole("button", { name: "Holographic foil" }));
  expect(frames.size).toBe(0);
  fireEvent.pointerMove(surface, { clientX: 10, clientY: 20 });
  expect(frames.size).toBe(0);
  fireEvent.click(screen.getByRole("button", { name: "Holographic foil" }));
  expect(frames.size).toBe(1);
  settle();
});

it("changing chapters initializes the new surface and leaves no old animation loop", () => {
  const view = book();
  sensor(0, 0);
  sensor(20, 20);
  settle();
  fireEvent.click(screen.getByRole("button", { name: "Open passport" }));
  settle();
  fireEvent.click(screen.getByRole("button", { name: "01 Passport" }));
  expect(frames.size).toBe(1);
  settle();
  expect(
    (
      view.container.querySelector('[data-shine="true"]') as HTMLElement
    ).style.getPropertyValue("--mx"),
  ).toBe("50%");
  sensor(30, 30);
  expect(frames.size).toBe(1);
  settle();
});
