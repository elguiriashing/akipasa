// @vitest-environment jsdom
import React, { type ComponentProps } from "react";
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  from: vi.fn(),
  rpc: vi.fn(),
  wizard: vi.fn(),
  requireUser: vi.fn(),
  notFound: vi.fn((): never => {
    throw new Error("not-found");
  }),
  redirect: vi.fn((path: string): never => {
    throw new Error(`redirect:${path}`);
  }),
}));
vi.mock("next/navigation", () => ({
  notFound: mocks.notFound,
  redirect: mocks.redirect,
}));
vi.mock("next/link", () => ({
  default: ({
    prefetch: _prefetch,
    ...props
  }: ComponentProps<"a"> & { prefetch?: boolean }) => {
    void _prefetch;
    return <a {...props} />;
  },
}));
vi.mock("@/lib/auth", () => ({ requireUser: mocks.requireUser }));
vi.mock("@/components/BookingWizard", () => ({
  BookingWizard: (props: unknown) => {
    mocks.wizard(props);
    return (
      <section data-testid="booking-wizard">Fixture booking wizard</section>
    );
  },
}));
vi.mock("../src/app/[locale]/venues/[slug]/book/actions", () => ({
  requestVenueBooking: vi.fn(),
}));
import VenueBookingPage from "../src/app/[locale]/venues/[slug]/book/page";

const venueId = "91000000-0000-4000-8000-000000000001";
const settings = {
  mode: "request",
  active: true,
  external_url: null,
  instructions_es: "Llegar diez minutos antes.",
  instructions_en: "Arrive ten minutes early.",
  requires_deposit: false,
  deposit_cents: null,
};
const venue = {
  id: venueId,
  name: "Synthetic venue",
  slug: "synthetic-venue",
  venue_booking_settings: settings,
};
const slot = {
  id: "91000000-0000-4000-8000-000000000002",
  starts_at: "2099-11-01T18:00:00Z",
  ends_at: "2099-11-01T19:00:00Z",
  capacity: 50,
  remaining: 2,
  offering_id: null,
  offering_name: null,
  resource_name: "Synthetic room",
};
let venueRead: { data: unknown; error: null | { message: string } };
let profileRead: { data: unknown; error: null | { message: string } };
beforeEach(() => {
  vi.clearAllMocks();
  venueRead = { data: venue, error: null };
  profileRead = {
    data: {
      display_name: "Synthetic Guest",
      public_email: "guest@example.test",
      phone: "600000000",
    },
    error: null,
  };
  mocks.rpc.mockResolvedValue({ data: [slot], error: null });
  mocks.from.mockImplementation((table: string) => {
    const builder = {
      select: () => builder,
      eq: () => builder,
      maybeSingle: async () => (table === "venues" ? venueRead : profileRead),
    };
    return builder;
  });
  mocks.requireUser.mockResolvedValue({
    user: { id: "own-synthetic-profile", email: "account@example.test" },
    supabase: { from: mocks.from, rpc: mocks.rpc },
  });
});
afterEach(cleanup);
const page = (locale: "en" | "es", query: Record<string, string> = {}) =>
  VenueBookingPage({
    params: Promise.resolve({ locale, slug: "synthetic-venue" }),
    searchParams: Promise.resolve(query),
  });

for (const locale of ["en", "es"] as const) {
  describe(`${locale} venue booking read recovery`, () => {
    const renderUnavailable = async () => {
      render(await page(locale));
      expect(screen.getByRole("alert")).toHaveTextContent(
        locale === "es" ? "No se ha podido cargar" : "could not be loaded",
      );
      expect(
        screen.getByRole("link", {
          name: locale === "es" ? "Reintentar" : "Retry",
        }),
      ).toHaveAttribute("href", `/${locale}/venues/synthetic-venue/book`);
      expect(mocks.wizard).not.toHaveBeenCalled();
      expect(document.body.textContent).not.toContain("Private diagnostic");
    };
    it.each([null, { unexpected: "payload" }, "invalid payload"])(
      "treats malformed aggregate %j as unavailable, not empty capacity",
      async (data) => {
        mocks.rpc.mockResolvedValue({ data, error: null });
        await renderUnavailable();
        expect(mocks.rpc).toHaveBeenCalledWith("booking_available_slots", {
          p_venue: venueId,
        });
      },
    );
    it("withholds stale slots on a failed availability read and offers a safe retry", async () => {
      mocks.rpc.mockResolvedValue({
        data: [slot],
        error: { message: "Private diagnostic" },
      });
      await renderUnavailable();
    });
    it.each([null, venue])(
      "keeps venue read errors distinct from genuinely absent venues (%j)",
      async (data) => {
        venueRead = { data, error: { message: "Private diagnostic" } };
        await renderUnavailable();
        expect(mocks.notFound).not.toHaveBeenCalled();
        expect(mocks.rpc).not.toHaveBeenCalled();
        expect(mocks.from).not.toHaveBeenCalledWith("profiles");
      },
    );
    it("preserves not-found for a successful missing venue read", async () => {
      venueRead = { data: null, error: null };
      await expect(page(locale)).rejects.toThrow("not-found");
      expect(mocks.rpc).not.toHaveBeenCalled();
    });
    it("preserves canonical remaining inventory, caller defaults and authentication return", async () => {
      render(await page(locale));
      expect(screen.getByTestId("booking-wizard")).toBeVisible();
      expect(mocks.wizard).toHaveBeenCalledWith(
        expect.objectContaining({
          venueId,
          locale,
          slots: [slot],
          profile: {
            name: "Synthetic Guest",
            email: "guest@example.test",
            phone: "600000000",
          },
        }),
      );
      expect(mocks.requireUser).toHaveBeenCalledWith(
        locale,
        `/${locale}/venues/synthetic-venue/book`,
      );
      expect(mocks.rpc).toHaveBeenCalledWith("booking_available_slots", {
        p_venue: venueId,
      });
      expect(mocks.from).not.toHaveBeenCalledWith("booking_slots");
    });
    it("keeps a successful empty aggregate as empty inventory", async () => {
      mocks.rpc.mockResolvedValue({ data: [], error: null });
      render(await page(locale));
      expect(mocks.wizard).toHaveBeenCalledWith(
        expect.objectContaining({ slots: [] }),
      );
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    });
    it("keeps external venue redirects and their original destination", async () => {
      venueRead = {
        data: {
          ...venue,
          venue_booking_settings: {
            ...settings,
            mode: "external",
            external_url: "https://booking.example.test/venue",
          },
        },
        error: null,
      };
      await expect(page(locale)).rejects.toThrow(
        "redirect:https://booking.example.test/venue",
      );
      expect(mocks.rpc).not.toHaveBeenCalled();
    });
    it("does not expose requests for inactive settings", async () => {
      venueRead = {
        data: {
          ...venue,
          venue_booking_settings: { ...settings, active: false },
        },
        error: null,
      };
      await expect(page(locale)).rejects.toThrow("not-found");
      expect(mocks.rpc).not.toHaveBeenCalled();
    });
    it("still permits manual contact entry after a failed convenience profile read", async () => {
      profileRead = { data: null, error: { message: "Private diagnostic" } };
      render(await page(locale));
      expect(mocks.wizard).toHaveBeenCalledWith(
        expect.objectContaining({
          profile: { name: "", email: "account@example.test", phone: "" },
        }),
      );
    });
  });
}
