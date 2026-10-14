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
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  promotionServiceLabel,
  promotionStateLabel,
} from "../src/lib/promotion-labels";
import { PromotionRequestFields } from "../src/components/PromotionRequestFields";
import { StaffPromotionsInbox } from "../src/app/[locale]/staff/promotions/StaffPromotionsInbox";

const fixtures = vi.hoisted(() => ({
  requests: [] as Record<string, unknown>[],
}));
const updatePromotion = vi.hoisted(() => vi.fn());
vi.mock("@/lib/auth", () => ({
  requireUser: vi.fn(async () => ({
    supabase: {
      from: (table: string) => {
        const result = {
          data: table === "promotion_requests" ? fixtures.requests : [],
        };
        const query = {
          select: () => query,
          order: () => query,
          limit: () => query,
          eq: () => query,
          then: (resolve: (value: typeof result) => unknown) =>
            Promise.resolve(result).then(resolve),
        };
        return query;
      },
    },
  })),
}));
vi.mock("../src/app/[locale]/admin/actions", () => ({
  createFeatureSlot: vi.fn(),
  updatePromotion,
}));
vi.mock("@/components/WorkspaceShell", () => ({
  WorkspacePageHeader: ({ title }: { title: string }) => <h1>{title}</h1>,
}));
import AdminPromotionsPage from "../src/app/[locale]/admin/promotions/page";

afterEach(() => {
  cleanup();
  fixtures.requests = [];
});

const services = [
  "featured_listing",
  "social_campaign",
  "content_package",
  "other",
];
const states = ["new", "contacted", "qualified", "won", "lost"];
const labels = {
  en: {
    services: [
      "Featured event",
      "Social media campaign",
      "VIP content package",
      "Other / Custom",
    ],
    states: ["New", "Contacted", "Qualified", "Won", "Lost"],
  },
  es: {
    services: [
      "Evento destacado",
      "Campaña en redes sociales",
      "Paquete de contenido VIP",
      "Otro / Personalizado",
    ],
    states: ["Nueva", "Contactada", "Cualificada", "Ganada", "Perdida"],
  },
};

describe.each(["en", "es"] as const)(
  "promotion display labels (%s)",
  (locale) => {
    it("covers accepted services/states and preserves unknown text without prototype lookup", () => {
      expect(
        services.map((value) => promotionServiceLabel(value, locale)),
      ).toEqual(labels[locale].services);
      expect(states.map((value) => promotionStateLabel(value, locale))).toEqual(
        labels[locale].states,
      );
      for (const unknown of [
        "new_service_type",
        "__proto__",
        "constructor",
        "",
        "<script>alert(1)</script>",
      ]) {
        expect(promotionServiceLabel(unknown, locale)).toBe(unknown);
        expect(promotionStateLabel(unknown, locale)).toBe(unknown);
      }
    });

    it("renders real business selector labels while submitting unchanged service IDs", () => {
      const { container } = render(
        <form>
          <PromotionRequestFields
            locale={locale}
            venues={[{ id: "venue", name: "Venue" }]}
            events={[{ id: "event", venueId: "venue", title: "Event" }]}
          />
        </form>,
      );
      const select = screen.getByRole("combobox", {
        name: locale === "es" ? "Tipo de servicio" : "Service type",
      });
      expect(
        within(select)
          .getAllByRole("option")
          .map((option) => option.textContent),
      ).toEqual(labels[locale].services);
      for (const value of services) {
        fireEvent.change(select, { target: { value } });
        expect(
          new FormData(container.querySelector("form")!).get("service"),
        ).toBe(value);
        expect(
          container.querySelector('select[name="eventId"]'),
        ).toHaveProperty("required", value === "featured_listing");
      }
    });

    it("renders Admin request labels, status options and localized search without rewriting action fields", async () => {
      fixtures.requests = states.map((state, index) => ({
        id: `request-${index}`,
        venue_id: "venue",
        event_id: null,
        service: services[index % services.length],
        message: "Original message",
        state,
        operator_notes: "Original note",
        created_at: "2026-10-14T00:00:00Z",
        venues: { name: `Venue ${index}` },
        events: null,
        feature_slots: null,
      }));
      fixtures.requests.push({
        ...fixtures.requests[0],
        id: "unknown",
        service: "unknown_service",
        state: "unknown_state",
      });
      const { container } = render(
        await AdminPromotionsPage({
          params: Promise.resolve({ locale }),
          searchParams: Promise.resolve({}),
        }),
      );
      const entries = container.querySelectorAll(".admin-commercial-request");
      expect(entries).toHaveLength(6);
      states.forEach((state, index) => {
        const row = entries[index] as HTMLElement;
        expect(row.querySelector("summary")?.textContent).toContain(
          labels[locale].services[index % services.length],
        );
        expect(row.querySelector(".status-pill")).toHaveTextContent(
          labels[locale].states[index],
        );
        const form = row.querySelector("form")!;
        expect(new FormData(form).get("service")).toBe(
          services[index % services.length],
        );
        expect(new FormData(form).get("state")).toBe(state);
        expect(new FormData(form).get("locale")).toBe(locale);
        expect(new FormData(form).get("requestId")).toBe(`request-${index}`);
        expect(new FormData(form).get("notes")).toBe("Original note");
        const select = form.querySelector('select[name="state"]')!;
        expect(
          within(select as HTMLElement)
            .getAllByRole("option")
            .map((option) => option.textContent),
        ).toEqual(labels[locale].states);
        expect(
          Array.from((select as HTMLSelectElement).options).map(
            (option) => option.value,
          ),
        ).toEqual(states);
      });
      expect(entries[5].querySelector("summary")).toHaveTextContent(
        "unknown_service",
      );
      expect(entries[5].querySelector(".status-pill")).toHaveTextContent(
        "unknown_state",
      );
      const filter = screen.getByRole("combobox", {
        name:
          locale === "es"
            ? "Filtrar Solicitudes comerciales por estado"
            : "Filter Commercial requests by status",
      });
      expect(
        within(filter).getByRole("option", { name: labels[locale].states[1] }),
      ).toHaveValue("contacted");
      fireEvent.change(filter, { target: { value: "contacted" } });
      expect(
        container.querySelectorAll(".admin-commercial-request"),
      ).toHaveLength(1);
      fireEvent.change(filter, { target: { value: "all" } });
      fireEvent.change(
        screen.getByRole("searchbox", {
          name:
            locale === "es"
              ? "Buscar en Solicitudes comerciales"
              : "Search Commercial requests",
        }),
        { target: { value: labels[locale].services[1] } },
      );
      expect(
        container.querySelectorAll(".admin-commercial-request"),
      ).toHaveLength(1);
      expect(updatePromotion).not.toHaveBeenCalled();
    });

    it("retains existing read-only Staff legacy aliases without adding request values", () => {
      const aliases = [
        "featured_event",
        "sponsored_event",
        "sponsored_listing",
      ];
      const expected =
        locale === "es"
          ? ["Evento destacado", "Evento patrocinado", "Local patrocinado"]
          : ["Featured event", "Sponsored event", "Sponsored listing"];
      render(
        <StaffPromotionsInbox
          locale={locale}
          requests={aliases.map((service, index) => ({
            id: `legacy-${index}`,
            venueName: "Legacy venue",
            service,
            message: null,
            state: "new",
            operatorNotes: null,
            createdAt: "2026-10-14T00:00:00Z",
          }))}
        />,
      );
      expected.forEach((label) =>
        expect(screen.getByText(label)).toBeInTheDocument(),
      );
      cleanup();
      render(
        <PromotionRequestFields locale={locale} venues={[]} events={[]} />,
      );
      const select = screen.getByRole("combobox", {
        name: locale === "es" ? "Tipo de servicio" : "Service type",
      });
      expect(
        Array.from((select as HTMLSelectElement).options).map(
          (option) => option.value,
        ),
      ).toEqual(services);
    });

    it("uses the accepted service meanings in Staff and keeps unknown humanized fallback", () => {
      const requests = services.map((service, index) => ({
        id: `staff-${index}`,
        venueName: `Staff Venue ${index}`,
        service,
        message: null,
        state: states[index],
        operatorNotes: null,
        createdAt: "2026-10-14T00:00:00Z",
      }));
      requests.push({
        ...requests[0],
        id: "unknown",
        service: "new_service_type",
      });
      render(<StaffPromotionsInbox locale={locale} requests={requests} />);
      labels[locale].services.forEach((label) =>
        expect(screen.getByText(label)).toBeInTheDocument(),
      );
      expect(screen.getByText("New service type")).toBeInTheDocument();
      fireEvent.change(
        screen.getByRole("searchbox", {
          name: locale === "es" ? "Buscar solicitudes" : "Search requests",
        }),
        { target: { value: labels[locale].services[1] } },
      );
      expect(screen.getByText("Staff Venue 1")).toBeInTheDocument();
      expect(screen.queryByText("Staff Venue 0")).not.toBeInTheDocument();
    });
  },
);
