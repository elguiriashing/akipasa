import { afterEach, expect, it, vi } from "vitest";
import {
  suiteEmailFrom,
  suiteEmailKinds,
  renderSuiteEmail,
  sendSuiteEmail,
} from "../src/lib/suite-email-templates";

const sample = {
  claimId: "00000000-0000-4000-8000-000000000001",
  bookingId: "00000000-0000-4000-8000-000000000002",
  venueName: "La Casa <script>alert(1)</script>",
  eventName: "Festival",
  venueId: "00000000-0000-4000-8000-000000000003",
  venueSlug: "test-stay",
  eventId: "00000000-0000-4000-8000-000000000004",
  slug: "festival-test",
  guestCount: 2,
  checkIn: "2026-11-04",
  checkOut: "2026-11-07",
  bookingStart: "2026-11-04T20:30:00Z",
  startsAt: "2026-11-04T20:30:00Z",
};

afterEach(() => vi.unstubAllGlobals());

it("ships every requested suite transactional and opt-in template in both locales", () => {
  expect(suiteEmailKinds).toHaveLength(11);
  for (const kind of suiteEmailKinds)
    for (const locale of ["en", "es"] as const) {
      const email = renderSuiteEmail(kind, locale, sample);
      expect(email.subject.trim().length).toBeGreaterThan(8);
      expect(email.text.length).toBeGreaterThan(70);
      expect(email.html).toContain('lang="' + locale + '"');
      expect(email.html).toContain("support@akipasa.com");
      expect(email.html).toContain("<a href=");
      expect(email.html).not.toContain("<script>");

      expect(email.html).not.toContain("undefined");
    }
});

it("claims acknowledge receipt without suggesting the request has been approved", () => {
  const en = renderSuiteEmail("claim_received", "en", sample);
  const es = renderSuiteEmail("claim_received", "es", sample);
  expect(en.html).toContain("&lt;script&gt;");
  expect(en.text).toContain("support team");
  expect(en.text).toContain("get in touch");
  expect(es.text).toContain("equipo de soporte");
  expect(es.text).toContain("pondrá en contacto");
  expect(en.text).not.toContain("claim has been approved");
});

it("welcome links are product-specific, bilingual and single-action", () => {
  expect(renderSuiteEmail("welcome_akipasa", "en", sample).text).toContain(
    "https://akipasa.com/en",
  );
  expect(renderSuiteEmail("welcome_akiduermo", "es", sample).text).toContain(
    "https://akiduermo.akipasa.com/",
  );
  expect(renderSuiteEmail("welcome_akibusiness", "es", sample).text).toContain(
    "https://business.akipasa.com/es/business",
  );
  const hq = renderSuiteEmail("welcome_akihq", "en", sample);
  expect(hq.text).toContain("https://crm.akipasa.com/");
  expect(hq.text).toContain("inventory");
  expect(hq.text).toContain("CRM");
});

it("booking acknowledgements never claim a reservation is already confirmed", () => {
  for (const kind of [
    "event_booking_requested",
    "stay_booking_requested",
  ] as const)
    for (const locale of ["es", "en"] as const) {
      const mail = renderSuiteEmail(kind, locale, sample);
      expect(mail.text).toContain(locale === "es" ? "confirm" : "confirm");
      expect(mail.text).toContain(locale === "es" ? "no" : "not");
    }
});

it("reminders state their opt-in basis and use appropriate destinations", () => {
  const event = renderSuiteEmail("event_saved_reminder", "en", sample);
  const stay = renderSuiteEmail("stay_saved_reminder", "es", sample);
  expect(event.text).toContain("enabled");
  expect(event.text).toContain("https://akipasa.com/en/events/festival-test");
  expect(stay.text).toContain("activaste");
  expect(stay.text).toContain("https://akiduermo.akipasa.com/stays/test-stay");
});

it("sends from support using per-message idempotency and real provider receipts", async () => {
  const mockFetch = vi
    .fn()
    .mockImplementation(async () => Response.json({ id: "mail-123" }));
  vi.stubGlobal("fetch", mockFetch);
  const out = await sendSuiteEmail(
    "00000000-0000-4000-8000-000000000006",
    "welcome_akipasa",
    "en",
    sample,
    "recipient@example.test",
    "disposable-key",
  );
  expect(out).toEqual({ ok: true, messageId: "mail-123" });
  const options = mockFetch.mock.calls[0][1];
  const body = JSON.parse(options.body);
  expect(body.from).toBe(suiteEmailFrom);
  expect(body.reply_to).toBe("support@akipasa.com");
  expect(body.to).toEqual(["recipient@example.test"]);
  expect(options.headers["Idempotency-Key"]).toContain(
    "00000000-0000-4000-8000-000000000006",
  );
});

it("fails safely with absent credentials, ambiguous failure or denied provider send", async () => {
  expect(
    await sendSuiteEmail(
      "id",
      "claim_received",
      "es",
      sample,
      "recipient@example.test",
    ),
  ).toMatchObject({ ok: false, ambiguous: false });
  for (const status of [400, 429, 503, 409]) {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response("", { status })),
    );
    const result = await sendSuiteEmail(
      "id",
      "claim_received",
      "es",
      sample,
      "recipient@example.test",
      "dummy",
    );
    expect(result).toMatchObject({
      ok: false,
      ambiguous: status >= 500 || status === 409,
      retryable: status >= 500 || status === 429 || status === 409,
    });
  }
});
