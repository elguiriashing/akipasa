import { describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ access: vi.fn() }));
vi.mock("@/lib/entitlements", () => ({ requireBusinessAccess: mocks.access }));
vi.mock("next/navigation", () => ({
  notFound() {
    throw Error("not-found");
  },
}));
vi.mock("../src/app/[locale]/business/venue/[id]/actions");
vi.mock("server-only", () => ({}));
import VenueWorkspace from "../src/app/[locale]/business/venue/[id]/page";
import { BookingManager } from "../src/components/BookingManager";
const venueId = "f728f63d-8d57-443c-8f9b-777e2e271001";
function backend(failed?: string, missingSettings = false) {
  const reads: Array<{ table: string; field: string; value: unknown }> = [];
  return {
    reads,
    rpc: vi.fn(async (name: string) => ({
      data: name === "is_venue_member",
      error: null,
    })),
    from(table: string) {
      let head = false;
      const result = () => {
        const error =
          failed === table ||
          (failed === "pending" && table === "booking_requests" && head)
            ? { message: "private fixture error" }
            : null;
        return {
          data: error
            ? null
            : table === "venues"
              ? {
                  id: venueId,
                  name: "Own venue",
                  slug: "own-venue",
                  status: "published",
                  discovery_vertical: "activities",
                  description_es: "Local",
                  description_en: "Venue",
                  accessibility: {},
                }
              : table === "venue_booking_settings"
                ? missingSettings
                  ? null
                  : {
                      mode: "request",
                      external_url: null,
                      booking_template: "experience",
                    }
                : table === "booking_notification_settings"
                  ? missingSettings
                    ? null
                    : { notification_email: "fixture@example.invalid" }
                  : [],
          error,
          count: error ? null : 0,
        };
      };
      const query = {
        select: (_fields: string, options?: { head?: boolean }) => {
          head = options?.head === true;
          return query;
        },
        eq: (field: string, value: unknown) => {
          reads.push({ table, field, value });
          return query;
        },
        in: () => query,
        order: () => query,
        range: () => query,
        limit: () => query,
        or: () => query,
        maybeSingle: async () => result(),
        then: (resolve: (value: unknown) => unknown) =>
          Promise.resolve(result()).then(resolve),
      };
      return query;
    },
  };
}
const failures = [
  ["venue_booking_settings", "settings"],
  ["booking_notification_settings", "notificationSettings"],
  ["venue_availability_slots", "slots"],
  ["booking_resources", "resources"],
  ["booking_offerings", "offerings"],
  ["pending", "pending"],
] as const;
describe("private venue booking read boundary", () => {
  for (const locale of ["en", "es"] as const) {
    it.each(failures)(
      `${locale}: propagates %s as an independent unknown read`,
      async (failed, flag) => {
        const supabase = backend(failed);
        mocks.access.mockResolvedValue({ supabase, user: { id: "owner" } });
        const page = await VenueWorkspace({
          params: Promise.resolve({ locale, id: venueId }),
          searchParams: Promise.resolve({
            section: "bookings",
            bookingTab: "setup",
          }),
        });
        const manager = page.props.sections.bookings;
        expect(manager.type).toBe(BookingManager);
        expect(manager.props.readErrors[flag]).toBe(true);
        for (const [, otherFlag] of failures)
          if (otherFlag !== flag)
            expect(manager.props.readErrors[otherFlag]).toBe(false);
        expect(manager.props.save).toBeTypeOf("function");
        expect(page.props.sections.profile).toBeTruthy();
        expect(page.props.sections.team).toBeTruthy();
        expect(page.props.counts.requests).toBe(flag === "pending" ? null : 0);
        expect(manager.props.inbox.pending).toBe(flag === "pending" ? null : 0);
        for (const table of [
          "venue_booking_settings",
          "booking_notification_settings",
          "venue_availability_slots",
          "booking_resources",
          "booking_offerings",
          "booking_requests",
        ])
          expect(supabase.reads).toContainEqual({
            table,
            field: "venue_id",
            value: venueId,
          });
        expect(mocks.access).toHaveBeenCalledWith(
          locale,
          `/${locale}/business/venue/${venueId}`,
        );
      },
    );
    it(`${locale}: successful missing settings remain editable legacy defaults`, async () => {
      mocks.access.mockResolvedValue({
        supabase: backend(undefined, true),
        user: { id: "owner" },
      });
      const page = await VenueWorkspace({
        params: Promise.resolve({ locale, id: venueId }),
        searchParams: Promise.resolve({}),
      });
      const manager = page.props.sections.bookings;
      expect(Object.values(manager.props.readErrors)).toEqual([
        false,
        false,
        false,
        false,
        false,
        false,
      ]);
      expect(manager.props.settings.mode).toBeUndefined();
      expect(manager.props.inbox.pending).toBe(0);
      expect(page.props.counts.requests).toBe(0);
    });
  }
});
