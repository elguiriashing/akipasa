import { describe, expect, it, vi, beforeEach } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import type { ReactNode } from "react";

const mocks = vi.hoisted(() => ({ requireUser: vi.fn() }));
vi.mock("@/lib/auth", () => ({ requireUser: mocks.requireUser }));
vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("not-found");
  },
}));
vi.mock("next/link", () => ({
  default: ({ children, ...props }: { children: ReactNode }) => (
    <a {...props}>{children}</a>
  ),
}));
vi.mock("@/components/SpainAddressAutocomplete", () => ({
  SpainAddressAutocomplete: () => <input aria-label="Address fixture" />,
}));
vi.mock("../src/app/[locale]/business/mobility/actions", () => ({
  createRentalBlock: vi.fn(),
  createRentalCompany: vi.fn(),
  createRentalVehicle: vi.fn(),
  updateRentalBookingStatus: vi.fn(),
  updateRentalVehicle: vi.fn(),
}));
import MobilityWorkspace from "../src/app/[locale]/business/mobility/page";

const company = {
  id: "company-a",
  name: "Private rental company",
  address: "Private pickup",
  city: "Mijas",
  status: "pending_review",
};
function fixture(
  options: {
    company?: unknown;
    failures?: string[];
    vehicles?: unknown[];
    bookings?: unknown[];
  } = {},
) {
  const calls: Array<{ table: string; column: string; value: unknown }> = [];
  mocks.requireUser.mockResolvedValue({
    user: { id: "owner-a" },
    supabase: {
      from(table: string) {
        const values: Record<string, unknown> = {
          car_rental_companies:
            options.company === undefined ? company : options.company,
          car_rental_vehicles: options.vehicles || [],
          car_rental_bookings: options.bookings || [],
          car_rental_calendar_blocks: [],
        };
        const response = {
          data: options.failures?.includes(table) ? null : values[table],
          error: options.failures?.includes(table)
            ? { message: "unavailable" }
            : null,
        };
        const query = {
          select: () => query,
          eq: (column: string, value: unknown) => {
            calls.push({ table, column, value });
            return query;
          },
          in: (column: string, value: unknown) => {
            calls.push({ table, column, value });
            return query;
          },
          order: () => query,
          limit: () => Promise.resolve(response),
          maybeSingle: () => Promise.resolve(response),
        };
        return query;
      },
    },
  });
  return calls;
}
async function render(locale = "en") {
  return renderToStaticMarkup(
    await MobilityWorkspace({
      params: Promise.resolve({ locale }),
      searchParams: Promise.resolve({}),
    }),
  );
}
beforeEach(() => vi.clearAllMocks());

describe("private rental workspace continuity", () => {
  it.each(["en", "es"])(
    "uses canonical AkiCoches branding and owner-scoped reads in %s",
    async (locale) => {
      const calls = fixture();
      const html = await render(locale);
      expect(html).toContain(`https://akicoches.com/?lang=${locale}`);
      expect(html).toContain("AkiCoches");
      expect(html).not.toContain("AkiConduzco");
      expect(html).not.toContain("akiconduzco.akipasa.com");
      expect(calls).toContainEqual({
        table: "car_rental_companies",
        column: "submitted_by",
        value: "owner-a",
      });
      expect(calls).toContainEqual({
        table: "car_rental_vehicles",
        column: "company_id",
        value: "company-a",
      });
      expect(calls).toContainEqual({
        table: "car_rental_bookings",
        column: "vehicle.company_id",
        value: "company-a",
      });
      expect(mocks.requireUser).toHaveBeenCalledWith(
        locale,
        `/${locale}/business/mobility`,
      );
    },
  );

  it("does not offer empty anchors or falsely require venue claiming for a new company", async () => {
    fixture({ company: null });
    const html = await render();
    expect(html).not.toContain('href="#fleet"');
    expect(html).toContain("You do not need to claim an AkiPasa venue.");
    expect(html).toContain("Submit company for review");
  });

  it("keeps failed company reads separate from a new-company form", async () => {
    fixture({ failures: ["car_rental_companies"] });
    const html = await render();
    expect(html).toContain('role="alert"');
    expect(html).not.toContain("Submit company for review");
    expect(html).not.toContain(company.name);
  });

  it("reports unknown fleet, booking and calendar summaries instead of zero after failures", async () => {
    fixture({ failures: ["car_rental_vehicles", "car_rental_bookings"] });
    const html = await render();
    expect(html.match(/<strong>—<\/strong>/g)).toHaveLength(4);
    expect(html).not.toContain("No rental requests yet.");
    expect(html).not.toContain("Add your first rental vehicle to get started.");
  });

  it("keeps one availability anchor for multiple vehicles and translates actual request states", async () => {
    fixture({
      vehicles: ["car-a", "car-b"].map((id) => ({
        id,
        name: id,
        category: "economy",
        active: true,
        seats: 5,
        daily_price_cents: 2000,
        deposit_cents: 0,
      })),
      bookings: [
        {
          id: "request-a",
          vehicle_id: "car-a",
          vehicle: { name: "car-a" },
          contact_name: "Disposable renter",
          contact_email: "fixture@example.invalid",
          start_date: "2027-01-01",
          end_date: "2027-01-02",
          status: "requested",
        },
      ],
    });
    const html = await render("es");
    expect(html.match(/id="availability"/g)).toHaveLength(1);
    expect(html).toContain("Pendiente");
    expect(html).toContain('value="confirmed"');
    expect(html).toContain('value="declined"');
    expect(html).toContain("100 vehículos, 100 solicitudes y 200 bloqueos");
  });

  it("rejects unsupported locales before private reads", async () => {
    await expect(render("fr")).rejects.toThrow("not-found");
    expect(mocks.requireUser).not.toHaveBeenCalled();
  });
});
