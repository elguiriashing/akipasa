import { afterEach, describe, expect, it, vi } from "vitest";
import {
  bookingGuestLimit,
  bookingTab,
  bookingRequestSchema,
} from "../src/lib/booking-ui";
import {
  bookingEmailFrom,
  renderBookingConfirmation,
  sendBookingConfirmationEmail,
} from "../src/lib/booking-confirmation-email";
import { dispatchBookingConfirmations } from "../src/lib/booking-mail-delivery";
import {
  stayMutationSchema,
  staySearchSchema,
} from "../src/lib/accommodation-booking";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});
const booking = {
  bookingId: "00000000-0000-4000-8000-000000000001",
  venueId: "00000000-0000-4000-8000-000000000002",
  venueName: "Example <Venue>",
  customerName: "Guest <script>alert(1)</script>",
  customerEmail: "guest@example.com",
  guestCount: 2,
  bookingStart: "2026-10-10T08:00:00Z",
  locale: "en" as const,
  address: "Test address",
  offeringName: "Breakfast",
};
describe("booking release boundaries", () => {
  it("uses real remaining capacity including sold-out and malformed values", () => {
    expect(bookingGuestLimit({ capacity: 50, remaining: 1 })).toBe(1);
    expect(bookingGuestLimit({ capacity: 50, remaining: 0 })).toBe(0);
    expect(bookingGuestLimit({ capacity: 2, remaining: 50 })).toBe(2);
    expect(bookingGuestLimit({ capacity: 500, remaining: 400 })).toBe(100);
    expect(bookingGuestLimit({ capacity: NaN })).toBe(0);
    expect(bookingGuestLimit(undefined)).toBe(0);
  });
  it("allows only known booking destinations", () => {
    expect(bookingTab("https://untrusted.example/")).toBe("inbox");
    expect(bookingTab("calendar")).toBe("calendar");
  });
  it("requires an idempotency key, UUID ownership inputs and bounded party size", () => {
    const value = {
      locale: "en",
      slug: "example",
      venueId: booking.venueId,
      slotId: booking.bookingId,
      requestKey: booking.bookingId,
      partySize: 2,
      contactName: "Guest",
      contactEmail: "guest@example.com",
    };
    expect(bookingRequestSchema.safeParse(value).success).toBe(true);
    expect(
      bookingRequestSchema.safeParse({ ...value, requestKey: "" }).success,
    ).toBe(false);
    expect(
      bookingRequestSchema.safeParse({ ...value, partySize: 101 }).success,
    ).toBe(false);
    expect(
      bookingRequestSchema.safeParse({ ...value, partySize: 0 }).success,
    ).toBe(false);
  });
  it("formats distinct recipient-localized confirmations and escapes untrusted HTML", () => {
    expect(bookingEmailFrom).toBe("AkiPasa <contact@akipasa.com>");
    const guest = renderBookingConfirmation(booking, "customer");
    const owner = renderBookingConfirmation(
      { ...booking, locale: "es" },
      "venue",
    );
    expect(guest.html).toContain("&lt;script&gt;");
    expect(guest.html).not.toContain("<script>");
    expect(guest.text).toContain("/en/account/bookings");
    expect(guest.text).toContain("10:00");
    expect(owner.text).toContain("guest@example.com");
    expect(owner.subject).toContain("Nueva reserva confirmada");
    expect(owner.html).toContain("business.akipasa.com/es/business/venue/");
  });
  it("leaves messages queued without consuming attempts when runtime secrets are absent", async () => {
    const fetcher = vi.fn();
    vi.stubGlobal("fetch", fetcher);
    vi.stubEnv("RESEND_API_KEY", "");
    expect(
      await sendBookingConfirmationEmail({
        ...booking,
        recipient: "guest@example.com",
        audience: "customer",
      }),
    ).toMatchObject({ ok: false, error: "api_key_missing" });
    expect(await dispatchBookingConfirmations({})).toEqual({
      sent: 0,
      failed: 0,
      configured: false,
    });
    expect(fetcher).not.toHaveBeenCalled();
  });
  it("uses stable per-audience provider keys and requires an actual provider message ID", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(Response.json({ id: "mail-1" }))
      .mockResolvedValueOnce(new Response("", { status: 503 }));
    vi.stubGlobal("fetch", fetcher);
    const input = {
      ...booking,
      recipient: "guest@example.com",
      audience: "customer" as const,
    };
    expect(
      await sendBookingConfirmationEmail(input, {
        apiKey: "test-only-not-a-secret",
      }),
    ).toMatchObject({ ok: true, messageId: "mail-1" });
    expect(
      await sendBookingConfirmationEmail(input, {
        apiKey: "test-only-not-a-secret",
      }),
    ).toMatchObject({ ok: false, error: "provider_503", ambiguous: true });
    expect(fetcher.mock.calls[0][1].headers["Idempotency-Key"]).toBe(
      fetcher.mock.calls[1][1].headers["Idempotency-Key"],
    );
    expect(JSON.parse(fetcher.mock.calls[0][1].body).from).toBe(
      bookingEmailFrom,
    );
  });
  it("validates stay ranges, guests and idempotent request inputs", () => {
    expect(
      staySearchSchema.safeParse({
        venue: booking.venueId,
        checkIn: "2027-03-27",
        checkOut: "2027-03-29",
        guests: "2",
      }).success,
    ).toBe(true);
    expect(
      staySearchSchema.safeParse({
        venue: booking.venueId,
        checkIn: "2027-03-29",
        checkOut: "2027-03-29",
        guests: 2,
      }).success,
    ).toBe(false);
    expect(
      stayMutationSchema.safeParse({
        action: "request",
        quote: booking.bookingId,
        key: booking.venueId,
        name: "Alex Guest",
        email: "alex@example.com",
        locale: "en",
      }).success,
    ).toBe(true);
    expect(
      stayMutationSchema.safeParse({
        action: "request",
        quote: booking.bookingId,
        key: "reused-client-string",
        name: "A",
        email: "not-an-email",
        locale: "fr",
      }).success,
    ).toBe(false);
  });
  it("renders accommodation dates, totals, policies and distinct provider keys", async () => {
    const stay = {
      ...booking,
      bookingStart: "2027-03-27",
      bookingEnd: "2027-03-29",
      offeringName: "Sea view double",
      product: "accommodation" as const,
      totalCents: 27000,
      policy: "Pay at the property.",
    };
    const rendered = renderBookingConfirmation(stay, "customer");
    expect(rendered.text).toContain("2027-03-27 - 2027-03-29");
    expect(rendered.text).toContain("270.00");
    expect(rendered.text).toContain("Pay at the property.");
    const fetcher = vi.fn().mockResolvedValue(Response.json({ id: "stay-1" }));
    vi.stubGlobal("fetch", fetcher);
    await sendBookingConfirmationEmail(
      { ...stay, recipient: "guest@example.com", audience: "customer" },
      { apiKey: "test-only-not-a-secret" },
    );
    expect(fetcher.mock.calls[0][1].headers["Idempotency-Key"]).toContain(
      "akiduermo-booking-",
    );
  });
});
