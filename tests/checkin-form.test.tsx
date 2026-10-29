// @vitest-environment jsdom
import React from "react";
import "@testing-library/jest-dom/vitest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";

vi.mock("../src/app/[locale]/check-in/[token]/actions", () => ({
  completeCheckIn: vi.fn(async () => undefined),
}));

import { CheckInForm } from "../src/app/[locale]/check-in/[token]/CheckInForm";

const getCurrentPosition = vi.fn();
const originalGeolocation = Object.getOwnPropertyDescriptor(
  navigator,
  "geolocation",
);
const props = {
  locale: "en" as const,
  token: "00000000-0000-4000-8000-000000000001",
  idempotencyKey: "00000000-0000-4000-8000-000000000002",
};

beforeEach(() => {
  getCurrentPosition.mockReset();
  Object.defineProperty(navigator, "geolocation", {
    configurable: true,
    value: { getCurrentPosition },
  });
});

afterEach(() => {
  cleanup();
  if (originalGeolocation) {
    Object.defineProperty(navigator, "geolocation", originalGeolocation);
  }
});

describe("venue check-in proof UI", () => {
  it("never calls a location fix a verified visit", () => {
    render(<CheckInForm {...props} />);
    const submit = screen.getByRole("button", { name: "Confirm check-in" });
    expect(submit).toBeDisabled();

    fireEvent.click(
      screen.getByRole("button", { name: "Get current location" }),
    );
    expect(submit).toBeDisabled();

    const success = getCurrentPosition.mock.calls[0][0] as PositionCallback;
    act(() => {
      success({
        coords: { latitude: 36.54, longitude: -4.63, accuracy: 18.7 },
      } as GeolocationPosition);
    });

    expect(submit).toBeEnabled();
    expect(screen.getByText(/Location received/)).toBeVisible();
    expect(screen.queryByText(/Location verified/i)).not.toBeInTheDocument();
  });

  it("discards a previous fix on retry and keeps submission disabled after denial", () => {
    render(<CheckInForm {...props} />);
    const locate = screen.getByRole("button", {
      name: "Get current location",
    });
    const submit = screen.getByRole("button", { name: "Confirm check-in" });
    fireEvent.click(locate);
    const firstSuccess = getCurrentPosition.mock
      .calls[0][0] as PositionCallback;
    act(() => {
      firstSuccess({
        coords: { latitude: 36.54, longitude: -4.63, accuracy: 10 },
      } as GeolocationPosition);
    });
    expect(submit).toBeEnabled();

    fireEvent.click(locate);
    expect(submit).toBeDisabled();
    const latestFailure = getCurrentPosition.mock
      .calls[1][1] as PositionErrorCallback;
    act(() => {
      latestFailure({ code: 1 } as GeolocationPositionError);
    });
    expect(submit).toBeDisabled();

    // The old callback cannot restore coordinates after a newer request.
    firstSuccess({
      coords: { latitude: 36.54, longitude: -4.63, accuracy: 10 },
    } as GeolocationPosition);
    expect(submit).toBeDisabled();
  });

  it("provides a localized error when the browser has no geolocation API", () => {
    Object.defineProperty(navigator, "geolocation", {
      configurable: true,
      value: undefined,
    });
    render(<CheckInForm {...props} locale="es" />);
    fireEvent.click(screen.getByRole("button", { name: "Obtener ubicación" }));
    expect(screen.getByText(/Este dispositivo no permite/)).toBeVisible();
    expect(
      screen.getByRole("button", { name: "Confirmar check-in" }),
    ).toBeDisabled();
  });
});
