import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { buildCalendar } from "../src/lib/calendar";
import { verifyStripeSignature } from "../src/lib/stripe";

async function sign(payload: string, timestamp: number, secret: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const digest = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(`${timestamp}.${payload}`),
  );
  const signature = [...new Uint8Array(digest)]
    .map((value) => value.toString(16).padStart(2, "0"))
    .join("");
  return `t=${timestamp},v1=${signature}`;
}

describe("Stripe webhook signatures", () => {
  it("accepts a current valid signature", async () => {
    const payload = '{"id":"evt_test"}';
    const timestamp = 1_800_000_000;
    const header = await sign(payload, timestamp, "whsec_test");
    await expect(
      verifyStripeSignature(payload, header, "whsec_test", timestamp),
    ).resolves.toBe(true);
  });

  it("rejects tampering and stale signatures", async () => {
    const timestamp = 1_800_000_000;
    const header = await sign("original", timestamp, "whsec_test");
    await expect(
      verifyStripeSignature("tampered", header, "whsec_test", timestamp),
    ).resolves.toBe(false);
    await expect(
      verifyStripeSignature("original", header, "whsec_test", timestamp + 301),
    ).resolves.toBe(false);
  });
});

describe("paid entitlement contracts", () => {
  it("builds a standards-compatible calendar without allowing field injection", () => {
    const calendar = buildCalendar(
      [
        {
          uid: "event-1@akipasa.com",
          title: "Live, local; music",
          description: ["First line", "Second line"].join("\n"),
          location: "Venue, Málaga",
          startsAt: "2026-08-12T18:00:00.000Z",
          endsAt: "2026-08-12T20:00:00.000Z",
          url: "https://akipasa.com/en/events/live-local",
        },
      ],
      new Date("2026-08-10T00:00:00.000Z"),
    );

    expect(calendar).toContain("BEGIN:VCALENDAR\r\nVERSION:2.0");
    expect(calendar).toContain("DTSTART:20260812T180000Z");
    expect(calendar).toContain("SUMMARY:Live\\, local\\; music");
    expect(calendar).toContain("DESCRIPTION:First line\\nSecond line");
    expect(calendar).toMatch(/END:VCALENDAR\r\n$/);
  });

  it("keeps Stripe state webhook-owned and protects against old events", () => {
    const migration = readFileSync(
      "database/migrations/0033_premium_entitlements.sql",
      "utf8",
    );
    expect(migration).toContain("stripe_event_created_at");
    expect(migration).toContain("sync_stripe_subscription");
    expect(migration).toContain(
      "excluded.stripe_event_created_at >= billing_subscriptions.stripe_event_created_at",
    );
    expect(migration).toContain("membership_tier");
    expect(migration).toContain("business_plan_active");
    expect(migration).toContain("then 20 else 10");
  });
});
