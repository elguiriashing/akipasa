// @vitest-environment jsdom
import React from "react";
import "@testing-library/jest-dom/vitest";
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { AccommodationBookingWorkspace } from "../src/components/AccommodationBookingWorkspace";
import { VenueDashboard } from "../src/components/VenueDashboard";

afterEach(cleanup);

const counts = { photos: 0, events: 0, programs: 0, credentials: 0, requests: 0, members: 1 };

describe("AkiDuermo business tools", () => {
  it("shows distinct accommodation management sections without offering fake hotel reservations", () => {
    render(<AccommodationBookingWorkspace locale="en" venueId="example" />);
    expect(screen.getByRole("navigation", { name: "Accommodation sections" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Rooms & units/ }));
    expect(screen.getByRole("region", { name: "Rooms & units" })).toHaveTextContent("unique inventory");
    fireEvent.click(screen.getByRole("button", { name: /Calendar/ }));
    expect(screen.getByRole("region", { name: "Calendar" })).toHaveTextContent("room nights");
    expect(screen.getByText(/Overnight booking is disabled/)).toBeVisible();
    expect(screen.queryByRole("button", { name: /Confirm booking|Book now/ })).not.toBeInTheDocument();
  });

  it("offers Spanish copy with accessible tab actions", () => {
    render(<AccommodationBookingWorkspace locale="es" venueId="example" />);
    fireEvent.click(screen.getByRole("button", { name: /Tarifas/ }));
    expect(screen.getByRole("region", { name: "Tarifas" })).toHaveTextContent("precios por noche");
  });

  it("keeps accommodation-specific tools and excludes venue-only editors", () => {
    render(<VenueDashboard locale="en" name="Test accommodation" product="accommodation" status="published"
      verified={true} initialSection="events" counts={counts}
      sections={{ profile: <p>Property profile</p>, bookings: <p>Stay tools</p>, team: <p>Staff</p> }} />);
    expect(screen.getByRole("tab", { name: "Overview" })).toHaveAttribute("aria-selected", "true");
    expect(screen.queryByRole("tab", { name: /^Events/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("tab", { name: /^Rewards/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("tab", { name: /^Check-in/ })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("tab", { name: /Bookings/ }));
    expect(screen.getByText("Stay tools")).toBeVisible();
  });
});
