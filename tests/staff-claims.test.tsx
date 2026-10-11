// @vitest-environment jsdom
import React from "react";
import { afterEach, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { StaffQueue } from "../src/app/[locale]/staff/StaffQueue";
vi.mock("../src/app/[locale]/moderation/actions", () => ({
  moderateItem: vi.fn(),
}));
afterEach(cleanup);
const item = {
  id: "claim-fixture",
  claimant_id: "applicant-fixture",
  created_at: "2026-10-10T10:00:00Z",
  status: "pending",
  evidence:
    "I manage this venue.\nPlease check my documents. <script>alert(1)</script>",
  claimant: {
    display_name: "Test Applicant",
    email: "applicant@example.test",
    phone: "+34600000000",
    submission: {
      applicant_name: "Business Contact",
      relationship: "owner",
      applicant_phone: "+34600000001",
      business_email: "business@example.test",
      business_website: "https://example.test",
      business_phone: "+34900000001",
    },
    created_at: "2026-09-01T10:00:00Z",
  },
  venues: {
    name: "Test Venue",
    address: "Example Street 1",
    slug: "test-venue",
    contact_phone: "+34900000000",
    website_url: "https://example.test",
    timezone: "Europe/Madrid",
  },
};
it.each(["en", "es"] as const)(
  "shows independent claim information and retains review controls in %s",
  (locale) => {
    render(
      <StaffQueue
        locale={locale}
        items={[item]}
        targetType="venue_claim"
        approve="approved"
        claimPage={2}
      />,
    );
    expect(
      screen.getByRole("heading", { name: "Test Venue" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Test Applicant")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "applicant@example.test" }),
    ).toHaveAttribute("href", "mailto:applicant%40example.test");
    expect(screen.getByText("+34600000000")).toBeInTheDocument();
    expect(screen.getByText("+34900000000")).toBeInTheDocument();
    expect(screen.getByText("Business Contact")).toBeInTheDocument();
    expect(document.querySelector(".claim-modern-hero")).toBeInTheDocument();
    expect(document.querySelector(".claim-modern-columns")).toBeInTheDocument();
    expect(document.querySelector(".claim-modern-approve")).toBeInTheDocument();
    expect(document.querySelector(".claim-modern-deny")).toBeInTheDocument();
    expect(document.querySelector(".claim-modern-facts")).toBeInTheDocument();
    // Account metadata belongs to the hero, not repeated inside the submitted data.
    expect(screen.getAllByText("applicant@example.test")).toHaveLength(1);
    expect(document.querySelectorAll(".claim-modern")).toHaveLength(1);
    expect(document.querySelector(".queue-card")).toBeNull();
    expect(document.querySelector('input[name="decision"]')).toBeNull();

    expect(screen.getByText("+34600000001")).toBeInTheDocument();
    expect(screen.getByText("business@example.test")).toBeInTheDocument();
    expect(screen.getByText("+34900000001")).toBeInTheDocument();
    expect(
      screen.getByText(
        locale === "en"
          ? "Applicant-supplied details. These have not been verified or applied to the public listing."
          : "Datos declarados por el solicitante. No se han verificado ni aplicado a la ficha pública.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByText("Example Street 1")).toBeInTheDocument();
    expect(document.querySelector("time")?.textContent).toContain("12:00");
    expect(document.querySelector("time")).toHaveAttribute(
      "dateTime",
      item.created_at,
    );
    expect(document.querySelector(".claim-evidence")?.textContent).toBe(
      item.evidence,
    );
    expect(document.querySelector("script")).toBeNull();
    expect(document.querySelector('[name="targetId"]')).toHaveValue(item.id);
    expect(document.querySelector('[name="claimPage"]')).toHaveValue("2");
    expect(
      screen.getByRole("button", {
        name: locale === "en" ? "Approve claim" : "Aprobar reclamación",
      }),
    ).toHaveAttribute("value", "approved");
  },
);
it("labels missing data and uses accommodation destination", () => {
  render(
    <StaffQueue
      locale="en"
      items={[
        {
          ...item,
          claimant: null,
          venues: {
            ...item.venues,
            discovery_vertical: "accommodation",
            website_url: "javascript:alert(1)",
          },
        },
      ]}
      targetType="venue_claim"
      approve="approved"
    />,
  );
  expect(screen.getAllByText("Not provided").length).toBeGreaterThan(1);
  expect(screen.getByRole("link", { name: "View venue" })).toHaveAttribute(
    "href",
    "https://akiduermo.akipasa.com/stays/test-venue?lang=en",
  );
  expect(document.querySelector('a[href^="javascript:"]')).toBeNull();
});
it("preserves other queues and empty state", () => {
  const { rerender } = render(
    <StaffQueue
      locale="en"
      items={[
        {
          id: "event",
          created_at: item.created_at,
          title_en: "Music",
          venues: { name: "Test Venue" },
        },
      ]}
      targetType="event"
      approve="published"
    />,
  );
  expect(screen.getByRole("heading", { name: "Music" })).toBeInTheDocument();
  expect(document.querySelector(".claim-review-details")).toBeNull();
  rerender(
    <StaffQueue
      locale="en"
      items={[]}
      targetType="venue_claim"
      approve="approved"
    />,
  );
  expect(screen.getByText("This queue is empty.")).toBeInTheDocument();
});

it("shows one selected claim and lets staff navigate requests without duplicating cards", () => {
  render(
    <StaffQueue
      locale="en"
      items={[
        item,
        {
          ...item,
          id: "claim-second",
          claimant: { ...item.claimant, email: "second@example.test" },
          venues: { ...item.venues, name: "Second venue" },
        },
      ]}
      selectedClaimId="claim-second"
      targetType="venue_claim"
      approve="approved"
      claimPage={3}
    />,
  );
  expect(
    screen.getByRole("heading", { name: "Second venue" }),
  ).toBeInTheDocument();
  expect(screen.getByRole("link", { name: /Second venue/i })).toHaveAttribute(
    "aria-current",
    "true",
  );
  expect(document.querySelectorAll(".claim-modern")).toHaveLength(1);
  expect(document.querySelector('[name="claimPage"]')).toHaveValue("3");
  expect(document.querySelector('[name="targetId"]')).toHaveValue(
    "claim-second",
  );
  expect(screen.queryByRole("heading", { name: "Test Venue" })).toBeNull();
  expect(screen.getByRole("link", { name: /Test Venue/i })).toHaveAttribute(
    "href",
    "/en/staff/moderation?queue=claims&page=3&claim=claim-fixture",
  );
});

it("request more information composes email without changing claim state", () => {
  render(
    <StaffQueue
      locale="en"
      items={[item]}
      targetType="venue_claim"
      approve="approved"
    />,
  );
  const link = screen.getByRole("link", { name: "Request more information" });
  expect(link.getAttribute("href")).toContain(
    "mailto:applicant%40example.test",
  );
  expect(link.getAttribute("href")).toContain("subject=");
  expect(screen.getByText(/does not change claim status/)).toBeInTheDocument();
  expect(document.querySelectorAll('button[name="decision"]')).toHaveLength(2);
  expect(screen.getByRole("button", { name: "Deny claim" })).toHaveAttribute(
    "value",
    "rejected",
  );
});
