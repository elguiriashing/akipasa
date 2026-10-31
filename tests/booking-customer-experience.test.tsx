// @vitest-environment jsdom
import React from "react";
import "@testing-library/jest-dom/vitest";
import { afterEach, describe, it, expect, vi } from "vitest";
import {
  cleanup,
  render,
  screen,
  fireEvent,
  act,
  waitFor,
} from "@testing-library/react";
import { MyBookings } from "../src/components/MyBookings";
import { BookingWizard } from "../src/components/BookingWizard";

afterEach(cleanup);
const day = (offset: number) =>
  new Date(Date.now() + offset * 86400000).toISOString();
const bookings = [
  {
    id: "1",
    party_size: 2,
    status: "requested",
    created_at: day(-1),
    venue: { name: "Beasty Bites", slug: "beasty-bites" },
    slot: { starts_at: day(3), ends_at: day(3.1) },
  },
  {
    id: "2",
    party_size: 3,
    status: "confirmed",
    created_at: day(-2),
    venue: { name: "Sports Club", slug: "sports-club" },
    slot: { starts_at: day(-0.01), ends_at: day(0.05) },
  },
  {
    id: "3",
    party_size: 1,
    status: "completed",
    created_at: day(-5),
    venue: { name: "Old Tour", slug: "old-tour" },
    slot: { starts_at: day(-4), ends_at: day(-3.9) },
  },
];

describe("Account My Bookings", () => {
  it("separates upcoming active and past bookings with clear status cards", () => {
    render(<MyBookings locale="en" bookings={bookings} />);
    expect(screen.getByText("Beasty Bites")).toBeVisible();
    expect(screen.getByText("Pending approval")).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: /Active/ }));
    expect(screen.getByText("Sports Club")).toBeVisible();
    expect(screen.queryByText("Beasty Bites")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Past/ }));
    expect(screen.getByText("Old Tour")).toBeVisible();
  });
  it("shows a useful empty state without fake reservations", () => {
    render(<MyBookings locale="es" bookings={[]} />);
    expect(screen.getByText("Nada por aquí todavía")).toBeVisible();
    expect(
      screen.getByRole("link", { name: /Explorar locales/ }),
    ).toHaveAttribute("href", "/es");
  });
});

const slots = [
  {
    id: "00000000-0000-4000-8000-000000000001",
    starts_at: day(2),
    ends_at: day(2.04),
    capacity: 2,
    offering_id: null,
  },
  {
    id: "00000000-0000-4000-8000-000000000002",
    starts_at: day(3),
    ends_at: day(3.04),
    capacity: 6,
    offering_id: "00000000-0000-4000-8000-000000000003",
  },
];
const wizardProps = {
  locale: "en" as const,
  slug: "beasty-bites",
  venueId: "00000000-0000-4000-8000-000000000000",
  venueName: "Beasty Bites",
  slots,
  offerings: { "00000000-0000-4000-8000-000000000003": "Breakfast" },
  profile: { name: "Test User", email: "person@example.com", phone: "" },
  submit: vi.fn(async () => {}),
};
describe("Customer booking wizard", () => {
  it("uses steps and guest buttons limited by the selected slot", () => {
    render(<BookingWizard {...wizardProps} />);
    expect(screen.getByText("Choose a date")).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: /Continue/ }));
    expect(screen.getByText("How many guests?")).toBeVisible();
    const plus = screen.getByRole("button", { name: "Add guest" });
    fireEvent.click(plus);
    expect(
      screen.getByText("2", { selector: ".booking-guest-counter strong" }),
    ).toBeVisible();
    expect(plus).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: /Continue/ }));
    expect(screen.getByText("Contact details")).toBeVisible();
    expect(
      screen.getByRole("button", { name: "Request booking" }),
    ).toBeEnabled();
  });
  it("offers the Spanish step flow", () => {
    render(<BookingWizard {...wizardProps} locale="es" />);
    expect(screen.getByText("Elige el día")).toBeVisible();
    expect(screen.getByRole("button", { name: /Continuar/ })).toBeVisible();
  });
});

describe("Event context in the shared booking wizard", () => {
  it("submits event/occurrence context with the existing caller fields and stable request key", () => {
    const { container } = render(
      <BookingWizard
        {...wizardProps}
        event={{
          id: "30000000-0000-4000-8000-000000000001",
          occurrence: "selected-occurrence",
        }}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /Continue/ }));
    fireEvent.click(screen.getByRole("button", { name: /Continue/ }));
    const form = container.querySelector("form")!;
    const data = new FormData(form);
    expect(data.get("eventId")).toBe("30000000-0000-4000-8000-000000000001");
    expect(data.get("occurrence")).toBe("selected-occurrence");
    expect(data.get("venueId")).toBe(wizardProps.venueId);
    expect(data.get("contactName")).toBe("Test User");
    expect(data.get("contactEmail")).toBe("person@example.com");
    expect(data.get("requestKey")).toMatch(/^[a-f0-9-]{36}$/);
    const key = data.get("requestKey");
    fireEvent.click(screen.getByRole("button", { name: "Back" }));
    fireEvent.click(screen.getByRole("button", { name: /Continue/ }));
    expect(
      new FormData(container.querySelector("form")!).get("requestKey"),
    ).toBe(key);
  });
  it("leaves the ordinary venue submission free of event-only fields", () => {
    const { container } = render(<BookingWizard {...wizardProps} />);
    fireEvent.click(screen.getByRole("button", { name: /Continue/ }));
    fireEvent.click(screen.getByRole("button", { name: /Continue/ }));
    const data = new FormData(container.querySelector("form")!);
    expect(data.has("eventId")).toBe(false);
    expect(data.has("occurrence")).toBe(false);
    expect(data.get("venueId")).toBe(wizardProps.venueId);
  });
  it.each(["en", "es"] as const)(
    "%s all-full slots show an honest full state without a zero-guest request",
    (locale) => {
      render(
        <BookingWizard
          {...wizardProps}
          locale={locale}
          slots={slots.map((s) => ({ ...s, remaining: 0 }))}
        />,
      );
      expect(screen.getByRole("status")).toHaveTextContent(
        locale === "es"
          ? "No quedan plazas disponibles"
          : "No places available",
      );
      expect(
        screen.queryByRole("button", { name: /Continue|Continuar/ }),
      ).not.toBeInTheDocument();
    },
  );
});

it.each([
  { label: "venue", event: undefined },
  {
    label: "event",
    event: {
      id: "30000000-0000-4000-8000-000000000001",
      occurrence: "selected-occurrence",
    },
  },
])(
  "$label pending requests disable repeat submission and retain contact/idempotency after availability changes",
  async ({ event }) => {
    let finish!: (value: { error: string; remaining: number }) => void;
    const submit = vi.fn(
      () =>
        new Promise<{ error: string; remaining: number }>((resolve) => {
          finish = resolve;
        }),
    );
    const { container } = render(
      <BookingWizard {...wizardProps} event={event} submit={submit} />,
    );
    fireEvent.click(screen.getByRole("button", { name: /Continue/ }));
    fireEvent.click(screen.getByRole("button", { name: /Continue/ }));
    fireEvent.change(screen.getByLabelText("Name", { exact: true }), {
      target: { value: "Updated Guest" },
    });
    fireEvent.change(screen.getByLabelText("Email", { exact: true }), {
      target: { value: "updated@example.test" },
    });
    const form = container.querySelector("form")!,
      key = new FormData(form).get("requestKey");
    fireEvent.submit(form);
    const button = await screen.findByRole("button", { name: "Submitting..." });
    expect(button).toBeDisabled();
    fireEvent.click(button);
    fireEvent.click(button);
    expect(submit).toHaveBeenCalledTimes(1);
    await act(async () => {
      finish({ error: "Availability changed", remaining: 1 });
    });
    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent(
        "Availability changed",
      ),
    );
    fireEvent.click(screen.getByRole("button", { name: /Continue/ }));
    fireEvent.click(screen.getByRole("button", { name: /Continue/ }));
    expect(screen.getByLabelText("Name", { exact: true })).toHaveValue(
      "Updated Guest",
    );
    expect(screen.getByLabelText("Email", { exact: true })).toHaveValue(
      "updated@example.test",
    );
    const retry = new FormData(container.querySelector("form")!);
    expect(retry.get("requestKey")).toBe(key);
    expect(retry.get("partySize")).toBe("1");
    expect(retry.get("eventId")).toBe(event?.id ?? null);
    expect(retry.get("occurrence")).toBe(event?.occurrence ?? null);
  },
);

it.each(["en", "es"] as const)(
  "%s single guest, slot and remaining place use singular labels",
  (locale) => {
    render(
      <BookingWizard
        {...wizardProps}
        locale={locale}
        slots={[{ ...slots[0], remaining: 1 }]}
      />,
    );
    expect(
      screen.getByText(locale === "es" ? "1 persona" : "1 guest", {
        selector: ".booking-wizard-summary span",
      }),
    ).toBeVisible();
    expect(
      screen.getByText(locale === "es" ? "1 plaza libre" : "1 place left"),
    ).toBeVisible();
    expect(
      screen.getByText(locale === "es" ? "1 horario" : "1 time"),
    ).toBeVisible();
  },
);
