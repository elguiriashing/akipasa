// @vitest-environment jsdom

import React from "react";
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { VenueDashboard } from "../src/components/VenueDashboard";
import { getVenueDashboardSection } from "../src/lib/venue-dashboard";

const props = {
  locale: "en" as const,
  name: "Example venue",
  status: "published",
  verified: true,
  initialSection: "overview" as const,
  counts: {
    photos: 2,
    events: 1,
    programs: 0,
    credentials: 1,
    requests: 3,
    members: 2,
  },
  sections: {
    profile: (
      <form>
        <label>
          Venue name
          <input defaultValue="Example venue" />
        </label>
      </form>
    ),
    events: (
      <details id="event-example">
        <summary>Example event</summary>
        <button>Edit event</button>
      </details>
    ),
    rewards: <p>Reward tools</p>,
    checkin: <p>Check-in tools</p>,
    bookings: <p>Booking requests</p>,
    team: (
      <details>
        <summary>Venue access and removal</summary>
        <button>Delete venue</button>
      </details>
    ),
  },
};

beforeEach(() => {
  window.history.replaceState({}, "", "/en/business/venue/example");
  HTMLElement.prototype.scrollIntoView = vi.fn();
});
afterEach(cleanup);

describe("compact venue dashboard", () => {
  it("opens with an overview and keeps editing and removal tools out of the way", () => {
    render(<VenueDashboard {...props} />);
    expect(screen.getAllByRole("tabpanel")).toHaveLength(1);
    expect(screen.getByRole("tab", { name: "Overview" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(
      screen.getByRole("button", { name: /Bookings.*3 pending/ }),
    ).toBeVisible();
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Delete venue" }),
    ).not.toBeInTheDocument();
  });

  it("keeps unsaved form values when moving between sections", () => {
    render(<VenueDashboard {...props} />);
    fireEvent.click(screen.getByRole("button", { name: /Profile.*photos/ }));
    fireEvent.change(screen.getByLabelText("Venue name"), {
      target: { value: "An unsaved edit" },
    });
    fireEvent.click(screen.getByRole("tab", { name: "Bookings" }));
    expect(screen.getByText("Booking requests")).toBeVisible();
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("tab", { name: "Profile" }));
    expect(screen.getByLabelText("Venue name")).toHaveValue("An unsaved edit");
    expect(window.location.search).toBe("?section=profile");
  });

  it("supports keyboard navigation and restores the section from browser history", () => {
    render(<VenueDashboard {...props} />);
    fireEvent.keyDown(screen.getByRole("tab", { name: "Overview" }), {
      key: "End",
    });
    expect(screen.getByRole("tab", { name: "Team" })).toHaveFocus();
    fireEvent.keyDown(screen.getByRole("tab", { name: "Team" }), {
      key: "ArrowRight",
    });
    expect(screen.getByRole("tab", { name: "Overview" })).toHaveFocus();
    window.history.replaceState({}, "", "?section=bookings");
    fireEvent(window, new PopStateEvent("popstate"));
    expect(screen.getByRole("tab", { name: "Bookings" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(screen.getAllByRole("tabpanel")).toHaveLength(1);
  });

  it("opens existing event anchor links in the Events section", () => {
    window.history.replaceState({}, "", "#event-example");
    render(<VenueDashboard {...props} />);
    expect(screen.getByRole("tab", { name: "Events" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(document.getElementById("event-example")).toHaveAttribute("open");
    expect(screen.getByRole("button", { name: "Edit event" })).toBeVisible();
  });

  it("localizes navigation and displays save feedback in the selected section", () => {
    render(
      <VenueDashboard
        {...props}
        locale="es"
        initialSection="profile"
        feedback="success"
      />,
    );
    expect(screen.getByRole("tab", { name: "Perfil" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(screen.getByRole("status")).toHaveTextContent("Cambios guardados.");
    fireEvent.click(screen.getByRole("tab", { name: "Reservas" }));
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });
});

describe("venue action return sections", () => {
  it.each([
    ["venue", "profile"],
    ["media", "profile"],
    ["media-metadata", "profile"],
    ["media-removed", "profile"],
    ["event", "events"],
    ["occurrence", "events"],
    ["occurrence-status", "events"],
    ["recurrence", "events"],
    ["duplicate", "events"],
    ["event-deleted", "events"],
    ["event-delete", "events"],
    ["offer", "rewards"],
    ["stamp", "rewards"],
    ["reward", "rewards"],
    ["assignment", "rewards"],
    ["credential", "checkin"],
    ["redemption", "checkin"],
    ["booking", "bookings"],
    ["booking-slot", "bookings"],
    ["booking-request", "bookings"],
    ["member", "team"],
    ["unclaim", "team"],
    ["venue-delete", "team"],
  ])("returns %s to %s for success and error responses", (result, section) => {
    expect(getVenueDashboardSection({ updated: result })).toBe(section);
    expect(getVenueDashboardSection({ error: result })).toBe(section);
  });
  it("accepts known section links and safely defaults unknown links", () => {
    expect(getVenueDashboardSection({ section: "bookings" })).toBe("bookings");
    expect(getVenueDashboardSection({ section: "unknown" })).toBe("overview");
    expect(getVenueDashboardSection({})).toBe("overview");
  });
});
