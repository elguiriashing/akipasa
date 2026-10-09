// @vitest-environment jsdom

import React from "react";
import "@testing-library/jest-dom/vitest";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { BookingManager } from "../src/components/BookingManager";

afterEach(cleanup);

const venueId = "00000000-0000-4000-8000-000000000001";
const props = {
  locale: "en" as const,
  venueId,
  settings: { mode: "request", booking_template: "experience" },
  slots: [
    {
      id: "00000000-0000-4000-8000-000000000002",
      starts_at: "2026-11-01T10:00:00Z",
      ends_at: "2026-11-01T11:00:00Z",
      capacity: 2,
      active: true,
      resource_id: "00000000-0000-4000-8000-000000000003",
    },
  ],
  resources: [
    {
      id: "00000000-0000-4000-8000-000000000003",
      name: "Buggy 1",
      kind: "vehicle",
      capacity: 2,
      active: true,
    },
  ],
  offerings: [
    {
      id: "00000000-0000-4000-8000-000000000004",
      name: "Buggy tour",
      kind: "experience",
      duration_minutes: 60,
      capacity: 2,
      active: true,
    },
  ],
  requests: [],
  save: vi.fn(async () => {}),
  createSlot: vi.fn(async () => {}),
  createRecurringSlots: vi.fn(async () => {}),
  createResource: vi.fn(async () => {}),
  createOffering: vi.fn(async () => {}),
  updateRequest: vi.fn(async () => {}),
};

describe("AkiBusiness advanced booking manager", () => {
  it("shows resources with inventory capacity and a create form", () => {
    render(<BookingManager {...props} />);
    fireEvent.click(screen.getByRole("button", { name: "Services" }));
    fireEvent.click(screen.getByRole("button", { name: /Manage tables, equipment and staff/ }));
    expect(screen.getByText("Bookable resources")).toBeVisible();
    expect(screen.getByText(/Buggy 1/)).toBeVisible();
    expect(screen.getByLabelText("Resource name")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add resource" })).toBeVisible();
  });

  it("allows businesses to create offerings", () => {
    render(<BookingManager {...props} />);
    fireEvent.click(screen.getByRole("button", { name: "Services" }));
    expect(screen.getByText("Bookable offerings")).toBeVisible();
    expect(screen.getByText(/Buggy tour/)).toBeVisible();
    expect(
      screen.getByRole("button", { name: "Create offering" }),
    ).toBeVisible();
  });

  it("allows venue owners to choose recurring days and attach a resource", () => {
    render(<BookingManager {...props} />);
    fireEvent.click(screen.getByRole("button", { name: "Calendar" }));
    fireEvent.click(screen.getByText("Schedule recurring availability"));
    expect(screen.getByLabelText("From")).toBeInTheDocument();
    expect(screen.getByLabelText("Until (max 90 days)")).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: "Mon" })).toBeChecked();
    expect(screen.getByRole("checkbox", { name: "Sun" })).not.toBeChecked();
    expect(
      screen.getByRole("button", { name: "Create schedule" }),
    ).toBeVisible();
    expect(screen.getAllByRole("option", { name: "Buggy 1 · 2" })).toHaveLength(
      2,
    );
  });

  it("keeps external mode link-only, without resource or deposit settings", () => {
    render(
      <BookingManager
        {...props}
        settings={{
          mode: "external",
          external_url: "https://example.com/book",
        }}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Settings" }));
    expect(screen.getByLabelText("Booking URL")).toHaveValue(
      "https://example.com/book",
    );
    expect(screen.queryByText("Deposit (€)")).not.toBeInTheDocument();
    expect(screen.queryByText("Booking template")).not.toBeInTheDocument();
  });

  it("uses the shared SVG icon system for template selectors", () => {
    const { container } = render(<BookingManager {...props} />);
    fireEvent.click(screen.getByRole("button", { name: "Services" }));
    expect(
      container.querySelectorAll(".booking-template-card svg"),
    ).toHaveLength(7);
    expect(
      screen.getByRole("button", { name: "Events & tickets" }),
    ).toBeInTheDocument();
  });
});
