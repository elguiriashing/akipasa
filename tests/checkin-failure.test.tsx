// @vitest-environment jsdom
import React from "react";
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import {
  CheckInFailure,
  type CheckInFailureReason,
} from "../src/components/CheckInFailure";
afterEach(cleanup);
const reasons: CheckInFailureReason[] = [
  "outside_geofence",
  "cooldown",
  "rate_limited",
  "invalid_token",
  "account",
  "weak_location",
  "location_unavailable",
  "network",
  "unknown",
];
it.each(reasons)(
  "provides localized actionable guidance for %s without accepting the visit",
  (reason) => {
    for (const locale of ["en", "es"] as const) {
      const { unmount } = render(
        <CheckInFailure locale={locale} reason={reason} />,
      );
      expect(screen.getByRole("status")).toBeVisible();
      expect(screen.getByRole("heading", { level: 2 })).toBeVisible();
      const links = screen.getAllByRole("link");
      expect(links).toHaveLength(2);
      expect(
        links.every((link) =>
          link.getAttribute("href")?.startsWith(`/${locale}/`),
        ),
      ).toBe(true);
      expect(screen.getByRole("status")).not.toHaveTextContent(
        /You’re checked in|¡Ya estás dentro|Location confirmed|Ubicación confirmada/,
      );
      expect(
        screen.getByText(
          locale === "en"
            ? /Sharing a photo is optional, happens separately and needs review/
            : /Compartir una foto es opcional, se hace por separado y necesita revisión/,
        ),
      ).toBeVisible();
      unmount();
    }
  },
);
it.each(["network", "unknown"] as const)(
  "does not claim that an uncertain %s result definitely awarded nothing",
  (reason) => {
    render(<CheckInFailure locale="en" reason={reason} />);
    expect(
      screen.getByRole("link", { name: "Check my progress" }),
    ).toHaveAttribute("href", "/en/passports?view=progress");
    expect(screen.getByRole("status")).not.toHaveTextContent(
      /adds no XP|not been accepted|no visit was recorded/i,
    );
  },
);
it("keeps cooldown separate from previous earned XP and directs to progress", () => {
  render(<CheckInFailure locale="es" reason="cooldown" />);
  expect(screen.getByRole("status")).toHaveTextContent(
    "este nuevo intento no añade XP ni sellos",
  );
  expect(screen.getByRole("link", { name: "Ver mi progreso" })).toHaveAttribute(
    "href",
    "/es/passports?view=progress",
  );
});
it("uses account recovery only for account restrictions", () => {
  render(<CheckInFailure locale="en" reason="account" />);
  expect(
    screen.getByRole("link", { name: "Review my account" }),
  ).toHaveAttribute("href", "/en/account");
});
it("shows a supplied server-read distance only for an outside-geofence receipt", () => {
  const { rerender } = render(
    <CheckInFailure
      locale="en"
      reason="outside_geofence"
      verifiedDistanceMeters={428.4}
    />,
  );
  expect(
    screen.getByText(/Distance checked for this attempt/),
  ).toHaveTextContent("428 m");
  expect(
    screen.getByRole("link", { name: "Scan official QR" }),
  ).toHaveAttribute("href", "/en/check-in");
  rerender(
    <CheckInFailure
      locale="en"
      reason="invalid_token"
      verifiedDistanceMeters={428.4}
    />,
  );
  expect(screen.queryByText(/Distance checked/)).not.toBeInTheDocument();
});
it.each([undefined, null, -1, NaN, Infinity])(
  "does not invent distance or radius from malformed or absent value %s",
  (verifiedDistanceMeters) => {
    render(
      <CheckInFailure
        locale="es"
        reason="outside_geofence"
        verifiedDistanceMeters={verifiedDistanceMeters}
      />,
    );
    expect(screen.queryByText(/Distancia comprobada/)).not.toBeInTheDocument();
    expect(screen.getByRole("status")).not.toHaveTextContent(
      /radio|radius|\b100 m\b|\b250 m\b/,
    );
  },
);
it.each([
  "https://evil.example/path",
  "//evil.example",
  "/es/venues/local",
  "/en/venues/local?redirect=elsewhere",
  "/en/venues/../account",
  "javascript:alert(1)",
])("rejects unsafe or cross-locale venue recovery %s", (venuePath) => {
  render(
    <CheckInFailure
      locale="en"
      reason="outside_geofence"
      venuePath={venuePath}
    />,
  );
  expect(screen.getByRole("link", { name: "Explore the map" })).toHaveAttribute(
    "href",
    "/en/map",
  );
});
it("links only a safe current-locale venue path", () => {
  render(
    <CheckInFailure
      locale="es"
      reason="outside_geofence"
      venuePath="/es/venues/casa-1899"
    />,
  );
  expect(screen.getByRole("link", { name: "Ver el local" })).toHaveAttribute(
    "href",
    "/es/venues/casa-1899",
  );
});
it("falls back safely for an unrecognized runtime reason", () => {
  render(
    <CheckInFailure
      locale="en"
      reason={"constructor" as CheckInFailureReason}
    />,
  );
  expect(
    screen.getByRole("heading", { name: "We cannot confirm this check-in" }),
  ).toBeVisible();
  expect(screen.getByRole("status")).not.toHaveTextContent("adds no XP");
});
