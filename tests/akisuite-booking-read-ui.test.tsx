// @vitest-environment jsdom
import React from "react";
import "@testing-library/jest-dom/vitest";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
import { BookingManager } from "../src/components/BookingManager";
import { VenueDashboard } from "../src/components/VenueDashboard";
afterEach(() => {
  cleanup();
  window.history.replaceState({}, "", "/");
});
const venueId = "f728f63d-8d57-443c-8f9b-777e2e271001";
const action = vi.fn(async () => {});
const base = {
  locale: "en" as "en" | "es",
  venueId,
  settings: {
    mode: "request",
    booking_template: "experience",
    notification_email: "fixture@example.invalid",
  },
  slots: [
    {
      id: "slot",
      starts_at: "2026-11-01T10:00:00Z",
      ends_at: "2026-11-01T11:00:00Z",
      capacity: 4,
      active: true,
      resource_id: "resource",
      offering_id: "offering",
    },
  ],
  resources: [
    {
      id: "resource",
      name: "Own table",
      kind: "table",
      capacity: 4,
      active: true,
    },
  ],
  offerings: [
    {
      id: "offering",
      name: "Own service",
      kind: "experience",
      duration_minutes: 60,
      capacity: 4,
      active: true,
    },
  ],
  requests: [
    {
      id: "request",
      slot_id: "slot",
      contact_name: "Disposable guest",
      contact_email: "fixture@example.invalid",
      party_size: 2,
      status: "requested",
      created_at: "2026-10-29T10:00:00Z",
      venue_availability_slots: {
        starts_at: "2026-11-01T10:00:00Z",
        ends_at: "2026-11-01T11:00:00Z",
        offering_id: "offering",
      },
    },
  ],
  save: action,
  createSlot: action,
  createRecurringSlots: action,
  createResource: action,
  createOffering: action,
  updateOffering: action,
  updateRequest: action,
};
describe("booking manager independent read recovery", () => {
  for (const locale of ["en", "es"] as const) {
    const es = locale === "es",
      props = { ...base, locale };
    it.each(["settings", "notificationSettings"] as const)(
      `${locale}: %s failure cannot expose a default setup save`,
      (failed) => {
        const { container } = render(
          <BookingManager
            {...props}
            settings={failed === "settings" ? null : props.settings}
            initialTab="setup"
            readErrors={{ [failed]: true }}
          />,
        );
        expect(screen.getByRole("alert")).toHaveTextContent(
          es ? "configuración" : "setup",
        );
        expect(
          screen.queryByRole("button", {
            name: es ? "Guardar configuración" : "Save booking setup",
          }),
        ).not.toBeInTheDocument();
        expect(container.querySelector('input[name="mode"]')).toBeNull();
        expect(
          screen.getByRole("link", { name: es ? "Reintentar" : "Retry" }),
        ).toHaveAttribute(
          "href",
          `/${locale}/business/venue/${venueId}?section=bookings&bookingTab=setup`,
        );
        fireEvent.click(
          screen.getByRole("button", {
            name: es ? /^Reservas$/ : /^Bookings$/,
          }),
        );
        expect(screen.getByText(/Disposable guest/)).toBeVisible();
        fireEvent.click(
          screen.getByRole("button", {
            name: es ? /^Servicios$/ : /^Services$/,
          }),
        );
        expect(
          screen.getByRole("button", {
            name: es ? "Crear servicio" : "Create offering",
          }),
        ).toBeVisible();
      },
    );
    it(`${locale}: failed services do not block healthy resource creation or invent an empty calendar`, () => {
      render(
        <BookingManager
          {...props}
          offerings={[]}
          initialTab="offerings"
          readErrors={{ offerings: true }}
        />,
      );
      expect(
        screen.queryByRole("button", {
          name: es ? "Crear servicio" : "Create offering",
        }),
      ).not.toBeInTheDocument();
      fireEvent.click(
        screen.getByRole("button", {
          name: es ? /Gestionar mesas/ : /Manage tables/,
        }),
      );
      expect(
        screen.getByRole("button", {
          name: es ? "Añadir recurso" : "Add resource",
        }),
      ).toBeVisible();
      fireEvent.click(
        screen.getByRole("button", {
          name: es ? /^Calendario$/ : /^Calendar$/,
        }),
      );
      expect(
        screen.queryByText(
          es ? "Aún no hay horarios creados." : "No booking slots yet.",
        ),
      ).not.toBeInTheDocument();
      expect(screen.getByText(/Own table/)).toBeVisible();
      expect(
        screen.queryByText(es ? "Crear horario" : "Create availability", {
          exact: true,
        }),
      ).not.toBeInTheDocument();
      expect(screen.getByRole("alert")).toHaveTextContent(
        es ? "servicios o recursos" : "Offering or resource",
      );
    });
    it(`${locale}: failed resources keep services and known slot rows, but withhold dependent slot creation`, () => {
      render(
        <BookingManager
          {...props}
          resources={[]}
          initialTab="offerings"
          readErrors={{ resources: true }}
        />,
      );
      expect(
        screen.getByRole("button", {
          name: es ? "Crear servicio" : "Create offering",
        }),
      ).toBeVisible();
      fireEvent.click(
        screen.getByRole("button", {
          name: es ? /Gestionar mesas/ : /Manage tables/,
        }),
      );
      expect(
        screen.queryByRole("button", {
          name: es ? "Añadir recurso" : "Add resource",
        }),
      ).not.toBeInTheDocument();
      fireEvent.click(
        screen.getByRole("button", {
          name: es ? /^Calendario$/ : /^Calendar$/,
        }),
      );
      expect(
        screen.getByText(es ? /Recurso no disponible/ : /Resource unavailable/),
      ).toBeVisible();
      expect(
        screen.queryByText(es ? "Crear horario" : "Create availability", {
          exact: true,
        }),
      ).not.toBeInTheDocument();
      expect(screen.queryByText(/undefined/)).not.toBeInTheDocument();
    });
    it(`${locale}: unavailable inventory is unknown instead of zero/empty while inbox remains usable`, () => {
      const { container } = render(
        <BookingManager
          {...props}
          slots={[]}
          initialTab="calendar"
          readErrors={{ slots: true }}
        />,
      );
      expect(screen.getByRole("alert")).toHaveTextContent(
        es ? "disponibilidad" : "Availability",
      );
      expect(
        container.querySelector(
          ".booking-status-strip article:nth-child(2) strong",
        ),
      ).toHaveTextContent("—");
      expect(
        screen.queryByText(
          es ? "Aún no hay horarios creados." : "No booking slots yet.",
        ),
      ).not.toBeInTheDocument();
      expect(container.querySelector('input[name="startsAt"]')).toBeNull();
      fireEvent.click(
        screen.getByRole("button", {
          name: es ? /^Reservas$/ : /^Bookings$/,
        }),
      );
      expect(screen.getByText(/Disposable guest/)).toBeVisible();
    });
    it(`${locale}: unknown pending count preserves current requests and filtered retry`, () => {
      const { container } = render(
        <BookingManager
          {...props}
          readErrors={{ pending: true }}
          inbox={{
            search: "Café",
            status: "requested",
            sort: "oldest",
            page: 2,
            total: 21,
            pending: null,
          }}
        />,
      );
      expect(
        container.querySelector(
          ".booking-status-strip article:nth-child(3) strong",
        ),
      ).toHaveTextContent("—");
      expect(screen.getByText(/Disposable guest/)).toBeVisible();
      const retry = screen
        .getByRole("link", { name: es ? "Reintentar" : "Retry" })
        .getAttribute("href");
      expect(retry).toContain("bookingSearch=Caf%C3%A9");
      expect(retry).toContain("bookingPage=2");
      expect(retry).toContain("bookingTab=inbox");
    });
    it(`${locale}: successful missing settings retain defaults, and recovered actual Request settings replace the unavailable fallback`, () => {
      const { rerender, container } = render(
        <BookingManager {...props} settings={null} initialTab="setup" />,
      );
      expect(
        screen.getByRole("button", {
          name: es ? "Guardar configuración" : "Save booking setup",
        }),
      ).toBeVisible();
      expect(
        container.querySelector('input[name="mode"][value="external"]'),
      ).toBeChecked();
      rerender(
        <BookingManager
          {...props}
          settings={null}
          initialTab="setup"
          readErrors={{ settings: true }}
        />,
      );
      expect(container.querySelector('input[name="mode"]')).toBeNull();
      rerender(
        <BookingManager {...props} initialTab="setup" readErrors={{}} />,
      );
      expect(
        container.querySelector('input[name="mode"][value="request"]'),
      ).toBeChecked();
      expect(
        container.querySelector('input[name="notificationEmail"]'),
      ).toHaveValue("fixture@example.invalid");
    });
    it(`${locale}: dashboard reports an unavailable pending read without claiming zero`, () => {
      render(
        <VenueDashboard
          locale={locale}
          name="Own venue"
          status="published"
          verified
          initialSection="overview"
          counts={{
            photos: 0,
            events: 0,
            programs: 0,
            credentials: 0,
            requests: null,
            members: 1,
          }}
          sections={{ bookings: <p>Healthy section</p> }}
        />,
      );
      expect(
        screen.getByRole("tab", {
          name: es ? "Reservas · No disponible" : "Bookings · Unavailable",
        }),
      ).toBeVisible();
      expect(
        screen.queryByText(es ? "0 pendientes" : "0 pending"),
      ).not.toBeInTheDocument();
    });
  }
});
