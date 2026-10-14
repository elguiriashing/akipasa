// @vitest-environment jsdom

import React from "react";
import "@testing-library/jest-dom/vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import {
  StaffPromotionsInbox,
  type StaffPromotion,
} from "../src/app/[locale]/staff/promotions/StaffPromotionsInbox";

afterEach(cleanup);

const requests: StaffPromotion[] = [
  {
    id: "new-request",
    venueName: "New Beach Bar",
    service: "featured_listing",
    message: "Please feature our live music opening.",
    state: "new",
    operatorNotes: null,
    createdAt: "2026-10-11T18:00:00Z",
  },
  {
    id: "contacted-request",
    venueName: "Venue With A Very Long Name",
    service: "sponsored_event",
    message: "Working on a launch party.",
    state: "contacted",
    operatorNotes: "Awaiting artwork from organiser.",
    createdAt: "2026-10-10T18:00:00Z",
  },
  {
    id: "won-request",
    venueName: "City Music",
    service: "featured_listing",
    message: "Promote the event.",
    state: "won",
    operatorNotes: "Approved and scheduled.",
    createdAt: "2026-10-09T18:00:00Z",
  },
  {
    id: "lost-request",
    venueName: "Other Venue",
    service: "new_service_type",
    message: "A message with <script>alert(1)</script> inside.",
    state: "lost",
    operatorNotes: "Declined for now.",
    createdAt: "2026-10-08T18:00:00Z",
  },
];

function visibleCards(container: HTMLElement) {
  return container.querySelectorAll(".staff-promotions-card");
}

describe("Staff promotions operational inbox", () => {
  it("shows clean readable cards with counts, status and bounded initial content", () => {
    const { container } = render(
      <StaffPromotionsInbox locale="en" requests={requests} />,
    );
    expect(
      screen.getByRole("heading", { name: "Promotions" }),
    ).toBeInTheDocument();
    expect(visibleCards(container)).toHaveLength(4);
    expect(screen.getAllByText("Featured event")).toHaveLength(2);
    expect(screen.getByText("Latest 50 requests loaded")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /To review/ }),
    ).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /In progress/ })).toHaveLength(
      2,
    );
    expect(screen.getAllByRole("button", { name: /Closed/ })).toHaveLength(2);
    expect(container.querySelector("form")).toBeNull();
    expect(container.querySelector("script")).toBeNull();
    expect(screen.getAllByText(/<script>alert\(1\)<\/script>/)).toHaveLength(2);
  });

  it("filters and searches the same bounded list without discarding requests", () => {
    const { container } = render(
      <StaffPromotionsInbox locale="en" requests={requests} />,
    );
    const status = screen.getByRole("group", { name: "Filter by status" });
    fireEvent.click(
      within(status).getByRole("button", { name: "In progress 1" }),
    );
    expect(visibleCards(container)).toHaveLength(1);
    expect(screen.getByText("Venue With A Very Long Name")).toBeInTheDocument();
    expect(
      within(status).getByRole("button", { name: "In progress 1" }),
    ).toHaveAttribute("aria-pressed", "true");

    fireEvent.click(within(status).getByRole("button", { name: "All 4" }));
    const search = screen.getByRole("searchbox", { name: "Search requests" });
    fireEvent.change(search, { target: { value: "music opening" } });
    expect(visibleCards(container)).toHaveLength(1);
    expect(screen.getByText("New Beach Bar")).toBeInTheDocument();

    fireEvent.change(search, { target: { value: "not a real venue" } });
    expect(
      screen.getByRole("heading", { name: "No matching requests" }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Clear filters" }));
    expect(visibleCards(container)).toHaveLength(4);
    expect(search).toHaveValue("");
  });

  it("provides full original message and internal notes on demand", () => {
    const { container } = render(
      <StaffPromotionsInbox locale="en" requests={requests} />,
    );
    const card = Array.from(visibleCards(container)).find((node) =>
      node.textContent?.includes("Venue With A Very Long Name"),
    );
    expect(card).toBeDefined();
    const disclosure = card as HTMLDetailsElement;
    expect(disclosure).not.toHaveAttribute("open");
    fireEvent.click(within(disclosure).getByText("View details"));
    expect(disclosure).toHaveAttribute("open");
    expect(
      within(disclosure).getByText("Awaiting artwork from organiser."),
    ).toBeInTheDocument();
    expect(
      within(disclosure).getByText(
        "Read-only view. Manage requests and update statuses in Administration.",
      ),
    ).toBeInTheDocument();
  });

  it("localizes Spanish labels, preserving the original service and message", () => {
    const { container } = render(
      <StaffPromotionsInbox locale="es" requests={requests} />,
    );
    expect(
      screen.getByRole("heading", { name: "Promociones" }),
    ).toBeInTheDocument();
    expect(screen.getAllByText("Evento destacado")).toHaveLength(2);
    expect(
      screen.getByRole("searchbox", { name: "Buscar solicitudes" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Por revisar/ }),
    ).toBeInTheDocument();
    expect(container.querySelector("form")).toBeNull();
  });

  it("distinguishes an empty inbox from filtered-away rows", () => {
    const { container } = render(
      <StaffPromotionsInbox locale="en" requests={[]} />,
    );
    expect(
      screen.getByRole("heading", { name: "No requests yet" }),
    ).toBeInTheDocument();
    expect(visibleCards(container)).toHaveLength(0);
    expect(screen.queryByRole("button", { name: "Clear filters" })).toBeNull();
  });
});
